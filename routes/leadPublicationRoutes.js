// backend/routes/leadPublicationRoutes.js
import express from "express";
import Publication from "../models/Publication.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyFirebaseToken);

// Reuse the same logic as your lead routes
function requireLead(req, res, next) {
  if (!req.user || req.user.role !== "lead") {
    return res.status(403).json({ message: "Lead role required" });
  }
  next();
}

// POST /api/lead/publications
// Lead submits a publication -> always saved as "pending"
router.post("/", requireLead, async (req, res) => {
  try {
    const {
      meta,
      title,
      authors,
      description,
      tag,
      link,
      linkLabel,
    } = req.body;

    if (!meta || !title || !authors || !description || !tag || !link) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    const pub = await Publication.create({
      meta,
      title,
      authors,
      description,
      tag,
      link,
      linkLabel: linkLabel || "View article",
      status: "pending",          // 🔴 force pending for lead submissions
      createdBy: req.user._id,    // so admin knows who submitted
    });

    res.status(201).json(pub);
  } catch (err) {
    console.error("Error creating lead publication:", err);
    res
      .status(500)
      .json({ message: "Failed to submit publication from lead." });
  }
});

export default router;
