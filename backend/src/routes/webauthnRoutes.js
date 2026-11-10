const express = require("express");

const {
    registerOptions,
    registerVerify,
    authenticateOptions,
    authenticateVerify
} = require("../controllers/webauthnController");
const {
    authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/register/options",
    authenticate,
    registerOptions
);

router.post(
    "/register/verify",
    authenticate,
    registerVerify
);
router.post(
    "/authenticate/options",
    authenticate,
    authenticateOptions
);

router.post(
    "/authenticate/verify",
    authenticate,
    authenticateVerify
);
module.exports = router;