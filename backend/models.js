import mongoose from "mongoose";
import { MockModel } from "./mockDb.js";

// 1. Unified User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "VOTER"], required: true },
  status: { type: String, enum: ["ACTIVE", "PENDING", "SUSPENDED"], default: "ACTIVE" },
  biometricType: { type: String, default: "Fingerprint" },
  hasVoted: { type: Boolean, default: false }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// 2. Admin Request Schema
const adminRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  organization: { type: String, required: true },
  identityProof: { type: String, default: "" }, // Base64 or filename
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  rejectionReason: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

// 3. Voter Application Schema
const voterApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  dob: { type: String, required: true },
  address: { type: String, required: true },
  identityProof: { type: String, default: "" }, // Base64 or filename
  profilePhoto: { type: String, default: "" }, // Base64 or filename
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  rejectionReason: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

// 4. Election Schema
const electionSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["NO_ELECTION", "DRAFT", "OPEN", "CLOSED", "RESULTS_PUBLISHED"], default: "NO_ELECTION" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" }
});

// 5. Candidate Schema
const candidateSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  symbol: { type: String, required: true },
  manifesto: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

// 6. Vote Schema
const voteSchema = new mongoose.Schema({
  voteId: { type: String, required: true },
  electionId: { type: String, default: "1" },
  voterId: { type: String, required: true },
  candidateId: { type: String, required: true },
  timestamp: { type: String, required: true },
  blockHash: { type: String, required: true }
});

// 7. Ledger Block Schema
const ledgerBlockSchema = new mongoose.Schema({
  blockId: { type: Number, required: true },
  voteId: { type: String, required: true },
  candidateId: { type: String, required: true },
  timestamp: { type: String, required: true },
  previousHash: { type: String, required: true },
  currentHash: { type: String, required: true }
});

// 8. Security Event Schema
const securityEventSchema = new mongoose.Schema({
  message: { type: String, required: true },
  time: { type: String, default: () => new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) }
});

// Helper for Mock DB fallback Proxy
function getModel(modelName, mongooseModel) {
  const mockModel = new MockModel(modelName);
  
  const targetFn = function (data) {
    if (global.useMockDb) {
      return mockModel.createInstance(data);
    }
    return new mongooseModel(data);
  };

  return new Proxy(targetFn, {
    get(target, prop) {
      const source = global.useMockDb ? mockModel : mongooseModel;
      const val = source[prop];
      if (typeof val === "function") {
        return val.bind(source);
      }
      return val;
    },
    construct(target, args) {
      if (global.useMockDb) {
        return mockModel.createInstance(args[0]);
      }
      return new mongooseModel(...args);
    }
  });
}

// Initialize Mongoose Models
const mongooseUser = mongoose.model("User", userSchema);
const mongooseAdminRequest = mongoose.model("AdminRequest", adminRequestSchema);
const mongooseVoterApplication = mongoose.model("VoterApplication", voterApplicationSchema);
const mongooseElection = mongoose.model("Election", electionSchema);
const mongooseCandidate = mongoose.model("Candidate", candidateSchema);
const mongooseVote = mongoose.model("Vote", voteSchema);
const mongooseLedgerBlock = mongoose.model("LedgerBlock", ledgerBlockSchema);
const mongooseSecurityEvent = mongoose.model("SecurityEvent", securityEventSchema);
const mongooseDuplicateAttemptsCounter = mongoose.model("DuplicateAttemptsCounter", new mongoose.Schema({
  count: { type: Number, default: 0 }
}));

// Export Proxy Wrapped Models
export const User = getModel("User", mongooseUser);
export const AdminRequest = getModel("AdminRequest", mongooseAdminRequest);
export const VoterApplication = getModel("VoterApplication", mongooseVoterApplication);
export const Election = getModel("Election", mongooseElection);
export const Candidate = getModel("Candidate", mongooseCandidate);
export const Vote = getModel("Vote", mongooseVote);
export const LedgerBlock = getModel("LedgerBlock", mongooseLedgerBlock);
export const SecurityEvent = getModel("SecurityEvent", mongooseSecurityEvent);
export const DuplicateAttemptsCounter = getModel("DuplicateAttemptsCounter", mongooseDuplicateAttemptsCounter);
