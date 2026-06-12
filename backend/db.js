import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, AdminRequest, VoterApplication, Election, DuplicateAttemptsCounter } from "./models.js";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/blockeyvote";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log("Connected to MongoDB successfully.");
    global.useMockDb = false;
    await seedData();
  } catch (error) {
    console.warn("\n======================================================================");
    console.warn("WARNING: MongoDB connection failed (ECONNREFUSED).");
    console.warn("Falling back to local file-based mock database (mock_db.json).");
    console.warn("======================================================================\n");
    global.useMockDb = true;
    await seedData();
  }
}

async function seedData() {
  // Seed Users (Unified collection)
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const superAdminHash = bcrypt.hashSync("super123", 10);
    const adminHash = bcrypt.hashSync("admin123", 10);
    const voterHash = bcrypt.hashSync("voter123", 10);

    await User.create([
      {
        userId: "SA0001",
        name: "SRR Super Admin",
        email: "super@blockeyvote.gov",
        passwordHash: superAdminHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE"
      },
      {
        userId: "ADM20260001",
        name: "Election Admin",
        email: "admin@blockeyvote.gov",
        passwordHash: adminHash,
        role: "ADMIN",
        status: "ACTIVE"
      },
      {
        userId: "VTR20260001",
        name: "Asha Raman",
        email: "asha@example.com",
        passwordHash: voterHash,
        role: "VOTER",
        status: "ACTIVE",
        biometricType: "Fingerprint",
        hasVoted: false
      }
    ]);
    console.log("Seeded initial users (Super Admin, Admin, Voter) with hashed passwords.");
  }

  // Seed Admin Requests
  const requestCount = await AdminRequest.countDocuments();
  if (requestCount === 0) {
    const reqPasswordHash = bcrypt.hashSync("admin123", 10);
    await AdminRequest.create([
      {
        name: "Priya Nair",
        email: "priya@ieee.org",
        mobile: "9000011111",
        organization: "IEEE Student Chapter",
        password: reqPasswordHash, // hashed
        status: "PENDING"
      }
    ]);
    console.log("Seeded initial pending admin request.");
  }

  // Seed Voter Applications
  const appCount = await VoterApplication.countDocuments();
  if (appCount === 0) {
    await VoterApplication.create([
      {
        name: "Ravi Kumar",
        email: "ravi@example.com",
        mobile: "9876543210",
        dob: "1998-05-15",
        address: "123 Main Street, Bangalore",
        status: "PENDING"
      },
      {
        name: "Meera Shah",
        email: "meera@example.com",
        mobile: "9876500011",
        dob: "2000-11-20",
        address: "456 Park Avenue, Mumbai",
        status: "PENDING"
      }
    ]);
    console.log("Seeded initial pending voter applications.");
  }

  // Seed Election
  const electionCount = await Election.countDocuments();
  if (electionCount === 0) {
    await Election.create({
      title: "",
      description: "",
      status: "NO_ELECTION",
      startDate: "",
      endDate: ""
    });
    console.log("Seeded default election.");
  }

  // Seed Duplicate Counter
  const counterCount = await DuplicateAttemptsCounter.countDocuments();
  if (counterCount === 0) {
    await DuplicateAttemptsCounter.create({ count: 0 });
    console.log("Seeded duplicate counter.");
  }
}
