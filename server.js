import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
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

app.disable("x-powered-by");
app.set("trust proxy", 1);

// ---------- SECURITY ----------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(compression());

// ---------- CORS ----------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "https://nedaas-bf431.web.app",
  "https://nedaas-bf431.firebaseapp.com",
];

const allowedOriginSet = new Set([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS]);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOriginSet.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ---------- BODY ----------
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: true, limit: "30kb" }));

// ---------- SANITIZE ----------
app.use(mongoSanitize());

// ---------- RATE LIMITS ----------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later." },
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ---------- MONGODB ----------
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in environment");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log("✅ Connected to MongoDB");
}

// ---------- HEALTH ----------
app.get("/", (_req, res) => {
  res.send("NEDAAS Lab backend is alive 🚀");
});

app.get("/status", (_req, res) => {
  if (IS_PROD) {
    return res.json({ status: "ok" });
  }

  return res.json({
    status: "ok",
    firebaseAdmin: admin.apps.length > 0 ? "Initialized" : "Not initialized",
    mongodb:
      mongoose.connection.readyState === 1 ? "Connected" : "Not connected",
    mongodbState: mongoose.connection.readyState,
  });
});

// ---------- ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/publications", publicationRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/lead/publications", leadPublicationRoutes);
app.use("/api/director", directorRoutes);

// ---------- 404 ----------
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ---------- ERROR HANDLER ----------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("❌ Express error:", err);

  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ message: "CORS policy violation" });
  }

  res.status(err.status || 500).json({
    message: IS_PROD ? "Unexpected server error" : err.message,
    ...(IS_PROD ? {} : { stack: err.stack }),
  });
});

// ---------- START ----------
async function startServer() {
  try {
    await connectMongoDB();

    if (!admin.apps.length) {
      console.warn("⚠️ Firebase Admin NOT initialized. Check firebaseAdmin.js");
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