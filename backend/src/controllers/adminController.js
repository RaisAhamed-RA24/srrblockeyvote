
const { pool } = require("../config/database");
const { logAdminActivity } = require("../utils/activityLogger");

const getPendingVoters = async (req, res) => {
    try {
        const [voters] = await pool.query(`
            SELECT
                v.id AS voter_record_id,
                u.id AS user_id,
                u.name,
                u.email,
                u.status
            FROM voters v
            JOIN users u ON v.user_id = u.id
            WHERE u.status = 'PENDING'
              AND u.role = 'VOTER'
        `);

        return res.json({
            success: true,
            voters
        });
    } catch (error) {
        console.error("Get pending voters error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending voters"
        });
    }
};

const approveVoter = async (req, res) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        const { userId } = req.params;
        const numericUserId = Number(userId);

        if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid voter ID"
            });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        // 1. Check that the voter exists and lock the user row.
        const [users] = await connection.query(
            `SELECT id, name, role, status
             FROM users
             WHERE id = ? AND role = 'VOTER'
             FOR UPDATE`,
            [numericUserId]
        );

        if (users.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Voter not found"
            });
        }

        if (users[0].status === "APPROVED") {
            await connection.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "This voter is already approved"
            });
        }

        if (users[0].status === "REJECTED") {
            await connection.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "A rejected voter cannot be approved through this action"
            });
        }

        // 2. Both identity documents must be verified.
        const [identityRows] = await connection.query(
            `SELECT aadhaar_status, voter_id_status
             FROM identity_verifications
             WHERE user_id = ?
             FOR UPDATE`,
            [numericUserId]
        );

        if (
            identityRows.length === 0 ||
            identityRows[0].aadhaar_status !== "VERIFIED" ||
            identityRows[0].voter_id_status !== "VERIFIED"
        ) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(403).json({
                success: false,
                message:
                    "Both Aadhaar and Voter ID must be verified before approving this voter."
            });
        }

        // 3. Ensure the voter record exists and lock it.
        const [voterRows] = await connection.query(
            `SELECT id
             FROM voters
             WHERE user_id = ?
             FOR UPDATE`,
            [numericUserId]
        );

        if (voterRows.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Voter record not found"
            });
        }

        // 4. Approve the user.
        await connection.query(
            `UPDATE users
             SET status = 'APPROVED'
             WHERE id = ? AND role = 'VOTER'`,
            [numericUserId]
        );

        // 5. Generate the internal voter ID.
        const voterId =
            `VR${new Date().getFullYear()}${String(numericUserId).padStart(4, "0")}`;

        await connection.query(
            `UPDATE voters
             SET voter_id = ?,
                 verification_status = 'APPROVED'
             WHERE user_id = ?`,
            [voterId, numericUserId]
        );

        // 6. Record the action in the SAME transaction.
        // If the audit insert fails, roll back the approval too.
        const logged = await logAdminActivity({
            adminId: req.user.id,
            action: "VOTER_APPROVED",
            entityType: "VOTER",
            entityId: numericUserId,
            description: "Admin approved a voter after identity verification.",
            ipAddress: req.ip,
            connection
        });

        if (!logged) {
            throw new Error(
                "Could not record voter approval in the activity log."
            );
        }

        await connection.commit();
        transactionStarted = false;

        return res.json({
            success: true,
            message: "Voter approved successfully",
            voterId
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Rollback error:", rollbackError);
            }
        }

        console.error("Approve voter error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to approve voter"
        });
    } finally {
        connection.release();
    }
};

module.exports = {
    getPendingVoters,
    approveVoter
};
