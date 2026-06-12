import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, VoterApplication, AdminRequest, SecurityEvent } from "../models.js";

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

// Generate Access Token
function generateToken(user) {
  const secret = process.env.JWT_SECRET || "srr_blockeyvote_secret_key_2026";
  return jwt.sign({ userId: user.userId, role: user.role }, secret, { expiresIn: "1h" });
}

/* ==========================================================================
   VOTER AUTHENTICATION
   ========================================================================== */

// Voter Register (Application Submission)
export async function voterRegister(req, res) {
  const { name, email, mobile, dob, address, identityProof, profilePhoto } = req.body;
  try {
    const existingApp = await VoterApplication.findOne({ email });
    const existingUser = await User.findOne({ email });
    if (existingApp || existingUser) {
      return res.status(400).json({ success: false, message: "An application or voter account with this email already exists." });
    }

    const application = await VoterApplication.create({
      name,
      email,
      mobile,
      dob,
      address,
      identityProof,
      profilePhoto,
      status: "PENDING"
    });
    res.status(201).json({ success: true, message: "Registration request submitted. Awaiting Admin approval.", application });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Voter Login
export async function voterLogin(req, res) {
  const { voterId, password } = req.body;
  try {
    const user = await User.findOne({ userId: voterId, role: "VOTER" });
    if (!user) {
      return res.status(401).json({ success: false, message: "Voter ID not registered or invalid." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: `Access denied. Voter account is ${user.status}.` });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Success: Generate Session Token
    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        biometricType: user.biometricType,
        hasVoted: user.hasVoted
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/* ==========================================================================
   ADMIN & SUPER ADMIN LOGIN (MFA-ENABLED)
   ========================================================================== */

// Helper: Handle Admin Lockout checks
async function handleLockout(user, role, res) {
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    return res.status(403).json({
      success: false,
      message: "Account temporarily locked after repeated failed attempts. Try again in one minute.",
      locked: true
    });
  }
  return null;
}

// Helper: Record Failed Login Attempt
async function recordFailedAttempt(user, role) {
  // We use temporary fields stored locally or in schema properties.
  // Since we merged everything to User, we can set failedAttempts and lockedUntil directly.
  user.failedAttempts = (user.failedAttempts || 0) + 1;
  if (user.failedAttempts >= 3) {
    user.lockedUntil = new Date(Date.now() + 60000); // 1-minute lockout
    await logSecurityEvent(`${role === "SUPER_ADMIN" ? "Super Admin" : "Election Admin"} locked for repeated failed login attempts.`);
  }
  await user.save();
}

// Admin Register (Access Request Submission)
export async function adminRegister(req, res) {
  const { name, email, mobile, organization, identityProof, password } = req.body;
  try {
    const existingReq = await AdminRequest.findOne({ email });
    const existingUser = await User.findOne({ email });
    if (existingReq || existingUser) {
      return res.status(400).json({ success: false, message: "An admin request or user account with this email already exists." });
    }

    // Hash request password temporarily, so it remains secure
    const passwordHash = await bcrypt.hash(password, 10);

    const request = await AdminRequest.create({
      name,
      email,
      mobile,
      organization,
      identityProof,
      password: passwordHash, // stored hashed
      status: "PENDING"
    });
    res.status(201).json({ success: true, message: "Admin credentials request submitted. Awaiting Super Admin approval.", request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Admin / Super Admin Password Check Login
export async function adminLogin(req, res) {
  const { adminId, password } = req.body;
  try {
    const user = await User.findOne({ userId: adminId, role: "ADMIN" });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials or account is not ACTIVE." });
    }

    const lockoutRes = await handleLockout(user, "ADMIN", res);
    if (lockoutRes) return;

    if (user.status !== "ACTIVE") {
      return res.status(401).json({ success: false, message: "Account is not active." });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await recordFailedAttempt(user, "ADMIN");
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Success password: requires OTP
    await logSecurityEvent(`ADMIN password verified for ${adminId}; OTP required.`);
    res.json({ success: true, requiresOTP: true, adminId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Admin OTP verification
export async function adminOtpVerify(req, res) {
  const { adminId, otp } = req.body;
  try {
    const user = await User.findOne({ userId: adminId, role: "ADMIN" });
    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Session expired or admin account disabled." });
    }

    if (otp !== "123456") {
      await logSecurityEvent(`ADMIN OTP failed for ${adminId}.`);
      return res.status(401).json({ success: false, message: "Invalid OTP. Admin login blocked." });
    }

    // Reset failed login stats
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = generateToken(user);
    await logSecurityEvent(`ADMIN ${adminId} completed MFA login.`);
    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Super Admin Password Check Login
export async function superAdminLogin(req, res) {
  const { superAdminId, password } = req.body;
  try {
    const user = await User.findOne({ userId: superAdminId, role: "SUPER_ADMIN" });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid SUPER_ADMIN credentials or account is not ACTIVE." });
    }

    const lockoutRes = await handleLockout(user, "SUPER_ADMIN", res);
    if (lockoutRes) return;

    if (user.status !== "ACTIVE") {
      return res.status(401).json({ success: false, message: "Super Admin account is suspended." });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await recordFailedAttempt(user, "SUPER_ADMIN");
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Success password: requires OTP
    await logSecurityEvent(`SUPER_ADMIN password verified for ${superAdminId}; OTP required.`);
    res.json({ success: true, requiresOTP: true, superAdminId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Super Admin OTP verification
export async function superAdminOtpVerify(req, res) {
  const { superAdminId, otp } = req.body;
  try {
    const user = await User.findOne({ userId: superAdminId, role: "SUPER_ADMIN" });
    if (!user || user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Session expired or Super Admin account disabled." });
    }

    if (otp !== "654321") {
      await logSecurityEvent(`SUPER_ADMIN OTP failed for ${superAdminId}.`);
      return res.status(401).json({ success: false, message: "Invalid OTP. Super Admin login blocked." });
    }

    // Reset failed login stats
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = generateToken(user);
    await logSecurityEvent(`SUPER_ADMIN ${superAdminId} completed MFA login.`);
    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
