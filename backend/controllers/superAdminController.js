import { User, AdminRequest, SecurityEvent } from "../models.js";

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

// Get pending admin access requests
export async function getAdminRequests(req, res) {
  try {
    const requests = await AdminRequest.find({ status: "PENDING" });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Approve Admin Access Request
export async function approveAdminRequest(req, res) {
  const { id } = req.params;
  const { reauthCode } = req.body;
  const superAdminId = req.user.userId;
  try {
    if (reauthCode !== "999999") {
      await logSecurityEvent("Super Admin critical action blocked by failed re-authentication.");
      return res.status(403).json({ success: false, message: "Super Admin critical action blocked by failed re-authentication." });
    }

    const reqRecord = await AdminRequest.findById(id);
    if (!reqRecord) return res.status(404).json({ success: false, message: "Request not found." });

    reqRecord.status = "APPROVED";
    await reqRecord.save();

    const activeAdminsCount = await User.countDocuments({ role: "ADMIN" });
    const padId = String(activeAdminsCount + 1).padStart(4, "0");
    const adminId = `ADM2026${padId}`;

    const newAdmin = await User.create({
      userId: adminId,
      name: reqRecord.name,
      email: reqRecord.email,
      passwordHash: reqRecord.password, // already hashed during register request
      role: "ADMIN",
      status: "ACTIVE"
    });

    await logSecurityEvent(`SUPER_ADMIN approved admin request for ${reqRecord.email}.`);
    res.json({ success: true, admin: newAdmin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Reject Admin Access Request
export async function rejectAdminRequest(req, res) {
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
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Managed Admins Accounts
export async function getAdminAccounts(req, res) {
  try {
    const adminList = await User.find({ role: "ADMIN" });
    res.json(adminList);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Activate Admin Account
export async function activateAdmin(req, res) {
  const { id } = req.params; // adminId
  try {
    const admin = await User.findOneAndUpdate({ userId: id, role: "ADMIN" }, { status: "ACTIVE" }, { new: true });
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Suspend Admin Account
export async function suspendAdmin(req, res) {
  const { id } = req.params; // adminId
  try {
    const admin = await User.findOneAndUpdate({ userId: id, role: "ADMIN" }, { status: "SUSPENDED" }, { new: true });
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get Security Audit Logs
export async function getSecurityEvents(req, res) {
  try {
    const events = await SecurityEvent.find().sort({ _id: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
