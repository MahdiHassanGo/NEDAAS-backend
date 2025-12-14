// backend/middleware/authMiddleware.js
import admin from "../firebaseAdmin.js";
import User from "../models/User.js";

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1) Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decoded;

    let user = null;

    // 2) Try to find by uid first
    if (uid) {
      user = await User.findOne({ uid });
    }

    // 3) If not found, try to find by email (manual users, etc.)
    if (!user && email) {
      user = await User.findOne({ email });

      // If found by email but no uid yet, link them now
      if (user && uid && !user.uid) {
        user.uid = uid;
        await user.save();
        console.log(`🔗 Linked Firebase UID for user ${email}`);
      }
    }

    // 4) Auto-create default "member" user if nothing found
    if (!user) {
      console.log(
        `⚠️ No user found for uid=${uid} email=${email}, creating default user`
      );
      user = await User.create({
        uid,
        email,
        displayName: name || email || "Unnamed User",
        role: "member",
      });
    }

    // 5) Attach full Mongoose doc to req.user
    req.user = user;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function requireDirector(req, res, next) {
  if (!req.user || req.user.role !== "director") {
    return res.status(403).json({ message: "Director access required" });
  }
  next();
}

function requireAdminOrDirector(req, res, next) {
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "director")
  ) {
    return res
      .status(403)
      .json({ message: "Admin or director access required" });
  }
  next();
}

// 👉 Explicit named exports so Node can see them for sure
export {
  verifyFirebaseToken,
  requireAdmin,
  requireDirector,
  requireAdminOrDirector,
};
