
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const electionRoutes = require("./routes/electionRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const voteRoutes = require("./routes/voteRoutes");
const resultRoutes = require("./routes/resultRoutes");
const webauthnRoutes = require("./routes/webauthnRoutes");
const identityRoutes = require("./routes/identityRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/elections", electionRoutes);
app.use("/api/elections", candidateRoutes);
app.use("/api/elections", voteRoutes);
app.use("/api/elections", resultRoutes);
app.use("/api/webauthn", webauthnRoutes);
app.use("/api/identity", identityRoutes);
// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "SRR BlockeyVote backend is running"
    });
});

// Start only after the database connection succeeds
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed because MySQL is unavailable.");
        process.exitCode = 1;
    }
};

startServer();
