const express = require("express");

const {
    getResults
} = require("../controllers/resultController");

const {
    authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/:electionId/results",
    authenticate,
    getResults
);

module.exports = router;