const express = require("express");

const {
    addCandidate,
    getCandidates
} = require("../controllers/candidateController");

const {
    authenticate,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/:electionId/candidates",
    authenticate,
    authorize("ADMIN", "SUPER_ADMIN"),
    addCandidate
);

router.get(
    "/:electionId/candidates",
    authenticate,
    getCandidates
);

module.exports = router;