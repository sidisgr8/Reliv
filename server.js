// server.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import { MongoClient, ObjectId } from "mongodb"; // Import MongoClient and ObjectId
import Razorpay from "razorpay"; // Import Razorpay
import QRCode from "qrcode";
import fetch from 'node-fetch'; // Add this line


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- Razorpay Instance ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- MongoDB Atlas Connection Setup ---
const mongoUrl = process.env.MONGODB_URI; // Make sure your .env file has this variable
const client = new MongoClient(mongoUrl);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("reliv"); // This will use (or create) a database named 'reliv'
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
const SERVICE_ACCOUNT_KEY_PATH = path.join(
  DATA_DIR,
  "service-account-key.json"
);

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
    return {
      label: "Low",
      advice: "Could be normal for athletes; else, monitor.",
    };
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

const generatePdfFromImage = (imageBase64) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    // The image is already a full A4 render, so just place it on the page
    doc.image(imageBase64, 0, 0, {
      width: doc.page.width,
      height: doc.page.height,
    });

    doc.end();
  });
};

// --- PDF Generation Logic (Unchanged) ---
function generateReportPdf(data, ecoStats) {
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
    doc
      .fillColor("#FFFFFF")
      .text("Rel", logoStartX, 50, { continued: true })
      .fillColor("#000000")
      .text("iv");
    doc
      .fontSize(18)
      .fillColor("#FFFFFF")
      .font("Helvetica")
      .text("Health Screening Report", 0, 90, { align: "center" });
    doc.fillColor("#000000").fontSize(16).text("Patient Information", 50, 170);
    doc.moveTo(50, 195).lineTo(545.28, 195).stroke("#FDBA74");
    const col1X = 50;
    const col2X = 300;
    let currentY = 210;
    doc.fontSize(12);
    doc.font("Helvetica-Bold").text("Name:", col1X, currentY);
    doc
      .font("Helvetica")
      .text(patient.name || "N/A", col1X + 50, currentY);
    doc.font("Helvetica-Bold").text("Age:", col2X, currentY);
    doc
      .font("Helvetica")
      .text(patient.age || "N/A", col2X + 35, currentY);
    currentY += 20;
    doc.font("Helvetica-Bold").text("Gender:", col1X, currentY);
    doc
      .font("Helvetica")
      .text(patient.gender || "N/A", col1X + 50, currentY);
    doc.font("Helvetica-Bold").text("Phone:", col2X, currentY);
    doc
      .font("Helvetica")
      .text(patient.phone || "N/A", col2X + 45, currentY);
    currentY += 20;
    doc.font("Helvetica-Bold").text("Email:", col1X, currentY);
    doc
      .font("Helvetica")
      .text(patient.email || "N/A", col1X + 40, currentY);
    doc.fontSize(16).text("Health Vitals", 50, 300);
    doc.moveTo(50, 325).lineTo(545.28, 325).stroke("#FDBA74");
    const vitalsCards = [
      {
        label: "Blood Pressure",
        value: `${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg`,
        status: computed.bp.label,
        note: computed.bp.advice,
      },
      {
        label: "Oxygen Saturation (SpO₂)",
        value: `${vitals.spo2 || "—"} %`,
        status: computed.spo2.label,
        note: computed.spo2.advice,
      },
      {
        label: "Pulse Rate",
        value: `${vitals.pulse || "—"} BPM`,
        status: computed.pulse.label,
        note: computed.pulse.advice,
      },
      {
        label: "Body Temperature",
        value: `${vitals.tempF || "—"} °F`,
        status: computed.temp.label,
        note: computed.temp.advice,
      },
    ];
    let yPos = 340;
    const cardWidth = 240;
    const cardMargin = 15;
    const startXCol1 = 50;
    const startXCol2 = startXCol1 + cardWidth + cardMargin;
    vitalsCards.forEach((vital, index) => {
      const xPos = index % 2 === 0 ? startXCol1 : startXCol2;
      doc
        .roundedRect(xPos, yPos, cardWidth, 100, 10)
        .fillAndStroke("#FFFFFF", "#E5E7EB");
      const textX = xPos + 10;
      let textY = yPos + 10;
      doc
        .fontSize(10)
        .fillColor("#6B7280")
        .font("Helvetica")
        .text(vital.label, textX, textY);
      textY += 15;
      doc
        .fontSize(24)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text(vital.value, textX, textY);
      textY += 35;
      doc
        .fontSize(10)
        .fillColor("#000000")
        .font("Helvetica")
        .text(vital.note, textX, textY, { width: cardWidth - 20 });
      if (index % 2 !== 0) {
        yPos += 120;
      }
    });
    yPos += vitalsCards.length % 2 === 0 ? 0 : 120;
    doc
      .roundedRect(50, yPos, 495, 80, 10)
      .fillAndStroke("#FFFFFF", "#E5E7EB");
    doc.fontSize(10).fillColor("#6B7280").text("Visual Acuity", 60, yPos + 10);
    doc
      .fontSize(24)
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .text(computed.eyes.summary, 60, yPos + 25);
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica")
      .text(computed.eyes.note, 60, yPos + 55, { width: 475 });
    doc
      .fontSize(8)
      .fillColor("#9CA3AF")
      .text(
        "This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.",
        50,
        750,
        { align: "center" }
      );
    doc.text(`© ${new Date().getFullYear()} Reliv. All rights reserved.`, {
      align: "center",
    });
    if (ecoStats) {
      doc
        .fontSize(8)
        .text(
          `Fun Fact: Your digital choice saved ~${ecoStats.individual.water}L of water & ~${ecoStats.individual.co2}g of CO2. Collectively, our users have saved ~${ecoStats.total.water}L of water, ~${ecoStats.total.co2}g of CO2, and ~${ecoStats.total.paper} sheets of paper!`,
          50,
          770,
          { align: "center" }
        );
    }
    doc.end();
  });
}

// ... (previous code in server.js)

function generateReceiptPdf(data, ecoStats) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const { patient, cart, totalPrice, needsReport } = data;

    // --- STYLING CONSTANTS ---
    const brandColor = "#F97316";
    const headerBgColor = "#FFF1EA";
    const textColor = "#1F2937";
    const lightTextColor = "#6B7280";
    const tableHeaderBg = "#F3F4F6";
    const tableEvenRowBg = "#FFFFFF";
    const tableOddRowBg = "#F9FAFB";

    // --- HEADER ---
    doc.rect(0, 0, doc.page.width, 130).fill(headerBgColor);
    doc.fontSize(32).font("Helvetica-Bold");
    const relWidth = doc.widthOfString("Rel");
    const ivWidth = doc.widthOfString("iv");
    const totalLogoWidth = relWidth + ivWidth;
    const logoStartX = 50;
    doc
      .fillColor(brandColor)
      .text("Rel", logoStartX, 50, { continued: true })
      .fillColor(textColor)
      .text("iv");
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(lightTextColor)
      .text("Your health, your way.", logoStartX, 85);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor(textColor)
      .text("Purchase Receipt", 0, 65, { align: "right" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(lightTextColor)
      .text(`Date: ${new Date().toLocaleDateString()}`, 0, 90, {
        align: "right",
      });

    // --- BILLED TO ---
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor(textColor)
      .text("Billed To:", 50, 160);
    doc.font("Helvetica").fontSize(11).fillColor(lightTextColor);
    doc.text(patient.name || "N/A", 50, 180);
    doc.text(patient.email || "N/A", 50, 195);

    // --- TABLE ---
    const tableTop = 250;
    const itemX = 50;
    const qtyX = 300;
    const priceX = 370;
    const totalX = 460;

    // Table Header
    doc.font("Helvetica-Bold").fontSize(10);
    doc.rect(50, tableTop, 500, 25).fill(tableHeaderBg);
    doc.fillColor(textColor).text("ITEM", itemX + 10, tableTop + 8);
    doc.text("QTY", qtyX, tableTop + 8, { width: 60, align: "center" });
    doc.text("PRICE", priceX, tableTop + 8, { width: 80, align: "right" });
    doc.text("TOTAL", totalX, tableTop + 8, { width: 90, align: "right" });

    let y = tableTop + 25;
    let i = 0;

    const drawRow = (item, isEven) => {
      doc
        .rect(50, y, 500, 30)
        .fill(isEven ? tableEvenRowBg : tableOddRowBg);
      doc.font("Helvetica").fontSize(10).fillColor(textColor);
      doc.text(item.name, itemX + 10, y + 10, { width: 230 });
      doc.text(item.quantity.toString(), qtyX, y + 10, {
        width: 60,
        align: "center",
      });
      doc.text(`INR ${item.price.toFixed(2)}`, priceX, y + 10, {
        width: 80,
        align: "right",
      });
      doc.text(
        `INR ${(item.price * item.quantity).toFixed(2)}`,
        totalX,
        y + 10,
        { width: 90, align: "right" }
      );
      y += 30;
      i++;
    };

    if (needsReport) {
      drawRow(
        { name: "Health Checkup Report", quantity: 1, price: 500 },
        i % 2 === 0
      );
    }
    if (cart) {
      cart.forEach((item) => {
        drawRow(item, i % 2 === 0);
      });
    }

    // --- TOTALS ---
    const totalY = y + 20;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor);
    doc.text("Total Paid:", 350, totalY, { width: 100, align: "right" });
    doc
      .fillColor(brandColor)
      .text(`INR ${totalPrice.toFixed(2)}`, 450, totalY, {
        width: 100,
        align: "right",
      });

    // --- FOOTER ---
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(textColor)
      .text("Thank you for your purchase!", 50, doc.page.height - 100, {
        align: "center",
      });

    if (ecoStats) {
      doc
        .fontSize(8)
        .fillColor(lightTextColor)
        .text(
          `Fun Fact: Your digital choice saved ~${ecoStats.individual.water}L of water & ~${ecoStats.individual.co2}g of CO2. Collectively, our users have saved ~${ecoStats.total.water}L of water, ~${ecoStats.total.co2}g of CO2, and ~${ecoStats.total.paper} sheets of paper!`,
          50,
          doc.page.height - 80,
          { align: "center" }
        );
    }

    doc.end();
  });
}

// ... (rest of the code in server.js)

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

app.get("/api/report/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) });
    if (!report) {
      return res.status(404).send("Report not found");
    }
    const ecoStats = await (
      await fetch(`http://localhost:${process.env.PORT || 5000}/api/eco-stats`)
    ).json();
    const pdfBuffer = await generateReportPdf(report, ecoStats);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Reliv-Health-Report-${
        report.patient.name || "user"
      }.pdf`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error in /api/report/:id/download:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/api/qr-code", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    const qrCode = await QRCode.toDataURL(url);
    res.json({ qrCode });
  } catch (err) {
    console.error("Error generating QR code:", err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// --- NEW: Razorpay Order Creation Endpoint ---
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR ",
      receipt: `receipt_order_${new Date().getTime()}`,
    };
    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).send("Error creating order");
    }
    res.json(order);
  } catch (err) {
    console.error("Error in /api/create-order:", err);
    res.status(500).send("Server Error");
  }
});

// --- NEW: Eco Stats Endpoint ---
app.get("/api/eco-stats", async (req, res) => {
  try {
    const reportsCollection = db.collection("reports");
    const receiptsCollection = db.collection("receipts");

    const reportCount = await reportsCollection.countDocuments();
    const receiptCount = await receiptsCollection.countDocuments();

    const totalDocuments = reportCount + receiptCount;

    // Constants for savings per document (2 pages)
    const PAPER_SAVED_PER_DOC = 2; // sheets
    const WATER_SAVED_PER_DOC = 20; // liters
    const CO2_SAVED_PER_DOC = 18; // grams

    res.json({
      total: {
        paper: totalDocuments * PAPER_SAVED_PER_DOC,
        water: totalDocuments * WATER_SAVED_PER_DOC,
        co2: totalDocuments * CO2_SAVED_PER_DOC,
      },
      individual: {
        paper: PAPER_SAVED_PER_DOC,
        water: WATER_SAVED_PER_DOC,
        co2: CO2_SAVED_PER_DOC,
      },
    });
  } catch (err) {
    console.error("Error in /api/eco-stats:", err);
    res.status(500).json({ error: "Failed to fetch eco stats." });
  }
});

// --- UPDATED API Endpoints ---

// NEW: Save report to database without sending email
app.post("/api/save-report", async (req, res) => {
  try {
    const { healthData } = req.body;
    if (!healthData) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing health data." });
    }
    const reportsCollection = db.collection("reports");
    const result = await reportsCollection.insertOne({
      ...healthData,
      createdAt: new Date(),
    });
    console.log("📈 Report data saved to MongoDB.");
    res.json({ ok: true, reportId: result.insertedId });
  } catch (err) {
    console.error("Error in /api/save-report:", err);
    res.status(500).json({ ok: false, message: "Failed to save report." });
  }
});

// Send report email
app.post("/send-report", async (req, res) => {
  try {
    const { to, name, healthData, reportImage } = req.body;
    if (!to || !healthData) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing email or health data." });
    }

    const pdfBuffer = reportImage
      ? await generatePdfFromImage(reportImage)
      : await generateReportPdf(
          healthData,
          await (await fetch(`http://localhost:${PORT}/api/eco-stats`)).json()
        );

    const mailOptions = {
      from: `Reliv Reports <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Health Report from Reliv, ${name || "User"}`,
      text: `Hi ${
        name || "User"
      },\n\nPlease find your health report attached.\n\nBest,\nThe Reliv Team`,
      attachments: [
        {
          filename: `Reliv-Health-Report-${name || "user"}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Report sent to ${to}`);

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
      return res
        .status(400)
        .json({ ok: false, message: "Missing patient email." });
    }
    if (!needsReport && (!cart || cart.length === 0 || !totalPrice)) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing cart items for purchase." });
    }

    // *** NEW: Save receipt data to MongoDB Atlas ***
    const receiptsCollection = db.collection("receipts");
    await receiptsCollection.insertOne({
      patient,
      cart,
      totalPrice,
      needsReport,
      createdAt: new Date(),
    });
    console.log("🧾 Receipt data saved to MongoDB.");

    // Fetch eco stats
    const ecoStatsResponse = await fetch(
      `http://localhost:${PORT}/api/eco-stats`
    );
    const ecoStats = await ecoStatsResponse.json();

    const pdfBuffer = await generateReceiptPdf(
      { patient, cart, totalPrice, needsReport },
      ecoStats
    );
    const mailOptions = {
      from: `Reliv Receipts <${process.env.GMAIL_USER}>`,
      to: patient.email,
      subject: `Your Receipt from Reliv`,
      text: `Hi ${
        patient.name || "User"
      },\n\nPlease find your purchase receipt attached.\n\nBest,\nThe Reliv Team`,
      attachments: [
        {
          filename: `Reliv-Receipt.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };
    await transporter.sendMail(mailOptions);
    console.log(`Sent receipt to ${patient.email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/send-receipt:", err);
    res.status(500).json({ ok: false, message: "Failed to send receipt." });
  }
});


app.get('/api/get-device-data', async (req, res) => {
    try {
        const response = await fetch('http://127.0.0.1:5001/get_ble_data');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data from Python script.' });
    }
});


// --- Admin and Other Routes (Unchanged) ---

// File-based helpers
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Could not create data dir:", e);
  }
}
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

app.get("/api/reports/history/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const reports = await db
      .collection("reports")
      .find({ "patient.email": email })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    res.json(reports);
  } catch (err) {
    console.error("Error fetching report history:", err);
    res.status(500).json({ error: "Failed to fetch report history." });
  }
});

app.post("/api/send-reset-email", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to)
      return res
        .status(400)
        .json({ ok: false, message: "Missing 'to' (admin email)." });
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
    return res
      .status(500)
      .json({ ok: false, message: "Failed to send reset email." });
  }
});

app.post("/api/confirm-reset", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword)
      return res.status(400).json({ ok: false, message: "Missing parameters." });
    const store = await loadJsonSafe(TOKEN_STORE_FILE);
    const entry = store[email];
    if (!entry)
      return res
        .status(400)
        .json({ ok: false, message: "No reset request found for this email." });
    if (Date.now() > entry.expiry) {
      delete store[email];
      await saveJsonSafe(TOKEN_STORE_FILE, store);
      return res
        .status(400)
        .json({ ok: false, message: "Recovery code expired. Request a new one." });
    }
    const inputHash = crypto.createHash("sha256").update(token).digest("hex");
    if (inputHash !== entry.tokenHash) {
      return res.status(400).json({ ok: false, message: "Invalid recovery code." });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto
      .pbkdf2Sync(newPassword, salt, 100000, 64, "sha512")
      .toString("hex");
    const credStore = await loadJsonSafe(CRED_STORE_FILE);
    credStore[email] = {
      algorithm: "pbkdf2",
      salt,
      iterations: 100000,
      keyLen: 64,
      digest: "sha512",
      hash: derived,
      updatedAt: Date.now(),
    };
    await saveJsonSafe(CRED_STORE_FILE, credStore);
    delete store[email];
    await saveJsonSafe(TOKEN_STORE_FILE, store);
    console.log(`Password reset for ${email}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/confirm-reset:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to confirm reset." });
  }
});

app.post("/api/check-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, message: "Missing parameters." });
    const credStore = await loadJsonSafe(CRED_STORE_FILE);
    const user = credStore[email];
    if (!user)
      return res.status(400).json({ ok: false, message: "No such admin." });
    if (user.algorithm !== "pbkdf2")
      return res
        .status(500)
        .json({ ok: false, message: "Unsupported algorithm." });
    const derived = crypto
      .pbkdf2Sync(password, user.salt, user.iterations, user.keyLen, user.digest)
      .toString("hex");
    if (derived === user.hash) return res.json({ ok: true });
    return res.status(401).json({ ok: false, message: "Invalid credentials." });
  } catch (err) {
    console.error("Error in /api/check-login:", err);
    return res.status(500).json({ ok: false, message: "Login check failed." });
  }
});

app.get("/api/gdrive-image/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY_PATH,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth });
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: "mimeType",
    });
    const mimeType = fileMetadata.data.mimeType;
    if (!mimeType || !mimeType.startsWith("image/")) {
      return res.status(400).json({ message: "File is not an image." });
    }
    const response = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const imageBuffer = Buffer.from(response.data);
    const imageBase64 = imageBuffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Google Drive API Error:", error.message);
    if (error.code === "ENOENT") {
      return res.status(500).json({
        message:
          "Service account key not found on the server. Make sure 'service-account-key.json' is in the 'data' directory.",
      });
    }
    if (error.errors) {
      const apiError = error.errors[0];
      if (apiError.reason === "notFound") {
        return res.status(404).json({
          message: `File not found. Please check the link and sharing settings.`,
        });
      }
      if (apiError.reason === "forbidden") {
        return res.status(403).json({
          message:
            "Access denied. Please share the file with your service account's email address.",
        });
      }
    }
    res.status(500).json({
      message:
        "An unknown error occurred while fetching the image from Google Drive.",
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});