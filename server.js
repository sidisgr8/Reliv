// server.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Files used for demo persistence (replace with DB in production)
const DATA_DIR = process.env.DATA_DIR || "./data";
const TOKEN_STORE_FILE = path.join(DATA_DIR, "reset_tokens.json");
const CRED_STORE_FILE = path.join(DATA_DIR, "admin_credentials.json");

// Ensure data directory
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Could not create data dir:", e);
  }
}

// Load / save utils
async function loadJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    return {};
  }
}

async function saveJsonSafe(filePath, obj) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2), "utf8");
}

// --- Mail transporter (your existing Gmail config) ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// --- Mock payment route (unchanged) ---
app.post("/create-order", (req, res) => {
  res.json({ id: "order_mock_123456", amount: 50000, currency: "INR" });
});

// --- Send reset email ---
// Expects { to } (email). Responds { ok: true } or { ok: false, message }.
// Generates a secure token, stores SHA-256(token) + expiry server-side.
app.post("/api/send-reset-email", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ ok: false, message: "Missing 'to' (admin email)." });

    // generate secure token (48 hex chars)
    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiry = Date.now() + 1000 * 60 * 15; // 15 minutes

    // persist hash + expiry keyed by email
    const store = await loadJsonSafe(TOKEN_STORE_FILE);
    store[to] = { tokenHash, expiry };
    await saveJsonSafe(TOKEN_STORE_FILE, store);

    // Prepare email
    const frontendBase = process.env.FRONTEND_BASE_URL || "";
    const resetLink = frontendBase ? `${frontendBase.replace(/\/$/, "")}/admin-reset?email=${encodeURIComponent(to)}&token=${token}` : "";
    const subject = "Admin password reset — your recovery code";
    const text = `You (or someone claiming to be you) requested a password reset.\n\nRecovery code: ${token}\n\nThis code expires in 15 minutes.\n${resetLink ? `Or click the link: ${resetLink}\n\n` : ""}If you didn't request this, ignore this email.`;

    const mailOptions = {
      from: `Reliv Reports <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Sent reset email to ${to}`);
    return res.json({ ok: true, message: "Recovery email sent." });
  } catch (err) {
    console.error("Error in /api/send-reset-email:", err);
    return res.status(500).json({ ok: false, message: "Failed to send reset email." });
  }
});

// --- Confirm reset and set new password ---
// Expects { email, token, newPassword }
// Verifies token (by hashing provided token) and expiry, then stores a salted hash of newPassword server-side.
app.post("/api/confirm-reset", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ ok: false, message: "Missing parameters." });

    const store = await loadJsonSafe(TOKEN_STORE_FILE);
    const entry = store[email];
    if (!entry) return res.status(400).json({ ok: false, message: "No reset request found for this email." });

    if (Date.now() > entry.expiry) {
      // cleanup
      delete store[email];
      await saveJsonSafe(TOKEN_STORE_FILE, store);
      return res.status(400).json({ ok: false, message: "Recovery code expired. Request a new one." });
    }

    const inputHash = crypto.createHash("sha256").update(token).digest("hex");
    if (inputHash !== entry.tokenHash) {
      return res.status(400).json({ ok: false, message: "Invalid recovery code." });
    }

    // token valid — store the password hash (use PBKDF2 for demo; use Argon2/bcrypt in production)
    const salt = crypto.randomBytes(16).toString("hex");
    const iterations = 100_000;
    const keyLen = 64;
    const digest = "sha512";
    const derived = crypto.pbkdf2Sync(newPassword, salt, iterations, keyLen, digest).toString("hex");

    const credStore = await loadJsonSafe(CRED_STORE_FILE);
    credStore[email] = {
      algorithm: "pbkdf2",
      salt,
      iterations,
      keyLen,
      digest,
      hash: derived,
      updatedAt: Date.now(),
    };
    await saveJsonSafe(CRED_STORE_FILE, credStore);

    // cleanup token (one-time use)
    delete store[email];
    await saveJsonSafe(TOKEN_STORE_FILE, store);

    console.log(`Password reset for ${email}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/confirm-reset:", err);
    return res.status(500).json({ ok: false, message: "Failed to confirm reset." });
  }
});

// Optional: helper to check credentials (for future server-side login)
// Accepts { email, password } and returns { ok: true } if matches credential store
app.post("/api/check-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, message: "Missing parameters." });
    const credStore = await loadJsonSafe(CRED_STORE_FILE);
    const user = credStore[email];
    if (!user) return res.status(400).json({ ok: false, message: "No such admin." });
    if (user.algorithm !== "pbkdf2") return res.status(500).json({ ok: false, message: "Unsupported algorithm." });

    const derived = crypto.pbkdf2Sync(password, user.salt, user.iterations, user.keyLen, user.digest).toString("hex");
    if (derived === user.hash) return res.json({ ok: true });
    return res.status(401).json({ ok: false, message: "Invalid credentials." });
  } catch (err) {
    console.error("Error in /api/check-login:", err);
    return res.status(500).json({ ok: false, message: "Login check failed." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
