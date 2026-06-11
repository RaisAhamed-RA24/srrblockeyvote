import mongoose from "mongoose";

const adminRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  organization: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  rejectionReason: { type: String, default: "" }
});

const adminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["SUPER_ADMIN", "ADMIN"], required: true },
  status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
  createdBy: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null }
});

const voterApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) }
});

const voterSchema = new mongoose.Schema({
  voterId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  biometricType: { type: String, default: "Fingerprint" },
  hasVoted: { type: Boolean, default: false },
  status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
  isTest: { type: Boolean, default: false }
});

const electionSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  status: { type: String, enum: ["NO_ELECTION", "DRAFT", "OPEN", "CLOSED", "RESULTS_PUBLISHED"], default: "NO_ELECTION" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" }
});

const candidateSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  party: { type: String, required: true },
  symbol: { type: String, required: true },
  manifesto: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const voteSchema = new mongoose.Schema({
  voteId: { type: String, required: true },
  electionId: { type: String, default: "1" },
  voterId: { type: String, required: true },
  candidateId: { type: String, required: true },
  timestamp: { type: String, required: true },
  blockHash: { type: String, required: true }
});

const ledgerBlockSchema = new mongoose.Schema({
  blockId: { type: Number, required: true },
  voteId: { type: String, required: true },
  candidateId: { type: String, required: true },
  timestamp: { type: String, required: true },
  previousHash: { type: String, required: true },
  currentHash: { type: String, required: true }
});

const securityEventSchema = new mongoose.Schema({
  message: { type: String, required: true },
  time: { type: String, default: () => new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) }
});

import { MockModel } from "./mockDb.js";

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

const mongooseAdminRequest = mongoose.model("AdminRequest", adminRequestSchema);
const mongooseAdmin = mongoose.model("Admin", adminSchema);
const mongooseVoterApplication = mongoose.model("VoterApplication", voterApplicationSchema);
const mongooseVoter = mongoose.model("Voter", voterSchema);
const mongooseElection = mongoose.model("Election", electionSchema);
const mongooseCandidate = mongoose.model("Candidate", candidateSchema);
const mongooseVote = mongoose.model("Vote", voteSchema);
const mongooseLedgerBlock = mongoose.model("LedgerBlock", ledgerBlockSchema);
const mongooseSecurityEvent = mongoose.model("SecurityEvent", securityEventSchema);
const mongooseDuplicateAttemptsCounter = mongoose.model("DuplicateAttemptsCounter", new mongoose.Schema({
  count: { type: Number, default: 0 }
}));

export const AdminRequest = getModel("AdminRequest", mongooseAdminRequest);
export const Admin = getModel("Admin", mongooseAdmin);
export const VoterApplication = getModel("VoterApplication", mongooseVoterApplication);
export const Voter = getModel("Voter", mongooseVoter);
export const Election = getModel("Election", mongooseElection);
export const Candidate = getModel("Candidate", mongooseCandidate);
export const Vote = getModel("Vote", mongooseVote);
export const LedgerBlock = getModel("LedgerBlock", mongooseLedgerBlock);
export const SecurityEvent = getModel("SecurityEvent", mongooseSecurityEvent);
export const DuplicateAttemptsCounter = getModel("DuplicateAttemptsCounter", mongooseDuplicateAttemptsCounter);

