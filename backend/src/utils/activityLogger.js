
const { pool } = require("../config/database");

async function logAdminActivity({
    adminId,
    action,
    entityType,
    entityId = null,
    description,
    ipAddress = null,
    connection = null,
}) {
    const db = connection || pool;

    try {
        await db.query(
            `INSERT INTO admin_activity_logs
                (admin_id, action, entity_type, entity_id,
                 description, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                adminId || null,
                String(action).slice(0, 100),
                String(entityType).slice(0, 50),
                entityId == null ? null : String(entityId).slice(0, 100),
                String(description).slice(0, 500),
                ipAddress ? String(ipAddress).slice(0, 45) : null,
            ]
        );

        return true;
    } catch (error) {
        console.error(
            "Admin activity logging failed:",
            error.message
        );
        return false;
    }
}

module.exports = { logAdminActivity };
