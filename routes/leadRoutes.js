// backend/routes/leadRoutes.js
import express from "express";
import User from "../models/User.js";
import Conference from "../models/Conference.js";
import Author from "../models/Author.js";
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
  try {
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
  } catch (err) {
    console.error("Error loading team:", err);
    res.status(500).json({ message: "Failed to load team" });
  }
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
 * AUTHORS (LEAD SIDE)
 * ==========================*/

// GET /api/lead/authors  → list authors created by this lead
router.get("/authors", requireLead, async (req, res) => {
  try {
    const authors = await Author.find({ lead: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(authors);
  } catch (err) {
    console.error("Error loading authors:", err);
    res.status(500).json({ message: "Failed to load authors" });
  }
});

// POST /api/lead/authors  → create a new author under this lead
router.post("/authors", requireLead, async (req, res) => {
  try {
    const { name, email, affiliation } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Author name is required" });
    }

    const author = await Author.create({
      lead: req.user._id,
      name,
      email: email || "",
      affiliation: affiliation || "",
    });

    res.status(201).json(author);
  } catch (err) {
    console.error("Error creating author:", err);
    res.status(500).json({ message: "Failed to create author" });
  }
});

// PUT /api/lead/authors/:id  → update an author owned by this lead
router.put("/authors/:id", requireLead, async (req, res) => {
  const { id } = req.params;
  const { name, email, affiliation } = req.body;

  try {
    const author = await Author.findOneAndUpdate(
      { _id: id, lead: req.user._id },
      {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(affiliation !== undefined && { affiliation }),
      },
      { new: true }
    );

    if (!author) {
      return res
        .status(404)
        .json({ message: "Author not found for this lead" });
    }

    res.json(author);
  } catch (err) {
    console.error("Error updating author:", err);
    res.status(500).json({ message: "Failed to update author" });
  }
});

/* ============================
 * CONFERENCES (LEAD SIDE)
 * ==========================*/

// GET /api/lead/conferences
router.get("/conferences", requireLead, async (req, res) => {
  try {
    const confs = await Conference.find({ lead: req.user._id })
      .populate("authors", "displayName email")
      .populate("extraAuthors", "name email affiliation");

    res.json(confs);
  } catch (err) {
    console.error("Error loading conferences:", err);
    res.status(500).json({ message: "Failed to load conferences" });
  }
});

// POST /api/lead/conferences
router.post("/conferences", requireLead, async (req, res) => {
  try {
    const { title, date, link, authorIds, extraAuthorIds } = req.body;

    const conf = await Conference.create({
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
      .populate("extraAuthors", "name email affiliation");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating conference:", err);
    res.status(500).json({ message: "Failed to create conference" });
  }
});

// PUT /api/lead/conferences/:id
router.put("/conferences/:id", requireLead, async (req, res) => {
  const { id } = req.params;
  const { title, date, link, authorIds, extraAuthorIds, status } = req.body;

  try {
    const conf = await Conference.findOneAndUpdate(
      { _id: id, lead: req.user._id }, // ensure lead owns it
      {
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
      .populate("extraAuthors", "name email affiliation");

    if (!conf) {
      return res.status(404).json({ message: "Conference not found" });
    }

    res.json(conf);
  } catch (err) {
    console.error("Error updating conference:", err);
    res.status(500).json({ message: "Failed to update conference" });
  }
});

export default router;
