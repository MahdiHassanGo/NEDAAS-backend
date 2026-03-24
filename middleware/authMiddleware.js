// backend/middleware/authMiddleware.js
import admin from "../firebaseAdmin.js";
import User from "../models/User.js";

const ROOT_ADMIN_EMAIL = (
  process.env.ROOT_ADMIN_EMAIL || "mahdiasif78@gmail.com"
)
  .trim()
  .toLowerCase();

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decoded;

    const normalizedEmail = email?.trim().toLowerCase() || "";
    const autoRole = normalizedEmail === ROOT_ADMIN_EMAIL ? "admin" : "member";

    let user = null;

    if (uid) {
      user = await User.findOne({ uid });
    }

    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });

      if (user && uid && !user.uid) {
        user.uid = uid;
      }
    }

    if (!user) {
      user = await User.create({
        uid,
        email: normalizedEmail,
        displayName: name || normalizedEmail || "Unnamed User",
        role: autoRole,
      });
    } else {
      // keep root admin always admin
      if (normalizedEmail === ROOT_ADMIN_EMAIL && user.role !== "admin") {
        user.role = "admin";
      }

      if (!user.email && normalizedEmail) user.email = normalizedEmail;
      if (!user.displayName && name) user.displayName = name;

      await user.save();
    }

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

function requireLead(req, res, next) {
  if (!req.user || !["lead", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Lead access required" });
  }
  next();
}

function requireDirector(req, res, next) {
  if (!req.user || !["director", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Director access required" });
  }
  next();
}

function requireAdminOrDirector(req, res, next) {
  if (!req.user || !["admin", "director"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin or director access required" });
  }
  next();
}

export {
  verifyFirebaseToken,
  requireAdmin,
  requireLead,
  requireDirector,
  requireAdminOrDirector,
};