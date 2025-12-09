// backend/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import admin from "./firebaseAdmin.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicationRoutes from "./routes/publicationRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import leadPublicationRoutes from "./routes/leadPublicationRoutes.js";
const app = express();
const PORT = process.env.PORT || 5000;

// ---------- CORS CONFIG ----------
const corsOptions = {
  origin: [
    "http://localhost:5173",
    // add production URLs later, e.g.:
    // "https://nedaas-lab.web.app",
    // "https://nedaas-lab.firebaseapp.com",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ---------- MONGODB CONNECTION ----------
async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env file");
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("Please check your MONGODB_URI in .env file");
    throw error;
  }
}

// ---------- HEALTH / STATUS ROUTES ----------
app.get("/", (req, res) => {
  res.send("NEDAAS Lab backend is alive 🚀");
});

app.get("/status", (req, res) => {
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
app.use("/api/lead", leadRoutes); // 👈 mount all /api/lead/* routes here

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error("❌ Express error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Unexpected server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});
// ---------- API ROUTES ----------
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/publications", publicationRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/lead/publications", leadPublicationRoutes); // 👈 ADD THIS

// ---------- START SERVER ----------
async function startServer() {
  try {
    await connectMongoDB();

    if (!admin.apps.length) {
      console.warn(
        "⚠️ Firebase Admin is NOT initialized. Check firebaseAdmin.js and .env"
      );
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
