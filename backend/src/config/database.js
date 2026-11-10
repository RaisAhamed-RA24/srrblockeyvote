const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "srr_blockeyvote",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log("MySQL connected successfully");
        connection.release();
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        throw error;
    }
};

module.exports = {
    pool,
    connectDB
};