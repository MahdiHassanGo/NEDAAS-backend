// backend/routes/leadRoutes.js
import express from "express";
import User from "../models/User.js";
import Conference from "../models/Conference.js";
import { verifyFirebaseToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyFirebaseToken);

// Helper: ensure user is a lead
function requireLead(req, res, next) {
  if (!req.user || req.user.role !== "lead") {
    return res.status(403).json({ message: "Lead role required" });
  }
  next();
}

/* ============================
 * TEAM (LEAD SIDE)
 * ==========================*/

// GET /api/lead/team
router.get("/team", requireLead, async (req, res) => {
  const lead = await User.findById(req.user._id);

  const members = await User.find({ lead: lead._id }).select(
    "displayName email mobile studentId studentEmail"
  );

  res.json({
    lead: {
      _id: lead._id,
      displayName: lead.displayName,
      email: lead.email,
    },
    members,
  });
});

// POST /api/lead/members
// Lead can create a new member under themselves OR attach an existing user by email
router.post("/members", requireLead, async (req, res) => {
  try {
    const { displayName, email, mobile, studentId, studentEmail } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email });

    if (user) {
      // If user is already under another lead, block
      if (user.lead && !user.lead.equals(req.user._id)) {
        return res
          .status(400)
          .json({ message: "User already assigned under another lead" });
      }

      // Attach/update under current lead
      user.lead = req.user._id;
      user.role = user.role || "member";
      if (displayName) user.displayName = displayName;
      if (mobile) user.mobile = mobile;
      if (studentId) user.studentId = studentId;
      if (studentEmail) user.studentEmail = studentEmail;

      await user.save();
    } else {
      // Create brand new member user
      user = await User.create({
        email,
        displayName: displayName || email,
        mobile: mobile || "",
        studentId: studentId || "",
        studentEmail: studentEmail || "",
        lead: req.user._id,
        role: "member",
      });
    }

    const memberResponse = {
      _id: user._id,
      displayName: user.displayName,
      email: user.email,
      mobile: user.mobile,
      studentId: user.studentId,
      studentEmail: user.studentEmail,
    };

    res.status(201).json(memberResponse);
  } catch (err) {
    console.error("Error creating member by lead:", err);
    return res
      .status(500)
      .json({ message: "Failed to create member under this lead" });
  }
});

// PUT /api/lead/members/:memberId
// Lead can update only members that are under them
router.put("/members/:memberId", requireLead, async (req, res) => {
  const { memberId } = req.params;
  const { displayName, mobile, studentId, studentEmail } = req.body;

  try {
    const member = await User.findOneAndUpdate(
      { _id: memberId, lead: req.user._id },
      {
        ...(displayName !== undefined && { displayName }),
        ...(mobile !== undefined && { mobile }),
        ...(studentId !== undefined && { studentId }),
        ...(studentEmail !== undefined && { studentEmail }),
      },
      { new: true }
    ).select("displayName email mobile studentId studentEmail");

    if (!member) {
      return res.status(404).json({
        message: "Member not found or not assigned under this lead",
      });
    }

    res.json(member);
  } catch (err) {
    console.error("Error updating member by lead:", err);
    return res.status(500).json({ message: "Failed to update member" });
  }
});

/* ============================
 * CONFERENCES (LEAD SIDE)
 * ==========================*/

// GET /api/lead/conferences
router.get("/conferences", requireLead, async (req, res) => {
  const confs = await Conference.find({ lead: req.user._id }).populate(
    "authors",
    "displayName email"
  );
  res.json(confs);
});

// POST /api/lead/conferences
router.post("/conferences", requireLead, async (req, res) => {
  const { title, date, link, authorIds } = req.body;

  const conf = await Conference.create({
    title,
    date,
    link,
    lead: req.user._id,
    authors: authorIds || [],
    status: "submitted",
  });

  res.status(201).json(conf);
});

// PUT /api/lead/conferences/:id
router.put("/conferences/:id", requireLead, async (req, res) => {
  const { id } = req.params;
  const { title, date, link, authorIds, status } = req.body;

  const conf = await Conference.findOneAndUpdate(
    { _id: id, lead: req.user._id }, // ensure lead owns it
    {
      ...(title && { title }),
      ...(date && { date }),
      ...(link && { link }),
      ...(authorIds && { authors: authorIds }),
      ...(status && { status }),
    },
    { new: true }
  ).populate("authors", "displayName email");

  if (!conf) {
    return res.status(404).json({ message: "Conference not found" });
  }

  res.json(conf);
});

export default router;
