// server.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { google } from 'googleapis';
import { MongoClient } from 'mongodb'; // Import MongoClient

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- MongoDB Atlas Connection Setup ---
const mongoUrl = process.env.MONGODB_URI; // Make sure your .env file has this variable
const client = new MongoClient(mongoUrl);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db('reliv'); // This will use (or create) a database named 'reliv'
    console.log("✅ Successfully connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

connectDB();


// --- Existing File-based Persistence for Admin/Reset ---
const DATA_DIR = process.env.DATA_DIR || "./data";
const TOKEN_STORE_FILE = path.join(DATA_DIR, "reset_tokens.json");
const CRED_STORE_FILE = path.join(DATA_DIR, "admin_credentials.json");
const SERVICE_ACCOUNT_KEY_PATH = path.join(DATA_DIR, 'service-account-key.json');


// --- Helper Functions (Unchanged) ---

function assessBP(sys, dia) {
  const s = Number(sys),
    d = Number(dia);
  if (!s || !d) return { label: "—", advice: "No BP values provided." };
  if (s < 120 && d < 80)
    return { label: "Normal", advice: "Great! Keep up a healthy lifestyle." };
  if (s < 130 && d < 80)
    return {
      label: "Elevated",
      advice: "Monitor regularly; consider diet/exercise.",
    };
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89))
    return {
      label: "Stage 1 Hypertension",
      advice: "Consult a clinician; lifestyle changes recommended.",
    };
  if (s >= 140 || d >= 90)
    return {
      label: "Stage 2 Hypertension",
      advice: "Seek medical advice soon.",
    };
  return { label: "—", advice: "Check values." };
}
function assessSpO2(spo2) {
  const v = Number(spo2);
  if (!v) return { label: "—", advice: "No SpO₂ value provided." };
  if (v >= 95)
    return {
      label: "Normal",
      advice: "Oxygen saturation is within normal range.",
    };
  if (v >= 90)
    return {
      label: "Borderline",
      advice: "Monitor; if symptoms occur, contact a clinician.",
    };
  return { label: "Low", advice: "Low oxygen level; seek care if persistent." };
}
function assessPulse(pulse) {
  const v = Number(pulse);
  if (!v) return { label: "—", advice: "No pulse value provided." };
  if (v >= 60 && v <= 100)
    return {
      label: "Normal",
      advice: "Resting heart rate is within normal range.",
    };
  if (v < 60)
    return { label: "Low", advice: "Could be normal for athletes; else, monitor." };
  return {
    label: "High",
    advice: "Tachycardia; consider rest and consult if persistent.",
  };
}
function assessTempF(t) {
  const v = Number(t);
  if (!v) return { label: "—", advice: "No temperature provided." };
  if (v < 97)
    return { label: "Low", advice: "Slightly low; ensure warmth and re-check." };
  if (v <= 99) return { label: "Normal", advice: "Within normal range." };
  if (v < 100.4)
    return { label: "Elevated", advice: "Mild elevation; monitor." };
  return { label: "Fever", advice: "Possible fever; consider medical advice." };
}
function getSnellenEquivalent(line) {
  const lines = {
    1: 200,
    2: 100,
    3: 70,
    4: 50,
    5: 40,
    6: 30,
    7: 25,
    8: 20,
    9: 15,
  };
  return lines[line] || "—";
}
function assessEyes(left, right) {
  if (!left && !right)
    return { summary: "—", note: "No eyesight input provided." };
  return {
    summary: `Left: 20/${getSnellenEquivalent(
      left
    )}, Right: 20/${getSnellenEquivalent(right)}`,
    note: "This is a basic screening. Smaller line numbers indicate better acuity.",
  };
}

// --- PDF Generation Logic (Unchanged) ---
function generateReportPdf(data) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const { patient, vitals } = data;
      const computed = {
        bp: assessBP(vitals.systolic, vitals.diastolic),
        spo2: assessSpO2(vitals.spo2),
        pulse: assessPulse(vitals.pulse),
        temp: assessTempF(vitals.tempF),
        eyes: assessEyes(vitals.leftEye, vitals.rightEye),
      };

      doc.rect(0, 0, 595.28, 150).fill("#F97316");
      doc.fontSize(32).font("Helvetica-Bold");
      const relWidth = doc.widthOfString("Rel");
      const ivWidth = doc.widthOfString("iv");
      const totalLogoWidth = relWidth + ivWidth;
      const logoStartX = (doc.page.width - totalLogoWidth) / 2;
      doc.fillColor("#FFFFFF").text("Rel", logoStartX, 50, { continued: true }).fillColor("#000000").text("iv");
      doc.fontSize(18).fillColor("#FFFFFF").font("Helvetica").text("Health Screening Report", 0, 90, { align: "center" });
      doc.fillColor("#000000").fontSize(16).text("Patient Information", 50, 170);
      doc.moveTo(50, 195).lineTo(545.28, 195).stroke("#FDBA74");
      const col1X = 50; const col2X = 300; let currentY = 210;
      doc.fontSize(12);
      doc.font("Helvetica-Bold").text("Name:", col1X, currentY); doc.font("Helvetica").text(patient.name || "N/A", col1X + 50, currentY);
      doc.font("Helvetica-Bold").text("Age:", col2X, currentY); doc.font("Helvetica").text(patient.age || "N/A", col2X + 35, currentY); currentY += 20;
      doc.font("Helvetica-Bold").text("Gender:", col1X, currentY); doc.font("Helvetica").text(patient.gender || "N/A", col1X + 50, currentY);
      doc.font("Helvetica-Bold").text("Phone:", col2X, currentY); doc.font("Helvetica").text(patient.phone || "N/A", col2X + 45, currentY); currentY += 20;
      doc.font("Helvetica-Bold").text("Email:", col1X, currentY); doc.font("Helvetica").text(patient.email || "N/A", col1X + 40, currentY);
      doc.fontSize(16).text("Health Vitals", 50, 300);
      doc.moveTo(50, 325).lineTo(545.28, 325).stroke("#FDBA74");
      const vitalsCards = [
        { label: "Blood Pressure", value: `${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg`, status: computed.bp.label, note: computed.bp.advice },
        { label: "Oxygen Saturation (SpO₂)", value: `${vitals.spo2 || "—"} %`, status: computed.spo2.label, note: computed.spo2.advice },
        { label: "Pulse Rate", value: `${vitals.pulse || "—"} BPM`, status: computed.pulse.label, note: computed.pulse.advice },
        { label: "Body Temperature", value: `${vitals.tempF || "—"} °F`, status: computed.temp.label, note: computed.temp.advice },
      ];
      let yPos = 340; const cardWidth = 240; const cardMargin = 15; const startXCol1 = 50; const startXCol2 = startXCol1 + cardWidth + cardMargin;
      vitalsCards.forEach((vital, index) => {
        const xPos = (index % 2 === 0) ? startXCol1 : startXCol2;
        doc.roundedRect(xPos, yPos, cardWidth, 100, 10).fillAndStroke("#FFFFFF", "#E5E7EB");
        const textX = xPos + 10; let textY = yPos + 10;
        doc.fontSize(10).fillColor("#6B7280").font("Helvetica").text(vital.label, textX, textY); textY += 15;
        doc.fontSize(24).fillColor("#111827").font("Helvetica-Bold").text(vital.value, textX, textY); textY += 35;
        doc.fontSize(10).fillColor("#000000").font("Helvetica").text(vital.note, textX, textY, { width: cardWidth - 20 });
        if (index % 2 !== 0) { yPos += 120; }
      });
      yPos += (vitalsCards.length % 2 === 0 ? 0 : 120);
      doc.roundedRect(50, yPos, 495, 80, 10).fillAndStroke("#FFFFFF", "#E5E7EB");
      doc.fontSize(10).fillColor("#6B7280").text("Visual Acuity", 60, yPos + 10);
      doc.fontSize(24).fillColor("#111827").font("Helvetica-Bold").text(computed.eyes.summary, 60, yPos + 25);
      doc.fontSize(10).fillColor("#000000").font("Helvetica").text(computed.eyes.note, 60, yPos + 55, { width: 475 });
      doc.fontSize(8).fillColor("#9CA3AF").text("This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.", 50, 750, { align: "center" });
      doc.text(`© ${new Date().getFullYear()} Reliv. All rights reserved.`, { align: "center" });
      doc.end();
    });
  }

  function generateReceiptPdf(data) {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const { patient, cart, totalPrice, needsReport } = data;
      doc.fontSize(25).text("Reliv Purchase Receipt", { align: "center" });
      doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" });
      doc.moveDown();
      doc.fontSize(14).text("Billed To:", { underline: true });
      doc.text(patient.name || "N/A");
      doc.text(patient.email || "N/A");
      doc.moveDown(2);
      doc.font("Helvetica-Bold");
      doc.text("Item", 50, 250);
      doc.text("Quantity", 250, 250, { width: 100, align: "right" });
      doc.text("Price", 350, 250, { width: 100, align: "right" });
      doc.text("Total", 450, 250, { width: 100, align: "right" });
      doc.moveTo(50, 270).lineTo(550, 270).stroke();
      doc.font("Helvetica");
      let y = 280;
      if (needsReport) {
        doc.text("Health Checkup Report", 50, y);
        doc.text("1", 250, y, { width: 100, align: "right" });
        doc.text("₹500", 350, y, { width: 100, align: "right" });
        doc.text("₹500", 450, y, { width: 100, align: "right" });
        y += 20;
      }
      if (cart) {
        cart.forEach(item => {
          doc.text(item.name, 50, y);
          doc.text(item.quantity.toString(), 250, y, { width: 100, align: "right" });
          doc.text(`₹${item.price}`, 350, y, { width: 100, align: "right" });
          doc.text(`₹${item.price * item.quantity}`, 450, y, { width: 100, align: "right" });
          y += 20;
        });
      }
      doc.moveTo(50, y).lineTo(550, y).stroke();
      doc.moveDown();
      doc.font("Helvetica-Bold");
      doc.text("Total Paid:", 350, y + 10, { width: 100, align: "right" });
      doc.text(`₹${totalPrice}`, 450, y + 10, { width: 100, align: "right" });
      doc.end();
    });
  }

// --- Mail Transporter (Unchanged) ---
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


// --- UPDATED API Endpoints ---

// Send report email AND save to database
app.post("/send-report", async (req, res) => {
  try {
    const { to, name, healthData } = req.body;
    if (!to || !healthData) {
      return res.status(400).json({ ok: false, message: "Missing email or health data." });
    }

    // *** NEW: Save report data to MongoDB Atlas ***
    const reportsCollection = db.collection('reports');
    await reportsCollection.insertOne({ ...healthData, createdAt: new Date() });
    console.log("📈 Report data saved to MongoDB.");

    const pdfBuffer = await generateReportPdf(healthData);
    const mailOptions = {
      from: `Reliv Reports <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Health Report from Reliv, ${name || "User"}`,
      text: `Hi ${name || "User"},\n\nPlease find your health report attached.\n\nBest,\nThe Reliv Team`,
      attachments: [{
        filename: `Reliv-Health-Report-${name || "user"}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }],
    };
    
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Report sent to ${to}`);
    
    // *** FIX: Respond with success immediately after sending ***
    res.json({ ok: true });

  } catch (err) {
    console.error("Error in /send-report:", err);
    res.status(500).json({ ok: false, message: "Failed to send report." });
  }
});


// Send receipt email AND save to database
app.post("/api/send-receipt", async (req, res) => {
    try {
      const { patient, cart, totalPrice, needsReport } = req.body;
      if (!patient || !patient.email) {
        return res.status(400).json({ ok: false, message: "Missing patient email." });
      }
      if (!needsReport && (!cart || cart.length === 0 || !totalPrice)) {
        return res.status(400).json({ ok: false, message: "Missing cart items for purchase." });
      }
  
      // *** NEW: Save receipt data to MongoDB Atlas ***
      const receiptsCollection = db.collection('receipts');
      await receiptsCollection.insertOne({ patient, cart, totalPrice, needsReport, createdAt: new Date() });
      console.log("🧾 Receipt data saved to MongoDB.");

      const pdfBuffer = await generateReceiptPdf({ patient, cart, totalPrice, needsReport });
      const mailOptions = {
        from: `Reliv Receipts <${process.env.GMAIL_USER}>`,
        to: patient.email,
        subject: `Your Receipt from Reliv`,
        text: `Hi ${patient.name || "User"},\n\nPlease find your purchase receipt attached.\n\nBest,\nThe Reliv Team`,
        attachments: [{
            filename: `Reliv-Receipt.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
        }],
      };
      await transporter.sendMail(mailOptions);
      console.log(`Sent receipt to ${patient.email}`);
      res.json({ ok: true });
    } catch (err) {
      console.error("Error in /api/send-receipt:", err);
      res.status(500).json({ ok: false, message: "Failed to send receipt." });
    }
  });


// --- Admin and Other Routes (Unchanged) ---

// File-based helpers
async function ensureDataDir() { try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch (e) { console.error("Could not create data dir:", e); } }
async function loadJsonSafe(filePath) { try { const raw = await fs.readFile(filePath, "utf8"); return JSON.parse(raw || "{}"); } catch (e) { return {}; } }
async function saveJsonSafe(filePath, obj) { await ensureDataDir(); await fs.writeFile(filePath, JSON.stringify(obj, null, 2), "utf8"); }

app.post("/api/send-reset-email", async (req, res) => {
    try {
      const { to } = req.body;
      if (!to) return res.status(400).json({ ok: false, message: "Missing 'to' (admin email)." });
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiry = Date.now() + 1000 * 60 * 15;
      const store = await loadJsonSafe(TOKEN_STORE_FILE);
      store[to] = { tokenHash, expiry };
      await saveJsonSafe(TOKEN_STORE_FILE, store);
      const mailOptions = {
        from: `Reliv Reports <${process.env.GMAIL_USER}>`,
        to,
        subject: "Admin password reset — your recovery code",
        text: `You (or someone claiming to be you) requested a password reset.\n\nYour recovery code is: ${token}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, ignore this email.`,
      };
      await transporter.sendMail(mailOptions);
      console.log(`Sent reset email to ${to}`);
      return res.json({ ok: true, message: "Recovery email sent." });
    } catch (err) {
      console.error("Error in /api/send-reset-email:", err);
      return res.status(500).json({ ok: false, message: "Failed to send reset email." });
    }
  });
  
app.post("/api/confirm-reset", async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) return res.status(400).json({ ok: false, message: "Missing parameters." });
        const store = await loadJsonSafe(TOKEN_STORE_FILE);
        const entry = store[email];
        if (!entry) return res.status(400).json({ ok: false, message: "No reset request found for this email." });
        if (Date.now() > entry.expiry) {
            delete store[email];
            await saveJsonSafe(TOKEN_STORE_FILE, store);
            return res.status(400).json({ ok: false, message: "Recovery code expired. Request a new one." });
        }
        const inputHash = crypto.createHash("sha256").update(token).digest("hex");
        if (inputHash !== entry.tokenHash) {
            return res.status(400).json({ ok: false, message: "Invalid recovery code." });
        }
        const salt = crypto.randomBytes(16).toString("hex");
        const derived = crypto.pbkdf2Sync(newPassword, salt, 100000, 64, "sha512").toString("hex");
        const credStore = await loadJsonSafe(CRED_STORE_FILE);
        credStore[email] = { algorithm: "pbkdf2", salt, iterations: 100000, keyLen: 64, digest: "sha512", hash: derived, updatedAt: Date.now() };
        await saveJsonSafe(CRED_STORE_FILE, credStore);
        delete store[email];
        await saveJsonSafe(TOKEN_STORE_FILE, store);
        console.log(`Password reset for ${email}`);
        return res.json({ ok: true });
    } catch (err) {
        console.error("Error in /api/confirm-reset:", err);
        return res.status(500).json({ ok: false, message: "Failed to confirm reset." });
    }
});
  
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

app.get('/api/gdrive-image/:fileId', async (req, res) => {
    const { fileId } = req.params;
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_KEY_PATH,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const drive = google.drive({ version: 'v3', auth });
        const fileMetadata = await drive.files.get({ fileId: fileId, fields: 'mimeType' });
        const mimeType = fileMetadata.data.mimeType;
        if (!mimeType || !mimeType.startsWith('image/')) {
            return res.status(400).json({ message: 'File is not an image.' });
        }
        const response = await drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);
        const imageBase64 = imageBuffer.toString('base64');
        const imageUrl = `data:${mimeType};base64,${imageBase64}`;
        res.status(200).json({ imageUrl });
    } catch (error) {
        console.error("Google Drive API Error:", error.message);
        if (error.code === 'ENOENT') {
            return res.status(500).json({ message: "Service account key not found on the server. Make sure 'service-account-key.json' is in the 'data' directory." });
        }
        if (error.errors) {
            const apiError = error.errors[0];
            if (apiError.reason === 'notFound') {
                return res.status(404).json({ message: `File not found. Please check the link and sharing settings.` });
            }
            if (apiError.reason === 'forbidden') {
                return res.status(403).json({ message: "Access denied. Please share the file with your service account's email address." });
            }
        }
        res.status(500).json({ message: "An unknown error occurred while fetching the image from Google Drive." });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});