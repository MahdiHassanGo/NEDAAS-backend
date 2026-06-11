// backend/routes/publicationRoutes.js
import express from "express";
import Publication from "../models/Publication.js";

const router = express.Router();

// GET /api/publications
// Public route – only returns approved publications; never exposes pending/rejected
router.get("/", async (req, res) => {
  try {
    const pubs = await Publication.find({ status: "approved" })
      .select("-createdBy") // don't expose internal author references to public
      .sort({ createdAt: -1 });
    res.json(pubs);
  } catch (err) {
    console.error("Get publications error:", err.message);
    res.status(500).json({ message: "Failed to fetch publications" });
  }
});

// GET /api/publications/:id
// Public route – get detailed view of an approved publication by ID
router.get("/:id", async (req, res) => {
  try {
    const pub = await Publication.findOne({ _id: req.params.id, status: "approved" })
      .select("-createdBy"); // don't expose internal author references to public
    if (!pub) {
      return res.status(404).json({ message: "Publication not found or not approved" });
    }
    res.json(pub);
  } catch (err) {
    console.error("Get publication details error:", err.message);
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid publication ID format" });
    }
    res.status(500).json({ message: "Failed to fetch publication details" });
  }
});

export default router;
