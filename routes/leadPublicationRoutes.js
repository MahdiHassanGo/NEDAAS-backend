// backend/routes/leadPublicationRoutes.js
import express from "express";
import Publication from "../models/Publication.js";
import {
  verifyFirebaseToken,
  requireLead,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyFirebaseToken);

// POST /api/lead/publications
router.post("/", requireLead, async (req, res) => {
  try {
    const { meta, title, authors, description, tag, link, linkLabel } = req.body;

    if (!meta || !title || !authors || !description || !tag || !link) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Basic type-check to avoid sending objects where strings expected
    const stringFields = { meta, title, authors, description, tag, link };
    for (const [key, val] of Object.entries(stringFields)) {
      if (typeof val !== "string") {
        return res.status(400).json({ message: `${key} must be a string` });
      }
    }

    const pub = await Publication.create({
      meta,
      title,
      authors,
      description,
      tag,
      link,
      linkLabel: typeof linkLabel === "string" ? linkLabel : "View article",
      status: "pending", // always pending for lead submissions
      createdBy: req.user._id,
    });

    res.status(201).json(pub);
  } catch (err) {
    console.error("Error creating lead publication:", err.message);
    res.status(500).json({ message: "Failed to submit publication" });
  }
});

export default router;
