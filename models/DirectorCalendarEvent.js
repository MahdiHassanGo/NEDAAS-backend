// backend/models/DirectorCalendarEvent.js
import mongoose from "mongoose";

const directorCalendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["submitted", "camera-ready", "registered", "presented"],
      default: "submitted",
      index: true,
    },
    // optional notes or description if you want later
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "DirectorCalendarEvent",
  directorCalendarEventSchema
);
