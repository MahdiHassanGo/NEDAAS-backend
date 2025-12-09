// backend/models/Publication.js
import mongoose from "mongoose";

const publicationSchema = new mongoose.Schema(
  {
    meta: { type: String, required: true },
    title: { type: String, required: true },
    authors: { type: String, required: true },
    description: { type: String, required: true },
    tag: { type: String, required: true },
    link: { type: String, required: true },
    linkLabel: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Publication", publicationSchema);
