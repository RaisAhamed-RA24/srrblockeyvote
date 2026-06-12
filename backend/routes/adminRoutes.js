import express from "express";
import {
  getDashboardMetrics,
  getVoterApplications,
  approveVoter,
  rejectVoter,
  getVoterAccounts,
  resetVoterStatus,
  suspendVoter,
  deleteTestVoter,
  generateTestVoters,
  resetTestVoters,
  configureElection,
  addCandidate,
  editCandidate,
  deleteCandidate,
  getLiveResults
} from "../controllers/adminController.js";
import { auth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

// Apply global admin/superadmin route protection
router.use(auth, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/admin/dashboard-metrics", getDashboardMetrics);
router.get("/admin/voter-applications", getVoterApplications);
router.post("/admin/voter-applications/:id/approve", approveVoter);
router.post("/admin/voter-applications/:id/reject", rejectVoter);

// Voter account management
router.get("/admin/voters", getVoterAccounts);
router.post("/admin/voters/:id/reset", resetVoterStatus);
router.post("/admin/voters/:id/suspend", suspendVoter);
router.delete("/admin/voters/:id", deleteTestVoter);
router.post("/admin/voters/generate-test", generateTestVoters);
router.post("/admin/voters/reset-test", resetTestVoters);

// Election lifecycle
router.post("/admin/election", configureElection);

// Candidate management
router.post("/admin/candidates", addCandidate);
router.put("/admin/candidates/:id", editCandidate);
router.delete("/admin/candidates/:id", deleteCandidate);

// Live results monitoring
router.get("/admin/results", getLiveResults);

export default router;
