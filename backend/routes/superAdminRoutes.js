import express from "express";
import {
  getAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getAdminAccounts,
  activateAdmin,
  suspendAdmin,
  getSecurityEvents
} from "../controllers/superAdminController.js";
import { auth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

// Apply global superadmin protection
router.use(auth, authorize("SUPER_ADMIN"));

router.get("/superadmin/admin-requests", getAdminRequests);
router.post("/superadmin/admin-requests/:id/approve", approveAdminRequest);
router.post("/superadmin/admin-requests/:id/reject", rejectAdminRequest);

// Active Admin accounts suspension controls
router.get("/superadmin/accounts", getAdminAccounts);
router.post("/superadmin/accounts/:id/activate", activateAdmin);
router.post("/superadmin/accounts/:id/suspend", suspendAdmin);

// Security events logs
router.get("/superadmin/security-events", getSecurityEvents);

export default router;
