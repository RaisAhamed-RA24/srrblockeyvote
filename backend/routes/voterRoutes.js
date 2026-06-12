import express from "express";
import {
  updateBiometrics,
  castVote,
  getCandidates,
  getElection,
  getResults,
  getLedger
} from "../controllers/voterController.js";
import { auth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

// Voter protected actions
router.post("/voter/biometrics", auth, authorize("VOTER"), updateBiometrics);
router.post("/voter/vote", auth, authorize("VOTER"), castVote);

// Voter accessible data (requires auth)
router.get("/voter/candidates", auth, getCandidates);
router.get("/voter/election", auth, getElection);

// Public audit resources (no auth required, matches landing page queries)
router.get("/public/election", getElection);
router.get("/public/results", getResults);
router.get("/public/ledger", getLedger);

export default router;
