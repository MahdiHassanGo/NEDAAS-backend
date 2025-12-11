// backend/models/Conference.js
import mongoose from "mongoose";

const conferenceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date },
    link: { type: String },

    // lead (owner)
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // authors from User collection (team members)
    authors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // extra authors (external) from Author collection
    extraAuthors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Author",
      },
    ],

    status: {
      type: String,
      enum: ["submitted", "accepted", "presented", "published"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Conference", conferenceSchema);
