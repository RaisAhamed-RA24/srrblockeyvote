import express from "express";
import {
  voterRegister,
  voterLogin,
  adminRegister,
  adminLogin,
  adminOtpVerify,
  superAdminLogin,
  superAdminOtpVerify
} from "../controllers/authController.js";

const router = express.Router();

// Voter auth routes
router.post("/voter/register", voterRegister);
router.post("/voter/login", voterLogin);

// Admin auth routes
router.post("/admin/register", adminRegister);
router.post("/admin/login", adminLogin);
router.post("/admin/login/otp", adminOtpVerify);

// Super Admin auth routes
router.post("/superadmin/login", superAdminLogin);
router.post("/superadmin/login/otp", superAdminOtpVerify);

export default router;
