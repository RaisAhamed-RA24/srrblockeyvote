
const { pool } = require("../config/database");
const { logAdminActivity } = require("../utils/activityLogger");

// CREATE ELECTION
const createElection = async (req, res) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        const {
            title,
            description,
            start_time,
            end_time
        } = req.body;

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Election title is required"
            });
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Description must be text"
            });
        }

        const normalizedTitle = title.trim();
        const normalizedDescription =
            typeof description === "string" && description.trim()
                ? description.trim()
                : null;

        await connection.beginTransaction();
        transactionStarted = true;

        const [result] = await connection.query(
            `INSERT INTO elections
                (title, description, start_time, end_time, status)
             VALUES (?, ?, ?, ?, 'DRAFT')`,
            [
                normalizedTitle,
                normalizedDescription,
                start_time || null,
                end_time || null
            ]
        );

        const logged = await logAdminActivity({
            adminId: req.user.id,
            action: "ELECTION_CREATED",
            entityType: "ELECTION",
            entityId: result.insertId,
            description: `Created election: ${normalizedTitle}`,
            ipAddress: req.ip,
            connection
        });

        if (!logged) {
            throw new Error("Failed to record election creation in activity log");
        }

        await connection.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Election created successfully",
            electionId: result.insertId
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Election creation rollback failed:", rollbackError);
            }
        }

        console.error("Create election failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create election"
        });
    } finally {
        connection.release();
    }
};


// GET ALL ELECTIONS
const getElections = async (req, res) => {
    try {
        const [elections] = await pool.query(
            `SELECT *
             FROM elections
             ORDER BY created_at DESC`
        );

        return res.json({
            success: true,
            elections
        });
    } catch (error) {
        console.error("Fetch elections failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch elections"
        });
    }
};


// UPDATE ELECTION STATUS
const updateElectionStatus = async (req, res) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "DRAFT",
            "SCHEDULED",
            "OPEN",
            "CLOSED",
            "RESULTS_RELEASED"
        ];

        if (!/^\d+$/.test(id) || Number(id) < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid election ID"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid election status"
            });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const [elections] = await connection.query(
            `SELECT id, title, status
             FROM elections
             WHERE id = ?
             FOR UPDATE`,
            [Number(id)]
        );

        if (elections.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const election = elections[0];

        if (election.status === status) {
            await connection.rollback();
            transactionStarted = false;

            return res.json({
                success: true,
                message: `Election status is already ${status}`
            });
        }

        await connection.query(
            `UPDATE elections
             SET status = ?
             WHERE id = ?`,
            [status, Number(id)]
        );

        const actionByStatus = {
            DRAFT: "ELECTION_SET_DRAFT",
            SCHEDULED: "ELECTION_SCHEDULED",
            OPEN: "ELECTION_STARTED",
            CLOSED: "ELECTION_ENDED",
            RESULTS_RELEASED: "ELECTION_RESULTS_RELEASED"
        };

        const logged = await logAdminActivity({
            adminId: req.user.id,
            action: actionByStatus[status],
            entityType: "ELECTION",
            entityId: election.id,
            description:
                `Election "${election.title}" status changed from ` +
                `${election.status} to ${status}.`,
            ipAddress: req.ip,
            connection
        });

        if (!logged) {
            throw new Error("Failed to record election status change in activity log");
        }

        await connection.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: `Election status changed to ${status}`
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Election status rollback failed:", rollbackError);
            }
        }

        console.error("Update election status failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to update election"
        });
    } finally {
        connection.release();
    }
};


module.exports = {
    createElection,
    getElections,
    updateElectionStatus
};
