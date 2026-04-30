// backend/models/Conference.js
import mongoose from "mongoose";

const conferenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Unique conference name
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

    // Paper details (added when status changes to "published")
    paper: {
      title: { type: String },
      authors: { type: String }, // Comma-separated author names
      description: { type: String },
      doi: { type: String },
      meta: { type: String }, // Category/meta tag
      tag: { type: String }, // Research area tag
      link: { type: String }, // Link to published paper/DOI
      linkLabel: { type: String, default: "View article" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Conference", conferenceSchema);
