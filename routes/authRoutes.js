// backend/routes/authRoutes.js
import express from "express";
import mongoose from "mongoose";
import admin from "../firebaseAdmin.js";
import User from "../models/User.js";

const router = express.Router();

// ---------- HELPERS ----------
const ADMIN_EMAILS = ["mahdiasif78@gmail.com"]; // you can add more admin emails here

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}

// ---------- MIDDLEWARE: verify Firebase token and attach user ----------
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    if (!admin.apps.length) {
      console.error("❌ Firebase Admin not initialized");
      return res.status(500).json({
        message:
          "Firebase Admin not initialized. Please check your .env and firebaseAdmin.js configuration.",
      });
    }

    // Verify token
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decoded;

    if (!email) {
      return res.status(400).json({
        message: "Email is required in Firebase token payload",
      });
    }

    if (!isMongoConnected()) {
      console.error(
        "❌ MongoDB not connected. ReadyState:",
        mongoose.connection.readyState
      );
      return res.status(500).json({
        message: "Database connection error",
        error:
          "MongoDB is not connected. Please check your MONGODB_URI in .env file",
      });
    }

    // Find or create user (same logic as login, but shorter)
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        uid,
        email,
        displayName: name || null,
        role: isAdminEmail(email) ? "admin" : "member",
      });
      await user.save();
    } else {
      let changed = false;

      if (!user.uid && uid) {
        user.uid = uid;
        changed = true;
      }
      if (isAdminEmail(email) && user.role !== "admin") {
        user.role = "admin";
        changed = true;
      }
      if (!user.displayName && name) {
        user.displayName = name;
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    // Attach user to req
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ verifyFirebaseToken error:", err.message);
    return res.status(401).json({
      message: "Invalid or expired Firebase token",
      error: err.message,
    });
  }
}

// ---------- ROUTES ----------

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

    // Check Firebase Admin initialization
    if (!admin.apps.length) {
      console.error("❌ Firebase Admin not initialized");
      return res.status(500).json({
        message:
          "Firebase Admin not initialized. Please check your .env and firebaseAdmin.js configuration.",
        error: "Firebase Admin SDK not configured",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseError) {
      console.error("❌ Firebase token verification error:", firebaseError.message);
      return res.status(401).json({
        message: "Invalid or expired Firebase ID token",
        error: firebaseError.message,
      });
    }

    const { uid, email, name } = decodedToken;

    if (!email) {
      return res.status(400).json({
        message: "Email is required in Firebase token payload",
      });
    }

    const isAdmin = isAdminEmail(email);

    // Check MongoDB connection
    if (!isMongoConnected()) {
      console.error(
        "❌ MongoDB not connected. ReadyState:",
        mongoose.connection.readyState
      );
      return res.status(500).json({
        message: "Database connection error",
        error:
          "MongoDB is not connected. Please check your MONGODB_URI in .env file",
      });
    }

    // Find or create user in MongoDB (by EMAIL, not UID)
    let user;
    try {
      user = await User.findOne({ email });

      if (!user) {
        // No existing user → create new
        user = new User({
          uid,
          email,
          displayName: name || null,
          role: isAdmin ? "admin" : "member",
        });

        await user.save();
        console.log(`✅ New user created: ${email} with role: ${user.role}`);
      } else {
        // Existing user → sync uid, role (if admin), and displayName
        let changed = false;

        if (!user.uid && uid) {
          user.uid = uid;
          changed = true;
          console.log(`🔗 Linked Firebase UID for ${email}`);
        }

        if (isAdmin && user.role !== "admin") {
          user.role = "admin";
          changed = true;
          console.log(`🔑 User ${email} role updated to admin`);
        }

        if (!user.displayName && name) {
          user.displayName = name;
          changed = true;
        }

        if (changed) {
          await user.save();
        }
      }
    } catch (dbError) {
      console.error("❌ Database error during login:", dbError);
      return res.status(500).json({
        message: "Database error while processing login",
        error: dbError.message,
      });
    }

    return res.status(200).json({
      message: "Login successful",
      role: user.role,
      user: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ /api/auth/login error:", error);
    return res.status(500).json({
      message: "Internal server error during login",
      error: error.message,
    });
  }
});

// GET /api/auth/me  ✅ NEW
router.get("/me", verifyFirebaseToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("email displayName role mobile studentId studentEmail lead")
      .populate("lead", "displayName email mobile");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ /api/auth/me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
