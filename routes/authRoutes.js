// backend/routes/authRoutes.js
import express from "express";
import mongoose from "mongoose";
import admin from "../firebaseAdmin.js";
import User from "../models/User.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ---------- CONSTANTS ----------
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "mahdiasif78@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// ---------- HELPERS ----------
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.has(email?.toLowerCase());
}

// ---------- ROUTES ----------

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string" || idToken.length < 20) {
      return res.status(400).json({ message: "Valid ID token is required" });
    }

    if (!admin.apps.length) {
      console.error("❌ Firebase Admin not initialized");
      return res.status(500).json({ message: "Auth service unavailable" });
    }

    // Verify Firebase ID token (also checks revocation)
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken, true);
    } catch (firebaseError) {
      // Don't leak firebase error details to clients
      console.error("❌ Firebase token error:", firebaseError.code);
      return res.status(401).json({
        message:
          firebaseError.code === "auth/id-token-expired"
            ? "Token expired – please sign in again"
            : "Invalid or expired token",
      });
    }

    const { uid, email, name } = decodedToken;

    if (!uid || !email) {
      return res.status(400).json({ message: "Token missing required fields" });
    }

    if (!isMongoConnected()) {
      console.error("❌ MongoDB not connected");
      return res.status(500).json({ message: "Database unavailable" });
    }

    const adminFlag = isAdminEmail(email);

    let user;
    try {
      user = await User.findOne({ email });

      if (!user) {
        user = new User({
          uid,
          email,
          displayName: name || null,
          role: adminFlag ? "admin" : "member",
        });
        await user.save();
      } else {
        let changed = false;
        if (!user.uid && uid) { user.uid = uid; changed = true; }
        if (adminFlag && user.role !== "admin") { user.role = "admin"; changed = true; }
        if (!user.displayName && name) { user.displayName = name; changed = true; }
        if (changed) await user.save();
      }
    } catch (dbError) {
      console.error("❌ DB error during login:", dbError.message);
      return res.status(500).json({ message: "Database error" });
    }

    // Only return what the client actually needs
    return res.status(200).json({
      message: "Login successful",
      user: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ /api/auth/login error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("email displayName role mobile studentId studentEmail lead")
      .populate("lead", "displayName email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ /api/auth/me error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
