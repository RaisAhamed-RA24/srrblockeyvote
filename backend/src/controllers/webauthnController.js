
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require("@simplewebauthn/server");

const { pool } = require("../config/database");

const rpName =
    process.env.WEBAUTHN_RP_NAME || "SRR BlockeyVote";

const rpID =
    process.env.WEBAUTHN_RP_ID || "localhost";

const origin =
    process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

// Create or retrieve a user-specific Map.
const getUserMap = (req, mapName) => {
    if (!req.app.locals[mapName]) {
        req.app.locals[mapName] = new Map();
    }

    return req.app.locals[mapName];
};

// ==========================================
// REGISTER BIOMETRIC - OPTIONS
// ==========================================

const registerOptions = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await pool.query(
            `SELECT id, name, email
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        const [credentials] = await pool.query(
            `SELECT credential_id
             FROM webauthn_credentials
             WHERE user_id = ?`,
            [userId]
        );

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userName: user.email,
            userDisplayName: user.name,
            attestationType: "none",
            excludeCredentials: credentials.map((credential) => ({
                id: credential.credential_id,
                transports: ["internal"]
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "required"
            }
        });

        getUserMap(req, "registrationChallenges").set(
            userId,
            options.challenge
        );

        return res.json({
            success: true,
            options
        });

    } catch (error) {
        console.error("BIOMETRIC REGISTRATION OPTIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate biometric registration options"
        });
    }
};

// ==========================================
// REGISTER BIOMETRIC - VERIFY
// ==========================================

const registerVerify = async (req, res) => {
    try {
        const userId = req.user.id;
        const { response } = req.body;

        const challenges = getUserMap(req, "registrationChallenges");
        const expectedChallenge = challenges.get(userId);

        if (!expectedChallenge) {
            return res.status(400).json({
                success: false,
                message: "Registration session expired"
            });
        }

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID
        });

        challenges.delete(userId);

        if (!verification.verified) {
            return res.status(400).json({
                success: false,
                message: "Biometric registration failed"
            });
        }

        const credential = verification.registrationInfo.credential;

        await pool.query(
            `INSERT INTO webauthn_credentials
             (user_id, credential_id, public_key, counter)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                credential_id = VALUES(credential_id),
                public_key = VALUES(public_key),
                counter = VALUES(counter)`,
            [
                userId,
                credential.id,
                Buffer.from(credential.publicKey).toString("base64"),
                credential.counter
            ]
        );

        return res.json({
            success: true,
            message: "Biometric registration successful"
        });

    } catch (error) {
        console.error("BIOMETRIC REGISTRATION VERIFY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Biometric registration verification failed"
        });
    }
};

// ==========================================
// AUTHENTICATE BIOMETRIC - OPTIONS
// ==========================================

const authenticateOptions = async (req, res) => {
    try {
        const userId = req.user.id;

        const [credentials] = await pool.query(
            `SELECT credential_id
             FROM webauthn_credentials
             WHERE user_id = ?`,
            [userId]
        );

        if (credentials.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No biometric registered"
            });
        }

        const options = await generateAuthenticationOptions({
            rpID,
            userVerification: "required",
            allowCredentials: credentials.map((credential) => ({
                id: credential.credential_id,
                transports: ["internal"]
            }))
        });

        getUserMap(req, "authenticationChallenges").set(
            userId,
            options.challenge
        );

        return res.json({
            success: true,
            options
        });

    } catch (error) {
        console.error("BIOMETRIC OPTIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate biometric authentication options"
        });
    }
};

// ==========================================
// AUTHENTICATE BIOMETRIC - VERIFY
// ==========================================

const authenticateVerify = async (req, res) => {
    try {
        const userId = req.user.id;
        const { response } = req.body;

        const challenges = getUserMap(req, "authenticationChallenges");
        const expectedChallenge = challenges.get(userId);

        if (!expectedChallenge) {
            return res.status(400).json({
                success: false,
                message: "Authentication session expired"
            });
        }

        const [credentials] = await pool.query(
            `SELECT credential_id, public_key, counter
             FROM webauthn_credentials
             WHERE user_id = ?`,
            [userId]
        );

        if (credentials.length === 0) {
            challenges.delete(userId);

            return res.status(400).json({
                success: false,
                message: "No biometric registered"
            });
        }

        const storedCredential = credentials[0];

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: storedCredential.credential_id,
                publicKey: Buffer.from(
                    storedCredential.public_key,
                    "base64"
                ),
                counter: Number(storedCredential.counter),
                transports: ["internal"]
            }
        });

        challenges.delete(userId);

        if (!verification.verified) {
            return res.status(400).json({
                success: false,
                message: "Biometric verification failed"
            });
        }

        await pool.query(
            `UPDATE webauthn_credentials
             SET counter = ?
             WHERE user_id = ?`,
            [
                verification.authenticationInfo.newCounter,
                userId
            ]
        );

        // Store successful verification for this user only.
        getUserMap(req, "biometricVerified").set(userId, {
            verifiedAt: Date.now()
        });

        return res.json({
            success: true,
            message: "Biometric verification successful"
        });

    } catch (error) {
        console.error("BIOMETRIC AUTHENTICATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Biometric verification failed"
        });
    }
};

module.exports = {
    registerOptions,
    registerVerify,
    authenticateOptions,
    authenticateVerify
};
        