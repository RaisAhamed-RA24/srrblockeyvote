
const { pool } = require("../config/database");
const {
    contract,
    account
} = require("../config/blockchain");

// User-specific temporary biometric verification.
// Shared with webauthnController through app.locals.
const getBiometricMap = (req) => {
    if (!req.app.locals.biometricVerified) {
        req.app.locals.biometricVerified = new Map();
    }

    return req.app.locals.biometricVerified;
};

const castVote = async (req, res) => {
    try {
        const { electionId } = req.params;
        const { candidateId } = req.body;
        const userId = req.user.id;

        if (!candidateId) {
            return res.status(400).json({
                success: false,
                message: "Candidate ID is required"
            });
        }

        // Check user-specific biometric verification.
        const biometricMap = getBiometricMap(req);
        const biometricVerification = biometricMap.get(userId);

        if (!biometricVerification) {
            return res.status(403).json({
                success: false,
                message: "Biometric verification required before voting"
            });
        }

        if (Date.now() - biometricVerification.verifiedAt > 2 * 60 * 1000) {
            biometricMap.delete(userId);

            return res.status(403).json({
                success: false,
                message: "Biometric verification expired. Please verify again."
            });
        }

        // Get voter.
        const [voters] = await pool.query(
            `SELECT id, voter_id, verification_status
             FROM voters
             WHERE user_id = ?`,
            [userId]
        );

        if (voters.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Voter record not found"
            });
        }

        const voter = voters[0];

        if (voter.verification_status !== "APPROVED") {
            return res.status(403).json({
                success: false,
                message: "Voter is not approved"
            });
        }

        // Validate election.
        const [elections] = await pool.query(
            `SELECT id, status
             FROM elections
             WHERE id = ?`,
            [electionId]
        );

        if (elections.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        if (elections[0].status !== "OPEN") {
            return res.status(403).json({
                success: false,
                message: "Election is not open"
            });
        }

        // Ensure candidate belongs to this election.
        const [candidates] = await pool.query(
            `SELECT id
             FROM candidates
             WHERE id = ? AND election_id = ?`,
            [candidateId, electionId]
        );

        if (candidates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate for this election"
            });
        }

        // Check whether this voter already voted.
        const [existingVotes] = await pool.query(
            `SELECT id
             FROM votes
             WHERE voter_id = ? AND election_id = ?`,
            [voter.id, electionId]
        );

        if (existingVotes.length > 0) {
            biometricMap.delete(userId);

            return res.status(409).json({
                success: false,
                message: "You have already voted in this election"
            });
        }

        // Record the transaction on blockchain.
        const blockchainTx = await contract.methods
            .recordVote(electionId, candidateId)
            .send({
                from: account.address,
                gas: 300000
            });

        const transactionHash = blockchainTx.transactionHash;

        // Save the corresponding application record.
        const [result] = await pool.query(
            `INSERT INTO votes
             (voter_id, election_id, candidate_id, transaction_hash)
             VALUES (?, ?, ?, ?)`,
            [
                voter.id,
                electionId,
                candidateId,
                transactionHash
            ]
        );

        // Require fresh biometric verification for the next attempt.
        biometricMap.delete(userId);

        return res.status(201).json({
            success: true,
            message: "Vote cast successfully",
            voteId: result.insertId,
            transactionHash
        });

    } catch (error) {
        console.error("VOTE ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "You have already voted in this election"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to cast vote"
        });
    }
};

module.exports = {
    castVote
};
