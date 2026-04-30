// backend/routes/leadRoutes.js
import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Conference from "../models/Conference.js";
import Author from "../models/Author.js";
import Publication from "../models/Publication.js";
import {
  verifyFirebaseToken,
  requireLead,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyFirebaseToken);

// ---------- HELPER ----------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* ============================
 * TEAM
 * ==========================*/

// GET /api/lead/team
router.get("/team", requireLead, async (req, res) => {
  try {
    const lead = await User.findById(req.user._id).select(
      "_id displayName email"
    );
    const members = await User.find({ lead: lead._id }).select(
      "displayName email mobile studentId studentEmail"
    );
    res.json({ lead, members });
  } catch (err) {
    console.error("Error loading team:", err.message);
    res.status(500).json({ message: "Failed to load team" });
  }
});

// POST /api/lead/members
router.post("/members", requireLead, async (req, res) => {
  const { displayName, email, mobile, studentId, studentEmail } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Valid email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.lead && !user.lead.equals(req.user._id)) {
        return res
          .status(400)
          .json({ message: "User already assigned under another lead" });
      }
      user.lead = req.user._id;
      user.role = user.role || "member";
      if (displayName) user.displayName = displayName.slice(0, 100);
      if (mobile) user.mobile = mobile.slice(0, 20);
      if (studentId) user.studentId = studentId.slice(0, 50);
      if (studentEmail) user.studentEmail = studentEmail.slice(0, 200);
      await user.save();
    } else {
      user = await User.create({
        email: normalizedEmail,
        displayName: displayName ? displayName.slice(0, 100) : normalizedEmail,
        mobile: mobile?.slice(0, 20) || "",
        studentId: studentId?.slice(0, 50) || "",
        studentEmail: studentEmail?.slice(0, 200) || "",
        lead: req.user._id,
        role: "member",
      });
    }

    res.status(201).json({
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      mobile: user.mobile,
      studentId: user.studentId,
      studentEmail: user.studentEmail,
    });
  } catch (err) {
    console.error("Error creating member:", err.message);
    res.status(500).json({ message: "Failed to create member" });
  }
});

// PUT /api/lead/members/:memberId
router.put("/members/:memberId", requireLead, async (req, res) => {
  const { memberId } = req.params;
  if (!isValidObjectId(memberId)) {
    return res.status(400).json({ message: "Invalid member ID" });
  }

  const { displayName, mobile, studentId, studentEmail } = req.body;

  try {
    const member = await User.findOneAndUpdate(
      { _id: memberId, lead: req.user._id }, // ownership check
      {
        ...(displayName !== undefined && { displayName: displayName.slice(0, 100) }),
        ...(mobile !== undefined && { mobile: mobile.slice(0, 20) }),
        ...(studentId !== undefined && { studentId: studentId.slice(0, 50) }),
        ...(studentEmail !== undefined && { studentEmail: studentEmail.slice(0, 200) }),
      },
      { new: true }
    ).select("displayName email mobile studentId studentEmail");

    if (!member) {
      return res.status(404).json({ message: "Member not found or not under this lead" });
    }
    res.json(member);
  } catch (err) {
    console.error("Error updating member:", err.message);
    res.status(500).json({ message: "Failed to update member" });
  }
});

/* ============================
 * AUTHORS
 * ==========================*/

// GET /api/lead/authors
router.get("/authors", requireLead, async (req, res) => {
  try {
    const authors = await Author.find({ lead: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(authors);
  } catch (err) {
    console.error("Error loading authors:", err.message);
    res.status(500).json({ message: "Failed to load authors" });
  }
});

// POST /api/lead/authors
router.post("/authors", requireLead, async (req, res) => {
  const { name, email, affiliation } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Author name is required" });
  }

  try {
    const author = await Author.create({
      lead: req.user._id,
      name: name.slice(0, 100),
      email: email?.slice(0, 200) || "",
      affiliation: affiliation?.slice(0, 200) || "",
    });
    res.status(201).json(author);
  } catch (err) {
    console.error("Error creating author:", err.message);
    res.status(500).json({ message: "Failed to create author" });
  }
});

// PUT /api/lead/authors/:id
router.put("/authors/:id", requireLead, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid author ID" });
  }

  const { name, email, affiliation } = req.body;

  try {
    const author = await Author.findOneAndUpdate(
      { _id: id, lead: req.user._id }, // ownership check
      {
        ...(name !== undefined && { name: name.slice(0, 100) }),
        ...(email !== undefined && { email: email.slice(0, 200) }),
        ...(affiliation !== undefined && { affiliation: affiliation.slice(0, 200) }),
      },
      { new: true }
    );

    if (!author) {
      return res.status(404).json({ message: "Author not found for this lead" });
    }
    res.json(author);
  } catch (err) {
    console.error("Error updating author:", err.message);
    res.status(500).json({ message: "Failed to update author" });
  }
});

/* ============================
 * CONFERENCES
 * ==========================*/

// GET /api/lead/conferences
router.get("/conferences", requireLead, async (req, res) => {
  try {
    // Leads can see ALL conferences from all leads
    const confs = await Conference.find({})
      .populate("authors", "displayName email")
      .populate("extraAuthors", "name email affiliation")
      .populate("lead", "displayName email") // Include lead info
      .sort({ createdAt: -1 });
    res.json(confs);
  } catch (err) {
    console.error("Error loading conferences:", err.message);
    res.status(500).json({ message: "Failed to load conferences" });
  }
});

// POST /api/lead/conferences
router.post("/conferences", requireLead, async (req, res) => {
  const { name, title, date, link, authorIds, extraAuthorIds } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "Conference name is required" });
  }
  if (!title || typeof title !== "string") {
    return res.status(400).json({ message: "Conference title is required" });
  }
  if (authorIds && !Array.isArray(authorIds)) {
    return res.status(400).json({ message: "authorIds must be an array" });
  }
  if (extraAuthorIds && !Array.isArray(extraAuthorIds)) {
    return res.status(400).json({ message: "extraAuthorIds must be an array" });
  }

  try {
    const conf = await Conference.create({
      name: name.slice(0, 100),
      title,
      date,
      link,
      lead: req.user._id,
      authors: authorIds || [],
      extraAuthors: extraAuthorIds || [],
      status: "submitted",
    });

    const populated = await Conference.findById(conf._id)
      .populate("authors", "displayName email")
      .populate("extraAuthors", "name email affiliation")
      .populate("lead", "displayName email");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating conference:", err.message);
    res.status(500).json({ message: "Failed to create conference" });
  }
});

// PUT /api/lead/conferences/:id
router.put("/conferences/:id", requireLead, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid conference ID" });
  }

  const { name, title, date, link, authorIds, extraAuthorIds, status } = req.body;
  const VALID_STATUSES = ["submitted", "accepted", "presented", "published"];

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid conference status" });
  }
  if (authorIds && !Array.isArray(authorIds)) {
    return res.status(400).json({ message: "authorIds must be an array" });
  }
  if (extraAuthorIds && !Array.isArray(extraAuthorIds)) {
    return res.status(400).json({ message: "extraAuthorIds must be an array" });
  }

  try {
    const conf = await Conference.findOneAndUpdate(
      { _id: id, lead: req.user._id }, // ownership check
      {
        ...(name !== undefined && { name: name.slice(0, 100) }),
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date }),
        ...(link !== undefined && { link }),
        ...(authorIds !== undefined && { authors: authorIds }),
        ...(extraAuthorIds !== undefined && { extraAuthors: extraAuthorIds }),
        ...(status !== undefined && { status }),
      },
      { new: true }
    )
      .populate("authors", "displayName email")
      .populate("extraAuthors", "name email affiliation")
      .populate("lead", "displayName email");

    if (!conf) {
      return res.status(404).json({ message: "Conference not found or not owned by this lead" });
    }
    res.json(conf);
  } catch (err) {
    console.error("Error updating conference:", err.message);
    res.status(500).json({ message: "Failed to update conference" });
  }
});

// POST /api/lead/conferences/:id/publish-paper
// Submit a conference paper to the publication database
router.post("/conferences/:id/publish-paper", requireLead, async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid conference ID" });
  }

  const { title, authors, description, doi, meta, tag, link, linkLabel } = req.body;

  if (!title || !authors || !description) {
    return res.status(400).json({ message: "Title, authors, and description are required" });
  }

  try {
    // Find the conference
    const conf = await Conference.findOne({ _id: id, lead: req.user._id });
    if (!conf) {
      return res.status(404).json({ message: "Conference not found or not owned by this lead" });
    }

    // Update conference with paper details
    conf.paper = {
      title: title.slice(0, 500),
      authors: authors.slice(0, 500),
      description: description.slice(0, 2000),
      doi: doi?.slice(0, 200) || "",
      meta: meta?.slice(0, 100) || "",
      tag: tag?.slice(0, 100) || "",
      link: link?.slice(0, 500) || "",
      linkLabel: linkLabel?.slice(0, 50) || "View article",
    };
    await conf.save();

    // Create publication entry (will be in pending status for admin review)
    const publication = await Publication.create({
      meta: meta || "Conference Paper",
      title: title.slice(0, 500),
      authors: authors.slice(0, 500),
      description: description.slice(0, 2000),
      tag: tag || "Conference",
      link: link || (doi ? `https://doi.org/${doi}` : ""),
      linkLabel: linkLabel || "View article",
      status: "pending", // Admin will review before approving
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Paper submitted for publication review",
      conference: conf,
      publication: publication,
    });
  } catch (err) {
    console.error("Error publishing paper:", err.message);
    res.status(500).json({ message: "Failed to publish paper" });
  }
});

export default router;
