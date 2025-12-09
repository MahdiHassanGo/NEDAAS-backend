// backend/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      index: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: String,

    // Extra profile fields (for members)
    mobile: String,
    studentId: String,
    studentEmail: String,

    // Lead reference (who this user is under)
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    role: {
      type: String,
      enum: ["member", "lead", "advisor", "director", "admin"],
      default: "member",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
