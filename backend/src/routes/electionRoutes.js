const express = require("express");

const {
    createElection,
    getElections,
    updateElectionStatus
} = require("../controllers/electionController");

const {
    authenticate,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/",
    authenticate,
    authorize("ADMIN", "SUPER_ADMIN"),
    createElection
);

router.get(
    "/",
    authenticate,
    getElections
);

router.put(
    "/:id/status",
    authenticate,
    authorize("ADMIN", "SUPER_ADMIN"),
    updateElectionStatus
);

module.exports = router;