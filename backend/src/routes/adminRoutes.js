
const express = require("express");

const {
    getPendingVoters,
    approveVoter
} = require("../controllers/adminController");

const {
    getAdminActivityLogs
} = require("../controllers/activityLogController");

const {
    authenticate,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/voters/pending",
    authenticate,
    authorize("ADMIN", "SUPER_ADMIN"),
    getPendingVoters
);

router.put(
    "/voters/:userId/approve",
    authenticate,
    authorize("ADMIN", "SUPER_ADMIN"),
    approveVoter
);

router.get(
    "/activity-logs",
    authenticate,
    authorize("ADMIN", "SUPER_ADMIN"),
    getAdminActivityLogs
);

module.exports = router;
