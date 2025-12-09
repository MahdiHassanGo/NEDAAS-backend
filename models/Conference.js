// backend/models/Conference.js
import mongoose from "mongoose";

const conferenceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date },
    link: { type: String },
    status: {
      type: String,
      enum: ["submitted", "accepted", "presented", "published"],
      default: "submitted",
    },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Conference", conferenceSchema);
