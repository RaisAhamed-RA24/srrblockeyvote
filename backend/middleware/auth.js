import jwt from "jsonwebtoken";
import { User } from "../models.js";

export async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Access denied. No session token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "srr_blockeyvote_secret_key_2026";
    const decoded = jwt.verify(token, secret);
    
    // Fetch user from DB to ensure they exist and status is ACTIVE
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(401).json({ success: false, message: "User session not found." });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: `Access suspended. Account status: ${user.status}.` });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Session expired or invalid token." });
  }
}
