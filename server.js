// backend/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import admin from "./firebaseAdmin.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicationRoutes from "./routes/publicationRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import leadPublicationRoutes from "./routes/leadPublicationRoutes.js";
import directorRoutes from "./routes/directorRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === "production";

// ---------- SECURITY HEADERS (helmet) ----------
app.use(helmet());

// ---------- CORS CONFIG ----------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "https://nedaas-bf431.web.app",
  "https://nedaas-bf431.firebaseapp.com",
  "https://nedaas.netlify.app",
  "http://nedaas.org",
  "https://nedaas.org",
  "https://nedaas-react-3sry.vercel.app",
  "https://www.nedaas.org",
];

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS];
    // Allow requests with no origin (mobile apps, curl in dev)
    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // pre-flight

// ---------- BODY PARSING (size limit prevents large-payload attacks) ----------
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// ---------- MONGO SANITIZE (prevent NoSQL injection) ----------
app.use(mongoSanitize());

// ---------- GLOBAL RATE LIMITERS ----------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later." },
});

app.use(generalLimiter);
app.use("/api/auth", authLimiter);

// ---------- MONGODB CONNECTION ----------
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment");

  await mongoose.connect(uri, {
    // Keeps connections lean & avoids hung queries
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ Connected to MongoDB");
}

// ---------- HEALTH / STATUS ROUTES ----------
app.get("/", (_req, res) => {
  res.send("NEDAAS Lab backend is alive 🚀");
});

// Minimal status – never expose internal state in production
app.get("/status", (_req, res) => {
  if (IS_PROD) {
    return res.json({ status: "ok" });
  }
  res.json({
    message: "NEDAAS backend status",
    firebaseAdmin: admin.apps.length > 0 ? "Initialized" : "Not initialized",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Not connected",
    mongodbState: mongoose.connection.readyState,
  });
});

// ---------- API ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/publications", publicationRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/lead/publications", leadPublicationRoutes);
app.use("/api/director", directorRoutes);

// ---------- 404 CATCH-ALL ----------
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ---------- GLOBAL ERROR HANDLER ----------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Log full details server-side
  console.error("❌ Express error:", err);

  // Distinguish CORS errors to give a useful (but safe) message
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ message: "CORS policy violation" });
  }

  // Never expose stack traces or internal details to clients in production
  res.status(err.status || 500).json({
    message: IS_PROD ? "Unexpected server error" : err.message,
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
});

// ---------- START SERVER ----------
async function startServer() {
  try {
    await connectMongoDB();

    if (!admin.apps.length) {
      console.warn("⚠️  Firebase Admin NOT initialized. Check firebaseAdmin.js");
    } else {
      console.log("✅ Firebase Admin initialized");
    }

    app.listen(PORT, () => {
      console.log(`🚀 NEDAAS backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start NEDAAS backend:", error.message);
    process.exit(1);
  }
}

startServer();
