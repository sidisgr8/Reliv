// setupAdmin.js
// A one-time script to create your first admin user in MongoDB.

import { MongoClient } from 'mongodb';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
// IMPORTANT: Change these values to your desired admin credentials
const ADMIN_EMAIL = "ramanoswal13@gmail.com";
const ADMIN_PASSWORD = "admin123";

// --- SCRIPT LOGIC ---
async function setupAdmin() {
  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error("❌ MONGODB_URI not found in .env file. Please add it.");
    process.exit(1);
  }

  const client = new MongoClient(mongoUrl);
  console.log("Connecting to MongoDB Atlas...");

  try {
    await client.connect();
    const db = client.db("reliv");
    const adminsCollection = db.collection("admins");
    console.log("✅ Successfully connected to MongoDB.");

    const existingAdmin = await adminsCollection.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log(`⚠️ Admin user with email '${ADMIN_EMAIL}' already exists. No changes made.`);
      return;
    }

    console.log(`Creating new admin user: ${ADMIN_EMAIL}`);

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(ADMIN_PASSWORD, salt, 100000, 64, "sha512").toString("hex");

    const adminDocument = {
      email: ADMIN_EMAIL,
      salt: salt,
      hash: hash,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await adminsCollection.insertOne(adminDocument);
    console.log("✅ Admin user created successfully!");
    console.log("You can now log in with the credentials you provided in this script.");

  } catch (err) {
    console.error("❌ An error occurred during setup:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

setupAdmin();
