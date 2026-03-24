import express from "express";
import mongoose from "mongoose";
import admin from "../firebaseAdmin.js";
import User from "../models/User.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = express.Router();

const ROOT_ADMIN_EMAIL = (
  process.env.ROOT_ADMIN_EMAIL || "mahdiasif78@gmail.com"
)
  .trim()
  .toLowerCase();

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ message: "Valid ID token is required" });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ message: "Auth service unavailable" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken, true);
    const { uid, email, name } = decoded;

    if (!uid || !email) {
      return res.status(400).json({ message: "Token missing required fields" });
    }

    if (!isMongoConnected()) {
      return res.status(500).json({ message: "Database unavailable" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });

    // Reject unknown users
    if (!user) {
      return res.status(403).json({
        message:
          "Your email is not authorized yet. Please contact admin to add you first.",
      });
    }

    let changed = false;

    if (!user.uid && uid) {
      user.uid = uid;
      changed = true;
    }

    if (name && user.displayName !== name) {
      user.displayName = name;
      changed = true;
    }

    // Always force configured root admin email to admin
    if (normalizedEmail === ROOT_ADMIN_EMAIL && user.role !== "admin") {
      user.role = "admin";
      changed = true;
    }

    if (changed) {
      await user.save();
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Auth login error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

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
    console.error("/api/auth/me error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;