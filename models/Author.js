// backend/models/Author.js
import mongoose from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    // which lead owns this author record
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    affiliation: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Author", authorSchema);
