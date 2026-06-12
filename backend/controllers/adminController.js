import bcrypt from "bcryptjs";
import {
  User,
  VoterApplication,
  AdminRequest,
  Election,
  Candidate,
  Vote,
  LedgerBlock,
  DuplicateAttemptsCounter
} from "../models.js";

// Get Dashboard Statistics
export async function getDashboardMetrics(req, res) {
  try {
    const pendingVoterApps = await VoterApplication.countDocuments({ status: "PENDING" });
    const approvedVoters = await User.countDocuments({ role: "VOTER", status: "ACTIVE" });
    const totalVoters = (await VoterApplication.countDocuments()) + (await User.countDocuments({ role: "VOTER" }));
    const votesCast = await Vote.countDocuments();

    const election = await Election.findOne();
    const activeElectionsCount = (election && election.status === "OPEN") ? 1 : 0;

    const dupCounter = await DuplicateAttemptsCounter.findOne();
    const duplicateAttempts = dupCounter ? dupCounter.count : 0;

    const activeAdmins = await User.countDocuments({ role: "ADMIN", status: "ACTIVE" });
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get pending voter applications
export async function getVoterApplications(req, res) {
  try {
    const apps = await VoterApplication.find({ status: "PENDING" });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Approve Voter Application (generates User account with bcrypt passwordHash)
export async function approveVoter(req, res) {
  const { id } = req.params;
  try {
    const app = await VoterApplication.findById(id);
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });

    app.status = "APPROVED";
    await app.save();

    // Generate Voter ID
    const activeVoterCount = await User.countDocuments({ role: "VOTER" });
    const padIndex = String(activeVoterCount + 1).padStart(4, "0");
    const voterId = `VTR2026${padIndex}`;

    // Hash default voter password
    const passwordHash = await bcrypt.hash("voter123", 10);

    const newVoter = await User.create({
      userId: voterId,
      name: app.name,
      email: app.email,
      passwordHash,
      biometricType: "Fingerprint",
      hasVoted: false,
      role: "VOTER",
      status: "ACTIVE"
    });

    res.json({ success: true, voter: newVoter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Reject Voter Application
export async function rejectVoter(req, res) {
  const { id } = req.params;
  try {
    const app = await VoterApplication.findByIdAndUpdate(id, { status: "REJECTED" }, { new: true });
    res.json({ success: true, application: app });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Voter Accounts
export async function getVoterAccounts(req, res) {
  try {
    const voters = await User.find({ role: "VOTER" });
    res.json(voters);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Reset Voter Voting Status
export async function resetVoterStatus(req, res) {
  const { id } = req.params; // voterId
  try {
    const voter = await User.findOneAndUpdate({ userId: id, role: "VOTER" }, { hasVoted: false }, { new: true });
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Suspend Voter Account
export async function suspendVoter(req, res) {
  const { id } = req.params; // voterId
  try {
    const voter = await User.findOneAndUpdate({ userId: id, role: "VOTER" }, { status: "SUSPENDED" }, { new: true });
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delete Test Voter Account
export async function deleteTestVoter(req, res) {
  const { id } = req.params; // voterId
  try {
    const voter = await User.findOne({ userId: id, role: "VOTER" });
    if (!voter || !voter.isTest) {
      return res.status(400).json({ success: false, message: "Only test voter accounts can be deleted." });
    }
    await User.deleteOne({ userId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Generate Test Voters
export async function generateTestVoters(req, res) {
  try {
    const tests = [
      { id: "VTR_TEST001", name: "Test Voter 1", email: "test1@example.com", bio: "Fingerprint" },
      { id: "VTR_TEST002", name: "Test Voter 2", email: "test2@example.com", bio: "Face Recognition" },
      { id: "VTR_TEST003", name: "Test Voter 3", email: "test3@example.com", bio: "Fingerprint" }
    ];

    const results = [];
    const passwordHash = await bcrypt.hash("test123", 10);

    for (const item of tests) {
      const exists = await User.findOne({ userId: item.id });
      if (!exists) {
        // Support custom field 'isTest' in User model dynamically
        const created = await User.create({
          userId: item.id,
          name: item.name,
          email: item.email,
          passwordHash,
          biometricType: item.bio,
          hasVoted: false,
          role: "VOTER",
          status: "ACTIVE",
          isTest: true
        });
        results.push(created);
      }
    }
    res.json({ success: true, generated: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Reset Test Voters
export async function resetTestVoters(req, res) {
  try {
    await User.updateMany({ role: "VOTER", isTest: true }, { hasVoted: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Create/Update Election settings
export async function configureElection(req, res) {
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// Add Candidate
export async function addCandidate(req, res) {
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// Edit Candidate
export async function editCandidate(req, res) {
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// Remove Candidate
export async function deleteCandidate(req, res) {
  const { id } = req.params; // candidateId
  try {
    await Candidate.deleteOne({ candidateId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get live results / candidate votes monitor
export async function getLiveResults(req, res) {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
