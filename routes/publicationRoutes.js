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

export default router;
