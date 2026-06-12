import {
  User,
  Election,
  Candidate,
  Vote,
  LedgerBlock,
  SecurityEvent,
  DuplicateAttemptsCounter
} from "../models.js";

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
  const events = await SecurityEvent.find().sort({ _id: -1 });
  if (events.length > 8) {
    const idsToDelete = events.slice(8).map(e => e._id);
    await SecurityEvent.deleteMany({ _id: { $in: idsToDelete } });
  }
}

// Update Biometric Scanner Selection
export async function updateBiometrics(req, res) {
  const { biometricType } = req.body;
  const voterId = req.user.userId;
  try {
    const voter = await User.findOne({ userId: voterId, role: "VOTER" });
    if (!voter) {
      return res.status(404).json({ success: false, message: "Voter not found." });
    }

    voter.biometricType = biometricType;
    await voter.save();
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Cast Secure Blockchain Ballot Vote
export async function castVote(req, res) {
  const { candidateId } = req.body;
  const voterId = req.user.userId;
  try {
    const voter = await User.findOne({ userId: voterId, role: "VOTER" });
    if (!voter || voter.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Voter account is suspended or inactive." });
    }

    if (voter.hasVoted) {
      // Increment duplicate attempts
      await DuplicateAttemptsCounter.findOneAndUpdate({}, { $inc: { count: 1 } });
      await logSecurityEvent(`Voter ID ${voterId} blocked: Duplicate voting attempt recorded.`);
      return res.status(400).json({
        success: false,
        message: "Voting Blocked: this voter ID has already cast a vote.",
        duplicate: true
      });
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Candidates Ballot
export async function getCandidates(req, res) {
  try {
    const election = await Election.findOne();
    if (!election || election.status === "NO_ELECTION") {
      return res.json([]);
    }
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Current Election Configuration
export async function getElection(req, res) {
  try {
    const election = await Election.findOne();
    res.json(election);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Published Results
export async function getResults(req, res) {
  try {
    const election = await Election.findOne();
    if (!election || election.status !== "RESULTS_PUBLISHED") {
      return res.status(403).json({ success: false, message: "Results are not officially published yet." });
    }
    const candidates = await Candidate.find().sort({ votes: -1 });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Blockchain Ledger
export async function getLedger(req, res) {
  try {
    const ledger = await LedgerBlock.find().sort({ blockId: 1 });
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
