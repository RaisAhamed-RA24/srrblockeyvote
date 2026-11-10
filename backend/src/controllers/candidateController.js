
const { pool } = require("../config/database");
const { logAdminActivity } = require("../utils/activityLogger");

// ADD CANDIDATE
const addCandidate = async (req, res) => {
    let connection;
    let transactionStarted = false;

    try {
        const { electionId } = req.params;
        const { name, description } = req.body;

        if (!/^\d+$/.test(String(electionId)) || Number(electionId) < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid election ID"
            });
        }

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Candidate name is required"
            });
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Candidate description must be text"
            });
        }

        const normalizedName = name.trim();
        const normalizedDescription =
            typeof description === "string" && description.trim()
                ? description.trim()
                : null;

        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [elections] = await connection.query(
            `SELECT id, title
             FROM elections
             WHERE id = ?
             FOR UPDATE`,
            [Number(electionId)]
        );

        if (elections.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const [result] = await connection.query(
            `INSERT INTO candidates
                (election_id, name, description)
             VALUES (?, ?, ?)`,
            [
                Number(electionId),
                normalizedName,
                normalizedDescription
            ]
        );

        const logged = await logAdminActivity({
            adminId: req.user.id,
            action: "CANDIDATE_ADDED",
            entityType: "CANDIDATE",
            entityId: result.insertId,
            description:
                `Added candidate "${normalizedName}" to election ` +
                `"${elections[0].title}" (ID ${elections[0].id}).`,
            ipAddress: req.ip,
            connection
        });

        if (!logged) {
            throw new Error(
                "Failed to record candidate creation in activity log"
            );
        }

        await connection.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Candidate added successfully",
            candidateId: result.insertId
        });
    } catch (error) {
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Candidate rollback failed:", rollbackError);
            }
        }

        console.error("Add candidate failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to add candidate"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};


// GET CANDIDATES
const getCandidates = async (req, res) => {
    try {
        const { electionId } = req.params;

        if (!/^\d+$/.test(String(electionId)) || Number(electionId) < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid election ID"
            });
        }

        const [candidates] = await pool.query(
            `SELECT id, name, description
             FROM candidates
             WHERE election_id = ?
             ORDER BY id ASC`,
            [Number(electionId)]
        );

        return res.json({
            success: true,
            candidates
        });
    } catch (error) {
        console.error("Fetch candidates failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch candidates"
        });
    }
};


module.exports = {
    addCandidate,
    getCandidates
};
