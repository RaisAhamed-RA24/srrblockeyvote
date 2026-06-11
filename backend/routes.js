import express from "express";
import {
  AdminRequest,
  Admin,
  VoterApplication,
  Voter,
  Election,
  Candidate,
  Vote,
  LedgerBlock,
  SecurityEvent,
  DuplicateAttemptsCounter
} from "./models.js";

const router = express.Router();

// Helper: Hashing function from original project
function makeHash(seed) {
  const alphabet = "abcdef0123456789";
  let hash = "0x";
  for (let index = 0; index < 40; index += 1) {
    const code = seed.charCodeAt(index % seed.length) + index * 19 + Date.now();
    hash += alphabet[code % alphabet.length];
  }
  return hash;
}

// Helper: Security Logger
async function logSecurityEvent(message) {
  const time = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  await SecurityEvent.create({ message, time });
  // Maintain max 8 security events like original logic
  const events = await SecurityEvent.find().sort({ _id: -1 });
  if (events.length > 8) {
    const idsToDelete = events.slice(8).map(e => e._id);
    await SecurityEvent.deleteMany({ _id: { $in: idsToDelete } });
  }
}

/* ==========================================================================
   VOTER ENDPOINTS
   ========================================================================== */

// Submit Voter Application
router.post("/voters/register", async (req, res) => {
  const { name, email, mobile } = req.body;
  try {
    const application = await VoterApplication.create({
      name,
      email,
      mobile,
      status: "PENDING"
    });
    res.status(201).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Voter Login
router.post("/voters/login", async (req, res) => {
  const { voterId, password } = req.body;
  try {
    const voter = await Voter.findOne({ voterId, password, status: "ACTIVE" });
    if (!voter) {
      return res.status(401).json({ success: false, message: "Login failed. Voter ID must be approved and password must match." });
    }
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Voter Biometrics
router.post("/voters/biometrics", async (req, res) => {
  const { voterId, biometricType } = req.body;
  try {
    const voter = await Voter.findOneAndUpdate(
      { voterId },
      { biometricType },
      { new: true }
    );
    if (!voter) {
      return res.status(404).json({ success: false, message: "Voter not found." });
    }
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cast Secure Vote
router.post("/voters/vote", async (req, res) => {
  const { voterId, candidateId } = req.body;
  try {
    const voter = await Voter.findOne({ voterId });
    if (!voter || voter.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Voter account is suspended or inactive." });
    }

    if (voter.hasVoted) {
      // Increment duplicate attempts counter
      await DuplicateAttemptsCounter.findOneAndUpdate({}, { $inc: { count: 1 } });
      await logSecurityEvent(`Voter ID ${voterId} blocked: Duplicate voting attempt recorded.`);
      return res.status(400).json({ success: false, message: "Voting Blocked: this voter ID has already cast a vote.", duplicate: true });
    }

    const election = await Election.findOne();
    if (!election || election.status !== "OPEN") {
      return res.status(400).json({ success: false, message: "Voting unavailable: election is not open." });
    }

    const candidate = await Candidate.findOne({ candidateId });
    if (!candidate) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const timestamp = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    const votesCount = await Vote.countDocuments();
    const voteId = `VOTE-${String(votesCount + 1).padStart(5, "0")}`;

    // Get previous block hash from ledger
    const lastBlock = await LedgerBlock.findOne().sort({ blockId: -1 });
    const previousHash = lastBlock ? lastBlock.currentHash : "GENESIS";
    const currentHash = makeHash(`${voteId}-${voterId}-${candidateId}-${previousHash}`);

    // Update Voter Has Voted
    voter.hasVoted = true;
    await voter.save();

    // Increment Candidate Votes
    candidate.votes += 1;
    await candidate.save();

    // Store Vote Record
    const voteRecord = await Vote.create({
      voteId,
      electionId: election._id.toString(),
      voterId,
      candidateId,
      timestamp,
      blockHash: currentHash
    });

    // Store Blockchain Ledger Block
    const ledgerCount = await LedgerBlock.countDocuments();
    const block = await LedgerBlock.create({
      blockId: ledgerCount + 1,
      voteId,
      candidateId,
      timestamp,
      previousHash,
      currentHash
    });

    res.json({
      success: true,
      vote: voteRecord,
      ledgerBlock: block
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Candidates Ballot
router.get("/voters/candidates", async (req, res) => {
  try {
    const election = await Election.findOne();
    if (!election || election.status === "NO_ELECTION") {
      return res.json([]);
    }
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Election Info
router.get("/voters/election", async (req, res) => {
  try {
    const election = await Election.findOne();
    res.json(election);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Public Results
router.get("/voters/results", async (req, res) => {
  try {
    const election = await Election.findOne();
    if (!election || election.status !== "RESULTS_PUBLISHED") {
      return res.status(403).json({ success: false, message: "Results are not officially published yet." });
    }
    const candidates = await Candidate.find().sort({ votes: -1 });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Blockchain Ledger public
router.get("/voters/ledger", async (req, res) => {
  try {
    const ledger = await LedgerBlock.find().sort({ blockId: 1 });
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   ADMIN ENDPOINTS
   ========================================================================== */

// Submit Admin Access Request
router.post("/admins/request", async (req, res) => {
  const { name, email, mobile, organization, password } = req.body;
  try {
    const existing = await AdminRequest.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "An admin request with this email already exists." });
    }
    const request = await AdminRequest.create({
      name,
      email,
      mobile,
      organization,
      password,
      status: "PENDING"
    });
    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin/Super Admin Password Login Check
router.post("/admins/login", async (req, res) => {
  const { adminId, password, role } = req.body;
  try {
    const admin = await Admin.findOne({ adminId, role });
    if (!admin) {
      return res.status(401).json({ success: false, message: `Invalid ${role} credentials or account is not ACTIVE.` });
    }

    // Check Lockout
    if (admin.lockedUntil && new Date() < admin.lockedUntil) {
      return res.status(403).json({
        success: false,
        message: "Account temporarily locked after repeated failed attempts. Try again in one minute.",
        locked: true
      });
    }

    if (admin.status !== "ACTIVE") {
      return res.status(401).json({ success: false, message: `Account status is ${admin.status}. Login blocked.` });
    }

    if (admin.password !== password) {
      // Handle brute-force attempt
      admin.failedAttempts += 1;
      if (admin.failedAttempts >= 3) {
        admin.lockedUntil = new Date(Date.now() + 60000); // lock 1 min
        await admin.save();
        await logSecurityEvent(`${role === "SUPER_ADMIN" ? "Super Admin" : "Election Admin"} locked for repeated failed login attempts.`);
        return res.status(403).json({
          success: false,
          message: "Account temporarily locked after repeated failed attempts. Try again in one minute.",
          locked: true
        });
      }
      await admin.save();
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Password verified: request OTP
    await logSecurityEvent(`${role} password verified for ${adminId}; OTP required.`);
    res.json({ success: true, requiresOTP: true, adminId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin/Super Admin OTP Validation
router.post("/admins/login/otp", async (req, res) => {
  const { adminId, otp, role } = req.body;
  try {
    const admin = await Admin.findOne({ adminId, role });
    if (!admin || admin.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Session expired or admin account disabled." });
    }

    // Mock OTP verification
    const expectedOtp = role === "SUPER_ADMIN" ? "654321" : "123456";
    if (otp !== expectedOtp) {
      await logSecurityEvent(`${role} OTP failed for ${adminId}.`);
      return res.status(401).json({ success: false, message: "Invalid OTP. Admin login blocked." });
    }

    // Clear failed attempts
    admin.failedAttempts = 0;
    admin.lockedUntil = null;
    await admin.save();

    await logSecurityEvent(`${role} ${adminId} completed MFA login.`);
    res.json({
      success: true,
      admin: {
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Statistics
router.get("/admins/dashboard-metrics", async (req, res) => {
  try {
    const pendingVoterApps = await VoterApplication.countDocuments({ status: "PENDING" });
    const approvedVoters = await Voter.countDocuments({ status: "ACTIVE" });
    const totalVoters = (await VoterApplication.countDocuments()) + (await Voter.countDocuments());
    const votesCast = await Vote.countDocuments();

    const election = await Election.findOne();
    const activeElectionsCount = (election && election.status === "OPEN") ? 1 : 0;

    const dupCounter = await DuplicateAttemptsCounter.findOne();
    const duplicateAttempts = dupCounter ? dupCounter.count : 0;

    const activeAdmins = await Admin.countDocuments({ role: "ADMIN", status: "ACTIVE" });
    const pendingAdminRequests = await AdminRequest.countDocuments({ status: "PENDING" });
    const ledgerBlocksCount = await LedgerBlock.countDocuments();

    res.json({
      pendingVoterApps,
      approvedVoters,
      totalVoters,
      votesCast,
      activeElectionsCount,
      duplicateAttempts,
      activeAdmins,
      pendingAdminRequests,
      ledgerBlocksCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending voter applications
router.get("/admins/voter-applications", async (req, res) => {
  try {
    const apps = await VoterApplication.find({ status: "PENDING" });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Voter Application
router.post("/admins/voter-applications/:id/approve", async (req, res) => {
  const { id } = req.params;
  try {
    const app = await VoterApplication.findById(id);
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });

    app.status = "APPROVED";
    await app.save();

    // Generate Voter ID
    const activeVoterCount = await Voter.countDocuments();
    const padIndex = String(activeVoterCount + 1).padStart(4, "0");
    const voterId = `VTR2026${padIndex}`;

    const newVoter = await Voter.create({
      voterId,
      name: app.name,
      email: app.email,
      password: "voter123", // default password as in original logic
      biometricType: "Fingerprint",
      hasVoted: false,
      status: "ACTIVE",
      isTest: false
    });

    res.json({ success: true, voter: newVoter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Voter Application
router.post("/admins/voter-applications/:id/reject", async (req, res) => {
  const { id } = req.params;
  try {
    const app = await VoterApplication.findByIdAndUpdate(id, { status: "REJECTED" }, { new: true });
    res.json({ success: true, application: app });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Voter Accounts
router.get("/admins/voters", async (req, res) => {
  try {
    const voters = await Voter.find();
    res.json(voters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Voter Voting Status
router.post("/admins/voters/:id/reset", async (req, res) => {
  const { id } = req.params; // voterId
  try {
    const voter = await Voter.findOneAndUpdate({ voterId: id }, { hasVoted: false }, { new: true });
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend Voter Account
router.post("/admins/voters/:id/suspend", async (req, res) => {
  const { id } = req.params; // voterId
  try {
    const voter = await Voter.findOneAndUpdate({ voterId: id }, { status: "SUSPENDED" }, { new: true });
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Test Voter Account
router.delete("/admins/voters/:id", async (req, res) => {
  const { id } = req.params; // voterId
  try {
    const voter = await Voter.findOne({ voterId: id });
    if (!voter || !voter.isTest) {
      return res.status(400).json({ success: false, message: "Only test voter accounts can be deleted." });
    }
    await Voter.deleteOne({ voterId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Test Voters
router.post("/admins/voters/generate-test", async (req, res) => {
  try {
    const tests = [
      { id: "VTR_TEST001", name: "Test Voter 1", email: "test1@example.com", bio: "Fingerprint" },
      { id: "VTR_TEST002", name: "Test Voter 2", email: "test2@example.com", bio: "Face Recognition" },
      { id: "VTR_TEST003", name: "Test Voter 3", email: "test3@example.com", bio: "Fingerprint" }
    ];

    const results = [];
    const baseCount = await Voter.countDocuments();
    let index = 0;

    for (const item of tests) {
      const exists = await Voter.findOne({ voterId: item.id });
      if (!exists) {
        const created = await Voter.create({
          voterId: item.id,
          name: item.name,
          email: item.email,
          password: "test123",
          biometricType: item.bio,
          hasVoted: false,
          status: "ACTIVE",
          isTest: true
        });
        results.push(created);
        index++;
      }
    }
    res.json({ success: true, generated: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Test Voters
router.post("/admins/voters/reset-test", async (req, res) => {
  try {
    await Voter.updateMany({ isTest: true }, { hasVoted: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Admin Requests (Super Admin Only)
router.get("/admins/admin-requests", async (req, res) => {
  try {
    const requests = await AdminRequest.find({ status: "PENDING" });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Admin Request (Super Admin re-auth code required)
router.post("/admins/admin-requests/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { reauthCode, currentAdminId } = req.body;
  try {
    if (reauthCode !== "999999") {
      await logSecurityEvent("Super Admin critical action blocked by failed re-authentication.");
      return res.status(403).json({ success: false, message: "Super Admin critical action blocked by failed re-authentication." });
    }

    const reqRecord = await AdminRequest.findById(id);
    if (!reqRecord) return res.status(404).json({ success: false, message: "Request not found." });

    reqRecord.status = "APPROVED";
    await reqRecord.save();

    const activeAdminsCount = await Admin.countDocuments({ role: "ADMIN" });
    const padId = String(activeAdminsCount + 1).padStart(4, "0");
    const adminId = `ADM2026${padId}`;

    const newAdmin = await Admin.create({
      adminId,
      name: reqRecord.name,
      email: reqRecord.email,
      password: reqRecord.password || "admin123",
      role: "ADMIN",
      status: "ACTIVE",
      createdBy: currentAdminId
    });

    await logSecurityEvent(`SUPER_ADMIN approved admin request for ${reqRecord.email}.`);
    res.json({ success: true, admin: newAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Admin Request (Super Admin re-auth code required)
router.post("/admins/admin-requests/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { reauthCode } = req.body;
  try {
    if (reauthCode !== "999999") {
      await logSecurityEvent("Super Admin critical action blocked by failed re-authentication.");
      return res.status(403).json({ success: false, message: "Super Admin critical action blocked by failed re-authentication." });
    }

    const reqRecord = await AdminRequest.findById(id);
    if (!reqRecord) return res.status(404).json({ success: false, message: "Request not found." });

    reqRecord.status = "REJECTED";
    reqRecord.rejectionReason = "Rejected by Super Admin";
    await reqRecord.save();

    await logSecurityEvent(`SUPER_ADMIN rejected admin request for ${reqRecord.email}.`);
    res.json({ success: true, request: reqRecord });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Managed Admins Accounts List
router.get("/admins/accounts", async (req, res) => {
  try {
    const adminList = await Admin.find({ role: "ADMIN" });
    res.json(adminList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate Admin Account
router.post("/admins/accounts/:id/activate", async (req, res) => {
  const { id } = req.params; // adminId
  try {
    const admin = await Admin.findOneAndUpdate({ adminId: id, role: "ADMIN" }, { status: "ACTIVE" }, { new: true });
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend Admin Account
router.post("/admins/accounts/:id/suspend", async (req, res) => {
  const { id } = req.params; // adminId
  try {
    const admin = await Admin.findOneAndUpdate({ adminId: id, role: "ADMIN" }, { status: "SUSPENDED" }, { new: true });
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Security Audit Logs
router.get("/admins/security-events", async (req, res) => {
  try {
    const events = await SecurityEvent.find().sort({ _id: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update Election settings
router.post("/admins/election", async (req, res) => {
  const { title, description, startDate, endDate, status } = req.body;
  try {
    let election = await Election.findOne();
    if (!election) {
      election = new Election();
    }
    election.title = title;
    election.description = description;
    election.startDate = startDate;
    election.endDate = endDate;
    election.status = status;
    await election.save();

    res.json({ success: true, election });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Candidate
router.post("/admins/candidates", async (req, res) => {
  const { name, party, symbol, manifesto } = req.body;
  try {
    const candidatesCount = await Candidate.countDocuments();
    const candidateId = `CND${String(candidatesCount + 1).padStart(3, "0")}`;

    const candidate = await Candidate.create({
      candidateId,
      name,
      party,
      symbol,
      manifesto,
      votes: 0
    });
    res.status(201).json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Candidate
router.put("/admins/candidates/:id", async (req, res) => {
  const { id } = req.params; // candidateId
  const { name, party, symbol, manifesto } = req.body;
  try {
    const candidate = await Candidate.findOneAndUpdate(
      { candidateId: id },
      { name, party, symbol, manifesto },
      { new: true }
    );
    res.json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Candidate
router.delete("/admins/candidates/:id", async (req, res) => {
  const { id } = req.params; // candidateId
  try {
    await Candidate.deleteOne({ candidateId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get live results / candidate votes monitor
router.get("/admins/results", async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
