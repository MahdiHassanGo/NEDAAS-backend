// backend/routes/adminRoutes.js
import express from "express";
import mongoose from "mongoose";
import {
  verifyFirebaseToken,
  requireAdmin,
} from "../middleware/authMiddleware.js";
import Conference from "../models/Conference.js";
import Publication from "../models/Publication.js";
import User from "../models/User.js";

const router = express.Router();

// ---------- CONFIG ----------
const ROOT_ADMIN_EMAIL = process.env.ROOT_ADMIN_EMAIL || "mahdiasif78@gmail.com";
const ALLOWED_ROLES = ["member", "lead", "advisor", "director", "admin"];

// All routes require authentication + admin role
router.use(verifyFirebaseToken, requireAdmin);

// ---------- HELPERS ----------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function badId(res) {
  return res.status(400).json({ message: "Invalid ID format" });
}

// ========== USERS ==========

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find(
      {},
      "email displayName role mobile studentId studentEmail"
    ).sort({ email: 1 });
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err.message);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return badId(res);

  const { role } = req.body;

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email === ROOT_ADMIN_EMAIL && role !== "admin") {
      return res.status(403).json({ message: "Root admin role is locked" });
    }

    user.role = role;
    await user.save();
    res.json({ _id: user._id, email: user.email, role: user.role });
  } catch (err) {
    console.error("Patch role error:", err.message);
    res.status(500).json({ message: "Failed to update role" });
  }
});

// PUT /api/admin/users/:id
router.put("/users/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return badId(res);

  // Destructure only the fields we expect; ignore anything else
  const { displayName, role, email, mobile, studentId, studentEmail } = req.body;

  if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Root admin protections
    if (user.email === ROOT_ADMIN_EMAIL) {
      if (role && role !== "admin") {
        return res.status(403).json({ message: "Root admin role is locked to 'admin'" });
      }
      if (email && email !== ROOT_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Root admin email is locked" });
      }
    }

    // Prevent email hijacking by another existing user
    if (email && email !== user.email) {
      const conflict = await User.findOne({ email });
      if (conflict) return res.status(400).json({ message: "Email already in use" });
      user.email = email;
    }

    if (displayName !== undefined) user.displayName = displayName.slice(0, 100);
    if (role !== undefined) user.role = user.email === ROOT_ADMIN_EMAIL ? "admin" : role;
    if (mobile !== undefined) user.mobile = mobile.slice(0, 20);
    if (studentId !== undefined) user.studentId = studentId.slice(0, 50);
    if (studentEmail !== undefined) user.studentEmail = studentEmail.slice(0, 200);

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("Put user error:", err.message);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// POST /api/admin/users/manual
router.post("/users/manual", async (req, res) => {
  const { email, displayName, role } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Valid email is required" });
  }
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: "Valid role is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const finalRole = normalizedEmail === ROOT_ADMIN_EMAIL ? "admin" : role;

  try {
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.role = normalizedEmail === ROOT_ADMIN_EMAIL ? "admin" : finalRole;
      if (displayName) user.displayName = displayName.slice(0, 100);
      await user.save();
    } else {
      user = await User.create({
        email: normalizedEmail,
        displayName: displayName ? displayName.slice(0, 100) : null,
        role: finalRole,
        uid: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }

    res.status(201).json(user);
  } catch (err) {
    console.error("Manual user error:", err.message);
    res.status(500).json({ message: "Failed to create/update user" });
  }
});

// ========== TEAMS ==========

// GET /api/admin/teams
router.get("/teams", async (req, res) => {
  try {
    const leads = await User.find({ role: "lead" }, "_id displayName email");
    const leadIds = leads.map((l) => l._id);
    const members = await User.find({ lead: { $in: leadIds } });

    const grouped = leads.map((lead) => ({
      lead,
      members: members.filter(
        (m) => m.lead && m.lead.toString() === lead._id.toString()
      ),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Get teams error:", err.message);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
});

// POST /api/admin/teams/assign-member
router.post("/teams/assign-member", async (req, res) => {
  const { memberId, leadId } = req.body;

  if (!isValidObjectId(memberId) || !isValidObjectId(leadId)) {
    return res.status(400).json({ message: "Valid memberId and leadId are required" });
  }

  try {
    const [member, lead] = await Promise.all([
      User.findById(memberId),
      User.findById(leadId),
    ]);

    if (!member || !lead) {
      return res.status(404).json({ message: "Member or Lead not found" });
    }
    if (lead.role !== "lead") {
      return res.status(400).json({ message: "Target user is not a lead" });
    }

    member.lead = lead._id;
    await member.save();
    res.json(member);
  } catch (err) {
    console.error("Assign member error:", err.message);
    res.status(500).json({ message: "Failed to assign member" });
  }
});

// PUT /api/admin/teams/members/:memberId
router.put("/teams/members/:memberId", async (req, res) => {
  if (!isValidObjectId(req.params.memberId)) return badId(res);

  const { displayName, mobile, studentId, studentEmail } = req.body;

  try {
    const member = await User.findByIdAndUpdate(
      req.params.memberId,
      {
        ...(displayName !== undefined && { displayName: displayName.slice(0, 100) }),
        ...(mobile !== undefined && { mobile: mobile.slice(0, 20) }),
        ...(studentId !== undefined && { studentId: studentId.slice(0, 50) }),
        ...(studentEmail !== undefined && { studentEmail: studentEmail.slice(0, 200) }),
      },
      { new: true, runValidators: true }
    );

    if (!member) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  } catch (err) {
    console.error("Update team member error:", err.message);
    res.status(500).json({ message: "Failed to update member" });
  }
});

// ========== PUBLICATIONS ==========

// GET /api/admin/publications
router.get("/publications", async (req, res) => {
  try {
    const publications = await Publication.find()
      .populate("createdBy", "email displayName")
      .sort({ createdAt: -1 });
    res.json(publications);
  } catch (err) {
    console.error("Get publications error:", err.message);
    res.status(500).json({ message: "Failed to fetch publications" });
  }
});

// POST /api/admin/publications
router.post("/publications", async (req, res) => {
  try {
    const { meta, title, authors, description, tag, link, linkLabel } = req.body;

    if (!meta || !title || !authors || !description || !tag || !link) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const pub = await Publication.create({
      meta,
      title,
      authors,
      description,
      tag,
      link,
      linkLabel: linkLabel || "View article",
      status: "approved",
      createdBy: req.user._id,
    });

    res.status(201).json(pub);
  } catch (err) {
    console.error("Create publication error:", err.message);
    res.status(400).json({ message: "Invalid publication data" });
  }
});

// PATCH /api/admin/publications/:id/status
router.patch("/publications/:id/status", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return badId(res);

  const { status } = req.body;
  const ALLOWED_STATUSES = ["pending", "approved", "rejected"];

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const pub = await Publication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("createdBy", "email displayName");

    if (!pub) return res.status(404).json({ message: "Publication not found" });
    res.json(pub);
  } catch (err) {
    console.error("Update publication status error:", err.message);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// PUT /api/admin/publications/:id
router.put("/publications/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return badId(res);

  const { meta, title, authors, description, tag, link, linkLabel } = req.body;

  try {
    const pub = await Publication.findByIdAndUpdate(
      req.params.id,
      { meta, title, authors, description, tag, link, linkLabel },
      { new: true, runValidators: true }
    ).populate("createdBy", "email displayName");

    if (!pub) return res.status(404).json({ message: "Publication not found" });
    res.json(pub);
  } catch (err) {
    console.error("Update publication error:", err.message);
    res.status(400).json({ message: "Invalid publication data" });
  }
});

// ========== CONFERENCES ==========

// GET /api/admin/conferences
router.get("/conferences", async (req, res) => {
  try {
    const confs = await Conference.find()
      .populate("lead", "displayName email")
      .populate("authors", "displayName email")
      .populate("extraAuthors", "name email affiliation");
    res.json(confs);
  } catch (err) {
    console.error("Get conferences error:", err.message);
    res.status(500).json({ message: "Failed to fetch conferences" });
  }
});

// POST /api/admin/conferences
router.post("/conferences", async (req, res) => {
  const { title, date, link, status, leadId, authorIds } = req.body;

  if (!title || !isValidObjectId(leadId)) {
    return res.status(400).json({ message: "title and valid leadId are required" });
  }

  try {
    const lead = await User.findById(leadId);
    if (!lead || lead.role !== "lead") {
      return res.status(400).json({ message: "Lead not found or not a lead user" });
    }

    // Validate authorIds if provided
    if (authorIds && !Array.isArray(authorIds)) {
      return res.status(400).json({ message: "authorIds must be an array" });
    }

    const conf = await Conference.create({
      title,
      date,
      link,
      lead: lead._id,
      authors: authorIds || [],
      status: status || "submitted",
    });

    const populated = await Conference.findById(conf._id)
      .populate("lead", "displayName email")
      .populate("authors", "displayName email");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Admin create conference error:", err.message);
    res.status(500).json({ message: "Failed to create conference" });
  }
});

// PUT /api/admin/conferences/:id
router.put("/conferences/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return badId(res);

  const { title, date, link, status, authorIds } = req.body;
  const VALID_STATUSES = ["submitted", "accepted", "presented", "published"];

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid conference status" });
  }
  if (authorIds && !Array.isArray(authorIds)) {
    return res.status(400).json({ message: "authorIds must be an array" });
  }

  try {
    const conf = await Conference.findById(req.params.id);
    if (!conf) return res.status(404).json({ message: "Conference not found" });

    if (title !== undefined) conf.title = title;
    if (date !== undefined) conf.date = date;
    if (link !== undefined) conf.link = link;
    if (status !== undefined) conf.status = status;
    if (authorIds !== undefined) conf.authors = authorIds;

    await conf.save();

    const populated = await Conference.findById(conf._id)
      .populate("lead", "displayName email")
      .populate("authors", "displayName email");

    res.json(populated);
  } catch (err) {
    console.error("Admin update conference error:", err.message);
    res.status(500).json({ message: "Failed to update conference" });
  }
});

// DELETE /api/admin/conferences/:id
router.delete("/conferences/:id", async (req, res) => {
  if (!isValidObjectId(req.params.id)) return badId(res);

  try {
    const conf = await Conference.findByIdAndDelete(req.params.id);
    if (!conf) return res.status(404).json({ message: "Conference not found" });
    res.json({ message: "Conference deleted" });
  } catch (err) {
    console.error("Admin delete conference error:", err.message);
    res.status(500).json({ message: "Failed to delete conference" });
  }
});

export default router;
