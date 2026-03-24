// backend/routes/directorRoutes.js
import express from "express";
import mongoose from "mongoose";
import {
  verifyFirebaseToken,
  requireDirector,
} from "../middleware/authMiddleware.js";
import DirectorCalendarEvent from "../models/DirectorCalendarEvent.js";
import Conference from "../models/Conference.js";

const router = express.Router();

router.use(verifyFirebaseToken);

// ---------- HELPER ----------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const VALID_CALENDAR_STATUSES = [
  "submitted",
  "camera-ready",
  "registered",
  "presented",
];

/**
 * GET /api/director/conferences
 * Read-only conference overview for Director (and Admin)
 */
router.get("/conferences", requireDirector, async (req, res) => {
  try {
    const confs = await Conference.find()
      .populate("lead", "displayName email")
      .populate("authors", "displayName email")
      .populate("extraAuthors", "name email affiliation")
      .sort({ date: 1, createdAt: -1 });
    res.json(confs);
  } catch (err) {
    console.error("Director get conferences error:", err.message);
    res.status(500).json({ message: "Failed to load conferences" });
  }
});

/**
 * GET /api/director/calendar
 */
router.get("/calendar", requireDirector, async (req, res) => {
  const { status } = req.query;

  // Whitelist the status query param
  const filter = {};
  if (status && status !== "all") {
    if (!VALID_CALENDAR_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status filter" });
    }
    filter.status = status;
  }

  try {
    const events = await DirectorCalendarEvent.find(filter).sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("Director get calendar error:", err.message);
    res.status(500).json({ message: "Failed to load calendar events" });
  }
});

/**
 * POST /api/director/calendar
 */
router.post("/calendar", requireDirector, async (req, res) => {
  const { title, date, status, note } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }
  if (status && !VALID_CALENDAR_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const event = await DirectorCalendarEvent.create({
      title: title.trim().slice(0, 200),
      date,
      status: status || "submitted",
      note: note ? String(note).slice(0, 1000) : "",
      createdBy: req.user._id,
    });
    res.status(201).json(event);
  } catch (err) {
    console.error("Director create calendar event error:", err.message);
    res.status(500).json({ message: "Failed to create calendar event" });
  }
});

/**
 * PUT /api/director/calendar/:id
 */
router.put("/calendar/:id", requireDirector, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  const { title, date, status, note } = req.body;

  if (status && !VALID_CALENDAR_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const event = await DirectorCalendarEvent.findByIdAndUpdate(
      id,
      {
        ...(title !== undefined && { title: String(title).trim().slice(0, 200) }),
        ...(date !== undefined && { date }),
        ...(status !== undefined && { status }),
        ...(note !== undefined && { note: String(note).slice(0, 1000) }),
      },
      { new: true, runValidators: true }
    );

    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    console.error("Director update calendar event error:", err.message);
    res.status(500).json({ message: "Failed to update event" });
  }
});

/**
 * DELETE /api/director/calendar/:id
 */
router.delete("/calendar/:id", requireDirector, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const event = await DirectorCalendarEvent.findByIdAndDelete(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("Director delete calendar event error:", err.message);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

export default router;
