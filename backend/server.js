import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import routes from "./routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

app.use(express.json());

// Connect to Database
connectDB();

// API routes
app.use("/api", routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
