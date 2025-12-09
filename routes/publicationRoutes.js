// backend/routes/publicationRoutes.js
import express from "express";
import Publication from "../models/Publication.js";

const router = express.Router();

// GET /api/publications
router.get("/", async (req, res) => {
  const pubs = await Publication.find({ status: "approved" }).sort({
    createdAt: -1,
  });
  res.json(pubs);
});

export default router;
