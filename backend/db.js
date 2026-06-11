import mongoose from "mongoose";
import { Admin, AdminRequest, VoterApplication, Voter, Election, DuplicateAttemptsCounter } from "./models.js";

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
  // Seed Admins
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    await Admin.create([
      {
        adminId: "SA-0001",
        name: "SRR Super Admin",
        email: "super@blockeyvote.gov",
        password: "super123",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        createdBy: "SYSTEM",
        createdAt: "2026-01-01"
      },
      {
        adminId: "ADM20260001",
        name: "Election Admin",
        email: "admin@blockeyvote.gov",
        password: "admin123",
        role: "ADMIN",
        status: "ACTIVE",
        createdBy: "SA-0001",
        createdAt: "2026-06-01"
      }
    ]);
    console.log("Seeded initial admins.");
  }

  // Seed Admin Requests
  const requestCount = await AdminRequest.countDocuments();
  if (requestCount === 0) {
    await AdminRequest.create([
      {
        name: "Priya Nair",
        email: "priya@ieee.org",
        mobile: "9000011111",
        organization: "IEEE Student Chapter",
        password: "admin123",
        status: "PENDING",
        createdAt: "2026-06-07"
      }
    ]);
    console.log("Seeded initial admin request.");
  }

  // Seed Voter Applications
  const appCount = await VoterApplication.countDocuments();
  if (appCount === 0) {
    await VoterApplication.create([
      {
        name: "Ravi Kumar",
        email: "ravi@example.com",
        mobile: "9876543210",
        status: "PENDING",
        date: "2026-06-01"
      },
      {
        name: "Meera Shah",
        email: "meera@example.com",
        mobile: "9876500011",
        status: "PENDING",
        date: "2026-06-03"
      }
    ]);
    console.log("Seeded initial voter applications.");
  }

  // Seed Voters
  const voterCount = await Voter.countDocuments();
  if (voterCount === 0) {
    await Voter.create([
      {
        voterId: "VTR20260001",
        name: "Asha Raman",
        email: "asha@example.com",
        password: "voter123",
        biometricType: "Fingerprint",
        hasVoted: false,
        status: "ACTIVE",
        isTest: false
      }
    ]);
    console.log("Seeded initial voter.");
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
