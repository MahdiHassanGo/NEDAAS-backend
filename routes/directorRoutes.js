import express from "express";
import {
  verifyFirebaseToken,
  requireDirector,
} from "../middleware/authMiddleware.js";
import DirectorCalendarEvent from "../models/DirectorCalendarEvent.js";
import Conference from "../models/Conference.js";

const router = express.Router();

router.use(verifyFirebaseToken);

/**
 * READ-ONLY conference overview for Director
 * GET /api/director/conferences
 */
router.get("/conferences", requireDirector, async (req, res) => {
  const confs = await Conference.find()
    .populate("lead", "displayName email")
    .populate("authors", "displayName email")
    .populate("extraAuthors", "name email affiliation")
    .sort({ date: 1, createdAt: -1 });

  res.json(confs);
});

/**
 * GET /api/director/conferences
 */
router.get("/conferences", requireDirector, async (req, res) => {
  const confs = await Conference.find()
    .populate("lead", "displayName email")
    .populate("authors", "displayName email")
    .populate("extraAuthors", "name email affiliation")
    .sort({ date: 1, createdAt: -1 });

  res.json(confs);
});

/**
 * GET /api/director/calendar
 */
router.get("/calendar", requireDirector, async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }
  const events = await DirectorCalendarEvent.find(filter).sort({ date: 1 });
  res.json(events);
}); 
// POST /api/director/calendar
router.post("/calendar", requireDirector, async (req, res) => {
  const { title, date, status, note } = req.body;

  if (!title || !date) {
    return res
      .status(400)
      .json({ message: "Title and date are required for calendar event." });
  }

  const event = await DirectorCalendarEvent.create({
    title,
    date,
    status: status || "submitted",
    note: note || "",
    createdBy: req.user._id,
  });

  res.status(201).json(event);
});

// PUT /api/director/calendar/:id
router.put("/calendar/:id", requireDirector, async (req, res) => {
  const { id } = req.params;
  const { title, date, status, note } = req.body;

  const event = await DirectorCalendarEvent.findByIdAndUpdate(
    id,
    {
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date }),
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note }),
    },
    { new: true }
  );

  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }

  res.json(event);
});

// DELETE /api/director/calendar/:id
router.delete("/calendar/:id", requireDirector, async (req, res) => {
  const { id } = req.params;
  const event = await DirectorCalendarEvent.findByIdAndDelete(id);
  if (!event) {
    return res.status(404).json({ message: "Event not found" });
  }
  res.json({ message: "Event deleted" });
});

export default router;
 