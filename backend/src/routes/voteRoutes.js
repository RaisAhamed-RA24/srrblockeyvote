const express = require("express");

const {
    castVote
} = require("../controllers/voteController");

const {
    authenticate,
    authorize
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/:electionId/vote",
    authenticate,
    authorize("VOTER"),
    castVote
);

module.exports = router;