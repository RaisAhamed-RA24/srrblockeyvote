
const { pool } = require("../config/database");

const getAdminActivityLogs = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
        );

        const offset = (page - 1) * limit;

        const [logs] = await pool.query(
            `SELECT
                l.id,
                l.admin_id AS adminId,
                u.name AS adminName,
                l.action,
                l.entity_type AS entityType,
                l.entity_id AS entityId,
                l.description,
                l.ip_address AS ipAddress,
                l.created_at AS createdAt
             FROM admin_activity_logs l
             LEFT JOIN users u ON u.id = l.admin_id
             ORDER BY l.created_at DESC, l.id DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM admin_activity_logs`
        );

        const total = Number(countRows[0].total);

        return res.json({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Get admin activity logs error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve activity logs"
        });
    }
};

module.exports = {
    getAdminActivityLogs
};
