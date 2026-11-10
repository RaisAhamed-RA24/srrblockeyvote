
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// REGISTER
const register = async (req, res) => {
    let connection;

    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        // Get database connection
        connection = await pool.getConnection();

        // Start transaction
        await connection.beginTransaction();

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const [existingUser] = await connection.query(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existingUser.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await connection.query(
            `INSERT INTO users (name, email, password, role, status)
             VALUES (?, ?, ?, 'VOTER', 'PENDING')`,
            [name.trim(), normalizedEmail, hashedPassword]
        );

        // Create voter record
        await connection.query(
            `INSERT INTO voters (user_id)
             VALUES (?)`,
            [result.insertId]
        );

        // Commit transaction
        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Registration successful. Waiting for admin approval.",
            userId: result.insertId
        });

    } catch (error) {
        // Roll back both inserts if registration fails
        if (connection) {
            await connection.rollback().catch(() => {});
        }

        console.error("Registration failed:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });

    } finally {
        // Always release the connection
        if (connection) {
            connection.release();
        }
    }
};


// LOGIN

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Block rejected accounts, but allow pending voters to log in
        // and complete their identity verification.
        if (
            user.role === "VOTER" &&
            user.status === "REJECTED"
        ) {
            return res.status(403).json({
                success: false,
                message: "Your voter account has been rejected. Please contact the administrator."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error("Login failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};



module.exports = {
    register,
    login
};
