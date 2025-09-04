import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import { MongoClient, ObjectId } from "mongodb";
import Razorpay from "razorpay";
import QRCode from "qrcode";
import fetch from "node-fetch";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "120mb" }));
app.use(express.urlencoded({ limit: "120mb", extended: true }));

// Disable caching for Google Drive API responses
app.use((req, res, next) => {
  if (req.path.startsWith('/api/gdrive')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});

// --- Razorpay Instance ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- MongoDB Atlas Connection Setup ---
const mongoUrl = process.env.MONGODB_URI;
const client = new MongoClient(mongoUrl);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("reliv");
    console.log("✅ Successfully connected to MongoDB Atlas");
    await initializeKits();
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

// --- Initialize Default Kits ---
async function initializeKits() {
  try {
    const kitsCollection = db.collection("kits");
    const kitCount = await kitsCollection.countDocuments();
    if (kitCount === 0) {
      const defaultKits = [
        {
          id: 1,
          name: "First Aid Kit",
          description: "Essential supplies for common injuries.",
          price: 1200,
          quantity: 10,
          imageUrl: "",
          folderUrl: "https://drive.google.com/drive/folders/1NBwEAIbZQOmw92j-YfsLWTDwuD1fUnsk",
          expiryDate: "2025-12-31",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "Travel Health Kit",
          description: "Stay healthy and prepared on the go.",
          price: 1500,
          quantity: 12,
          imageUrl: "",
          folderUrl: "https://drive.google.com/drive/folders/1yH56TSxZg1qHKYuoLN2IFqts45pKXmYk",
          expiryDate: "2025-01-20",
          createdAt: new Date(),
        },
        {
          id: 3,
          name: "Women's Care Kit",
          description: "Essential supplies for women's health.",
          price: 1800,
          quantity: 7,
          imageUrl: "",
          folderUrl: "https://drive.google.com/drive/folders/1Q0BwqGowsnojqc4xS1M7XxW-DadQzPmS",
          expiryDate: "2026-03-31",
          createdAt: new Date(),
        },
        {
          id: 4,
          name: "Testing Kit",
          description: "Testing kits for health monitoring.",
          price: 2000,
          quantity: 5,
          imageUrl: "",
          folderUrl: "https://drive.google.com/drive/folders/1I8VQI1T43rEl_8XGt9x5BXAy8W_2GugF",
          expiryDate: "2025-11-30",
          createdAt: new Date(),
        },
        {
          id: 5,
          name: "Immunity Kit",
          description: "Boost immunity with these supplements.",
          price: 1000,
          quantity: 15,
          imageUrl: "",
          folderUrl: "https://drive.google.com/drive/folders/15r8V_unpnFThDuj6nsavTrYsvoj3CdTN",
          expiryDate: "2026-05-15",
          createdAt: new Date(),
        },
        {
          id: 6,
          name: "Safety Kit",
          description: "Personal safety and protection gear.",
          price: 1400,
          quantity: 9,
          imageUrl: "",
          folderUrl: "https://drive.google.com/drive/folders/19t-Mh_lXEpxtUh8UX7lLTPcpBLfkpsqC",
          expiryDate: "2025-09-30",
          createdAt: new Date(),
        },
      ];
      await kitsCollection.insertMany(defaultKits);
      console.log("Initialized default kits in MongoDB");
    }
  } catch (err) {
    console.error("Error initializing kits:", err);
  }
}

connectDB();

// --- File-based Persistence for Admin/Reset ---
const DATA_DIR = process.env.DATA_DIR || "./data";
const TOKEN_STORE_FILE = path.join(DATA_DIR, "reset_tokens.json");
const CRED_STORE_FILE = path.join(DATA_DIR, "admin_credentials.json");
const SERVICE_ACCOUNT_KEY_PATH = path.join(DATA_DIR, "service-account-key.json");

// --- Helper Functions (WHO Guidelines for Health Assessments) ---
function assessBP(sys, dia) {
  const s = Number(sys), d = Number(dia);
  if (!s || !d) return { label: "—", advice: "No BP values provided." };
  if (s < 120 && d < 80) return { label: "Normal", advice: "Good: Keep up a healthy lifestyle." };
  if (s < 130 && d < 80) return { label: "Elevated", advice: "Keep a check: Monitor regularly; consider diet/exercise." };
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) return { label: "Hypertension Stage 1", advice: "Alert: Consult a clinician; lifestyle changes recommended. Reduce salt intake and increase physical activity." };
  if (s >= 140 || d >= 90) return { label: "Hypertension Stage 2", advice: "Alert: Seek medical advice soon. Reduce salt intake and increase physical activity." };
  return { label: "—", advice: "Check values." };
}

function assessSpO2(spo2) {
  const v = Number(spo2);
  if (!v) return { label: "—", advice: "No SpO₂ value provided." };
  if (v >= 95) return { label: "Normal", advice: "Good: Oxygen saturation is within normal range." };
  if (v >= 90) return { label: "Borderline", advice: "Keep a check: Monitor; if symptoms occur, contact a clinician." };
  return { label: "Low", advice: "Alert: Low oxygen level; seek care if persistent." };
}

function assessPulse(pulse) {
  const v = Number(pulse);
  if (!v) return { label: "—", advice: "No pulse value provided." };
  if (v >= 60 && v <= 100) return { label: "Normal", advice: "Good: Resting heart rate is within normal range." };
  if (v < 60) return { label: "Bradycardia", advice: "Keep a check: Could be normal for athletes; else, monitor." };
  return { label: "Tachycardia", advice: "Alert: High heart rate; consider rest and consult if persistent." };
}

function assessTempF(t) {
  const v = Number(t);
  if (!v) return { label: "—", advice: "No temperature provided." };
  if (v < 97) return { label: "Low", advice: "Alert: Slightly low; ensure warmth and re-check." };
  if (v <= 99) return { label: "Normal", advice: "Good: Within normal range." };
  if (v <= 100.4) return { label: "Elevated", advice: "Keep a check: Monitor, rest, and stay hydrated." };
  if (v <= 103) return { label: "Fever", advice: "Alert: Fever; monitor, rest, stay hydrated, and consult if persistent." };
  if (v <= 104) return { label: "High Fever", advice: "Alert: High fever; seek medical attention." };
  return { label: "Critical", advice: "Emergency: Very high temperature; immediate care needed." };
}

function getSnellenEquivalent(line) {
  const lines = { 1: 200, 2: 100, 3: 70, 4: 50, 5: 40, 6: 30, 7: 25, 8: 20, 9: 15 };
  return lines[line] || "—";
}

function assessEyes(left, right) {
  if (!left && !right) return { summary: "—", note: "No eyesight input provided.", label: "—" };
  const l = getSnellenEquivalent(left), r = getSnellenEquivalent(right);
  const summary = `Left: 20/${l}, Right: 20/${r}`;
  const minLine = Math.min(left || 0, right || 0);
  let label, note;
  if (minLine >= 8) {
    label = "Normal";
    note = "Good: Visual acuity is within normal range. This is a basic screening. Smaller Snellen equivalents indicate better acuity.";
  } else if (minLine >= 6) {
    label = "Moderate";
    note = "Keep a check: May need corrective lenses; consult an optometrist. This is a basic screening. Smaller Snellen equivalents indicate better acuity.";
  } else {
    label = "Poor";
    note = "Alert: Poor visual acuity; seek professional eye care. This is a basic screening. Smaller Snellen equivalents indicate better acuity.";
  }
  return { summary, note, label };
}

const generatePdfFromImage = (imageBase64, options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const config = { zoom: options.zoom || 1.2, margin: options.margin || 20, showPageNumbers: options.showPageNumbers ?? true, maxPages: options.maxPages || 20 };
      const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: config.margin });
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      const pageWidth = doc.page.width - (2 * config.margin);
      const pageHeight = doc.page.height - (2 * config.margin);
      const img = doc.openImage(imageBuffer);
      const baseScale = pageWidth / img.width;
      const scale = baseScale * config.zoom;
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const pagesNeeded = Math.min(Math.ceil(scaledHeight / pageHeight), config.maxPages);

      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) doc.addPage();
        doc.save();
        doc.rect(config.margin, config.margin, pageWidth, pageHeight).clip();
        const xPosition = scaledWidth < pageWidth ? config.margin + (pageWidth - scaledWidth) / 2 : config.margin;
        doc.image(imageBuffer, xPosition, config.margin - (i * pageHeight), { width: scaledWidth, height: scaledHeight });
        doc.restore();
        if (config.showPageNumbers && pagesNeeded > 1) {
          doc.fontSize(10).fillColor("#888888").text(`Page ${i + 1} of ${pagesNeeded}`, config.margin, doc.page.height - config.margin - 20, { align: "center", width: pageWidth });
        }
      }
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

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

    function getColorForStatus(status) {
      if (status.includes("Normal") || status.includes("Good")) return "#22C55E"; // green
      if (status.includes("Elevated") || status.includes("Borderline") || status.includes("Bradycardia") || status.includes("Moderate")) return "#EAB308"; // yellow
      return "#EF4444"; // red
    }

    // Header and Patient Info
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
    const col1X = 50, col2X = 300, currentY = 210;
    doc.fontSize(12);
    doc.font("Helvetica-Bold").text("Name:", col1X, currentY);
    doc.font("Helvetica").text(patient.name || "N/A", col1X + 50, currentY);
    doc.font("Helvetica-Bold").text("Age:", col2X, currentY);
    doc.font("Helvetica").text(patient.age || "N/A", col2X + 35, currentY);
    doc.font("Helvetica-Bold").text("Gender:", col1X, currentY + 20);
    doc.font("Helvetica").text(patient.gender || "N/A", col1X + 50, currentY + 20);
    doc.font("Helvetica-Bold").text("Phone:", col2X, currentY + 20);
    doc.font("Helvetica").text(patient.phone || "N/A", col2X + 45, currentY + 20);
    doc.font("Helvetica-Bold").text("Email:", col1X, currentY + 40);
    doc.font("Helvetica").text(patient.email || "N/A", col1X + 40, currentY + 40);

    // Health Vitals
    let yPos = currentY + 80;
    doc.fontSize(16).text("Health Vitals", 50, yPos);
    doc.moveTo(50, yPos + 25).lineTo(545.28, yPos + 25).stroke("#FDBA74");
    yPos += 40;
    const vitalsCards = [
      { label: "Blood Pressure", value: `${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg`, status: computed.bp.label, note: computed.bp.advice },
      { label: "Oxygen Saturation (SpO₂)", value: `${vitals.spo2 || "—"} %`, status: computed.spo2.label, note: computed.spo2.advice },
      { label: "Pulse Rate", value: `${vitals.pulse || "—"} BPM`, status: computed.pulse.label, note: computed.pulse.advice },
      { label: "Body Temperature", value: `${vitals.tempF || "—"} °F`, status: computed.temp.label, note: computed.temp.advice },
    ];
    const cardWidth = 240, cardHeight = 120, cardMargin = 15, startXCol1 = 50, startXCol2 = startXCol1 + cardWidth + cardMargin;
    let cardIndex = 0;
    vitalsCards.forEach((vital) => {
      if (yPos + cardHeight > doc.page.height - 100) {
        doc.addPage();
        yPos = 50;
      }
      const xPos = cardIndex % 2 === 0 ? startXCol1 : startXCol2;
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 10).fillAndStroke("#FFFFFF", "#E5E7EB");
      const textX = xPos + 10, textY = yPos + 10;
      doc.fontSize(10).fillColor("#6B7280").font("Helvetica").text(vital.label, textX, textY);
      doc.fontSize(24).fillColor("#111827").font("Helvetica-Bold").text(vital.value, textX, textY + 15);
      doc.fontSize(12).fillColor(getColorForStatus(vital.status)).font("Helvetica").text(vital.status, textX, textY + 45);
      doc.fontSize(10).fillColor("#000000").font("Helvetica").text(vital.note, textX, textY + 60, { width: cardWidth - 20 });
      if (cardIndex % 2 !== 0) yPos += cardHeight + 20;
      cardIndex++;
    });
    if (cardIndex % 2 !== 0) yPos += cardHeight + 20;

    // Visual Acuity
    if (yPos + 100 > doc.page.height - 100) {
      doc.addPage();
      yPos = 50;
    }
    doc.roundedRect(50, yPos, 495, 100, 10).fillAndStroke("#FFFFFF", "#E5E7EB");
    doc.fontSize(10).fillColor("#6B7280").text("Visual Acuity", 60, yPos + 10);
    doc.fontSize(24).fillColor("#111827").font("Helvetica-Bold").text(computed.eyes.summary, 60, yPos + 25);
    doc.fontSize(12).fillColor(getColorForStatus(computed.eyes.label)).font("Helvetica").text(computed.eyes.label, 60, yPos + 55);
    doc.fontSize(10).fillColor("#000000").font("Helvetica").text(computed.eyes.note, 60, yPos + 70, { width: 475 });
    yPos += 120;

    // Footer
    doc.fontSize(8).fillColor("#9CA3AF").text("This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.", 50, doc.page.height - 80, { align: "center" });
    doc.text(`© ${new Date().getFullYear()} Reliv. All rights reserved.`, 50, doc.page.height - 65, { align: "center" });
    if (ecoStats) {
      doc.text(`Fun Fact: Your digital choice saved ~${ecoStats.individual.water}L of water & ~${ecoStats.individual.co2}g of CO2. Collectively, our users have saved ~${ecoStats.total.water}L of water, ~${ecoStats.total.co2}g of CO2, and ~${ecoStats.total.paper} sheets of paper!`, 50, doc.page.height - 50, { align: "center" });
    }
    doc.end();
  });
}

function generateReceiptPdf(data, ecoStats) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const { patient, cart, totalPrice, needsReport } = data;
    const brandColor = "#F97316", headerBgColor = "#FFF1EA", textColor = "#1F2937", lightTextColor = "#6B7280", tableHeaderBg = "#F3F4F6", tableEvenRowBg = "#FFFFFF", tableOddRowBg = "#F9FAFB";

    // Header and Billed To
    doc.rect(0, 0, doc.page.width, 130).fill(headerBgColor);
    doc.fontSize(32).font("Helvetica-Bold");
    const relWidth = doc.widthOfString("Rel"), ivWidth = doc.widthOfString("iv"), totalLogoWidth = relWidth + ivWidth;
    const logoStartX = 50;
    doc.fillColor(brandColor).text("Rel", logoStartX, 50, { continued: true }).fillColor(textColor).text("iv");
    doc.fontSize(10).font("Helvetica").fillColor(lightTextColor).text("Your Personalized Health checkup & Medicine Dispenser.", logoStartX, 85);
    doc.fontSize(18).font("Helvetica-Bold").fillColor(textColor).text("Purchase Receipt", 0, 65, { align: "right" });
    doc.fontSize(10).font("Helvetica").fillColor(lightTextColor).text(`Date: ${new Date().toLocaleDateString()}`, 0, 90, { align: "right" });
    doc.fontSize(14).font("Helvetica-Bold").fillColor(textColor).text("Billed To:", 50, 160);
    doc.font("Helvetica").fontSize(11).fillColor(lightTextColor);
    doc.text(patient.name || "N/A", 50, 180);
    doc.text(patient.email || "N/A", 50, 195);

    // Table
    let tableTop = 220;
    const itemX = 50, qtyX = 300, priceX = 370, totalX = 460;
    const tableHeaderHeight = 25, rowHeight = 30;
    const footerReserve = 100;
    let y = tableTop + tableHeaderHeight;
    let i = 0;

    const drawTableHeader = (headerY) => {
      doc.rect(50, headerY, 500, tableHeaderHeight).fill(tableHeaderBg);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
      doc.text("ITEM", itemX + 10, headerY + 8);
      doc.text("QTY", qtyX, headerY + 8, { width: 60, align: "center" });
      doc.text("PRICE", priceX, headerY + 8, { width: 80, align: "right" });
      doc.text("TOTAL", totalX, headerY + 8, { width: 90, align: "right" });
    };

    drawTableHeader(tableTop);

    const drawRow = (item, isEven) => {
      if (y + rowHeight > doc.page.height - footerReserve) {
        doc.addPage();
        y = 50;
        drawTableHeader(y);
        y += tableHeaderHeight;
      }
      doc.rect(50, y, 500, rowHeight).fill(isEven ? tableEvenRowBg : tableOddRowBg);
      doc.font("Helvetica").fontSize(10).fillColor(textColor);
      doc.text(item.name, itemX + 10, y + 10, { width: 230 });
      doc.text(item.quantity.toString(), qtyX, y + 10, { width: 60, align: "center" });
      doc.text(`INR ${item.price.toFixed(2)}`, priceX, y + 10, { width: 80, align: "right" });
      doc.text(`INR ${(item.price * item.quantity).toFixed(2)}`, totalX, y + 10, { width: 90, align: "right" });
      y += rowHeight;
      i++;
    };

    const items = [];
    if (needsReport) items.push({ name: "Health Checkup Report", quantity: 1, price: 500 });
    if (cart) items.push(...cart);

    items.forEach((item) => drawRow(item, i % 2 === 0));

    // Totals
    let totalY = y + 20;
    if (totalY + 50 > doc.page.height - footerReserve) {
      doc.addPage();
      totalY = 50;
    }
    doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor);
    doc.text("Total Paid:", 350, totalY, { width: 100, align: "right" });
    doc.fillColor(brandColor).text(`INR ${totalPrice.toFixed(2)}`, 450, totalY, { width: 100, align: "right" });

    // Footer
    doc.fontSize(10).font("Helvetica-Bold").fillColor(textColor).text("Thank you for your purchase!", 50, doc.page.height - 100, { align: "center" });
    if (ecoStats) {
      doc.fontSize(8).fillColor(lightTextColor).text(`Fun Fact: Your digital choice saved ~${ecoStats.individual.water}L of water & ~${ecoStats.individual.co2}g of CO2. Collectively, our users have saved ~${ecoStats.total.water}L of water, ~${ecoStats.total.co2}g of CO2, and ~${ecoStats.total.paper} sheets of paper!`, 50, doc.page.height - 80, { align: "center" });
    }
    doc.end();
  });
}

// --- Mail Transporter ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  pool: true,
  maxConnections: 20,
  rateLimit: 9,
});

// --- Caching Eco Stats ---
let cachedEcoStats = null;
const cacheTTL = 300000; // 5 minutes
async function getEcoStats() {
  if (cachedEcoStats && Date.now() - cachedEcoStats.timestamp < cacheTTL) {
    return cachedEcoStats.data;
  }
  const reportsCollection = db.collection("reports");
  const receiptsCollection = db.collection("receipts");
  const [reportCount, receiptCount] = await Promise.all([
    reportsCollection.countDocuments(),
    receiptsCollection.countDocuments(),
  ]);
  const totalDocuments = reportCount + receiptCount;
  const PAPER_SAVED_PER_DOC = 2, WATER_SAVED_PER_DOC = 20, CO2_SAVED_PER_DOC = 18;
  cachedEcoStats = {
    timestamp: Date.now(),
    data: {
      total: { paper: totalDocuments * PAPER_SAVED_PER_DOC, water: totalDocuments * WATER_SAVED_PER_DOC, co2: totalDocuments * CO2_SAVED_PER_DOC },
      individual: { paper: PAPER_SAVED_PER_DOC, water: WATER_SAVED_PER_DOC, co2: CO2_SAVED_PER_DOC },
    },
  };
  return cachedEcoStats.data;
}

// --- SerialPort for ESP32 ---
const esp32Port = new SerialPort({ path: "COM4", baudRate: 115200 }, (err) => {
  if (err) {
    console.error("Failed to open serial port on COM4:", err.message);
  } else {
    console.log("Serial port to ESP32 opened on COM4");
  }
});
const parser = esp32Port.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (data) => {
  console.log("Received from ESP32:", data);
});

function sendServoCommand(cart) {
  if (!cart || cart.length === 0) return;
  const command = cart.map((item) => `${item.id}:${item.quantity}`).join(",");
  console.log("Sending servo rotation command to ESP32:", command);
  esp32Port.write(command + "\n", (err) => {
    if (err) {
      console.error("Error on writing to ESP32:", err.message);
    } else {
      console.log("Command sent to ESP32 successfully");
    }
  });
}

// --- Kit Management Endpoints ---
app.get("/api/kits", async (req, res) => {
  try {
    const kitsCollection = db.collection("kits");
    const kits = await kitsCollection.find({}).toArray();
    res.json(kits);
  } catch (err) {
    console.error("Error fetching kits:", err);
    res.status(500).json({ message: "Failed to fetch kits" });
  }
});

app.post("/api/kits", async (req, res) => {
  try {
    const kit = req.body;
    if (!kit.id || !kit.name || !kit.description || !kit.price || !kit.quantity || !kit.expiryDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const kitsCollection = db.collection("kits");
    const existingKit = await kitsCollection.findOne({ id: kit.id });
    if (existingKit) {
      return res.status(400).json({ message: "Kit with this ID already exists" });
    }
    const result = await kitsCollection.insertOne({ ...kit, createdAt: new Date() });
    console.log(`Added new kit with ID ${kit.id}`);
    res.json({ ok: true, kitId: result.insertedId });
  } catch (err) {
    console.error("Error adding kit:", err);
    res.status(500).json({ message: "Failed to add kit" });
  }
});

app.patch("/api/kits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.folderUrl) {
      return res.status(400).json({ message: "Cannot update folderUrl" });
    }
    // Ensure updatedAt is a valid Date
    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    const kitsCollection = db.collection("kits");
    const result = await kitsCollection.updateOne(
      { id: parseInt(id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Kit not found" });
    }
    console.log(`Updated kit with ID ${id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error updating kit:", err);
    res.status(500).json({ message: "Failed to update kit" });
  }
});

app.patch("/api/kits/:id/image", async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Missing imageUrl" });
    }
    const kitsCollection = db.collection("kits");
    const result = await kitsCollection.updateOne(
      { id: parseInt(id) },
      { $set: { imageUrl, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Kit not found" });
    }
    console.log(`Updated imageUrl for kit with ID ${id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error updating kit imageUrl:", err);
    res.status(500).json({ message: "Failed to update kit imageUrl" });
  }
});

app.delete("/api/kits/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const kitsCollection = db.collection("kits");
    const result = await kitsCollection.deleteOne({ id: parseInt(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Kit not found" });
    }
    console.log(`Deleted kit with ID ${id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting kit:", err);
    res.status(500).json({ message: "Failed to delete kit" });
  }
});

// --- API Endpoints ---
app.get("/api/report/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid report ID" });
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) });
    if (!report) return res.status(404).json({ error: "Report not found" });
    const ecoStats = await getEcoStats();
    const pdfBuffer = await generateReportPdf(report, ecoStats);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Reliv-Health-Report-${report.patient.name || "user"}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error in /api/report/:id/download:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.post("/api/qr-code", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    const qrCode = await QRCode.toDataURL(url);
    res.json({ qrCode });
  } catch (err) {
    console.error("Error generating QR code:", err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: "Valid amount is required" });
    const options = { amount: amount * 100, currency: "INR", receipt: `receipt_order_${Date.now()}` };
    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).json({ error: "Error creating order" });
    res.json(order);
  } catch (err) {
    console.error("Error in /api/create-order:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/eco-stats", async (req, res) => {
  try {
    const ecoStats = await getEcoStats();
    res.json(ecoStats);
  } catch (err) {
    console.error("Error in /api/eco-stats:", err);
    res.status(500).json({ error: "Failed to fetch eco stats" });
  }
});

app.post("/api/save-report", async (req, res) => {
  try {
    const { healthData, bodyCompositionData } = req.body;
    if (!healthData) return res.status(400).json({ ok: false, message: "Missing health data" });
    const reportsCollection = db.collection("reports");
    const result = await reportsCollection.insertOne({ ...healthData, bodyComposition: bodyCompositionData, createdAt: new Date() });
    console.log("📈 Report data saved to MongoDB");
    res.json({ ok: true, reportId: result.insertedId });
  } catch (err) {
    console.error("Error in /api/save-report:", err);
    res.status(500).json({ ok: false, message: "Failed to save report" });
  }
});

app.post("/api/send-report", async (req, res) => {
  try {
    const { to, name, healthData, reportImage } = req.body;
    if (!to || !healthData) return res.status(400).json({ ok: false, message: "Missing email or health data" });
    const ecoStats = await getEcoStats();
    const pdfBuffer = reportImage ? await generatePdfFromImage(reportImage) : await generateReportPdf(healthData, ecoStats);

    const mailOptions = {
      from: `Reliv Reports <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your Health Report from Reliv, ${name || "User"}`,
      text: `Hi ${name || "User"},\n\nPlease find your health report attached.\n\nBest,\nThe Reliv Team`,
      attachments: [{ filename: `Reliv-Health-Report-${name || "user"}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Report sent to ${to}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/send-report:", err);
    res.status(500).json({ ok: false, message: "Failed to send report" });
  }
});

app.post("/api/send-receipt", async (req, res) => {
  try {
    const { patient, cart, totalPrice, needsReport } = req.body;
    if (!patient || !patient.email) return res.status(400).json({ ok: false, message: "Missing patient email" });
    if (!needsReport && (!cart || cart.length === 0 || !totalPrice)) return res.status(400).json({ ok: false, message: "Missing cart items for purchase" });

    // Update kit quantities in MongoDB
    const kitsCollection = db.collection("kits");
    for (const item of cart) {
      const kitId = parseInt(item.id);
      const kit = await kitsCollection.findOne({ id: kitId });
      if (!kit) {
        console.warn(`Kit with ID ${kitId} not found during receipt processing`);
        continue;
      }
      if (kit.quantity < item.quantity) {
        return res.status(400).json({ ok: false, message: `Insufficient quantity for kit ID ${kitId}` });
      }
      await kitsCollection.updateOne(
        { id: kitId },
        { $inc: { quantity: -item.quantity }, $set: { updatedAt: new Date().toISOString() } }
      );
      console.log(`Updated quantity for kit ID ${kitId}: -${item.quantity}`);
    }

    const receiptsCollection = db.collection("receipts");
    await receiptsCollection.insertOne({ patient, cart, totalPrice, needsReport, createdAt: new Date() });
    console.log("🧾 Receipt data saved to MongoDB");

    const ecoStats = await getEcoStats();
    sendServoCommand(cart);
    const pdfBuffer = await generateReceiptPdf({ patient, cart, totalPrice, needsReport }, ecoStats);

    const mailOptions = {
      from: `Reliv Receipts <${process.env.GMAIL_USER}>`,
      to: patient.email,
      subject: `Your Receipt from Reliv`,
      text: `Hi ${patient.name || "User"},\n\nPlease find your purchase receipt attached.\n\nBest,\nThe Reliv Team`,
      attachments: [{ filename: `Reliv-Receipt.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Sent receipt to ${patient.email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/send-receipt:", err);
    res.status(500).json({ ok: false, message: "Failed to send receipt" });
  }
});

app.get("/api/get-device-data", async (req, res) => {
  try {
    const response = await fetch("http://127.0.0.1:5001/get_ble_data");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error in /api/get-device-data:", error);
    res.status(500).json({ error: "Failed to fetch data from Python script" });
  }
});

// --- Admin and Authentication Routes ---
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Could not create data dir:", e);
  }
}

async function loadJsonSafe(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return content ? JSON.parse(content) : {};
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
    if (!email) return res.status(400).json({ error: "Email is required" });
    const reports = await db.collection("reports").find({ "patient.email": email }).sort({ createdAt: -1 }).limit(10).toArray();
    res.json(reports);
  } catch (err) {
    console.error("Error fetching report history:", err);
    res.status(500).json({ error: "Failed to fetch report history" });
  }
});

app.post("/api/send-reset-email", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ ok: false, message: "Missing 'to' (admin email)" });
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
    return res.json({ ok: true, message: "Recovery email sent" });
  } catch (err) {
    console.error("Error in /api/send-reset-email:", err);
    return res.status(500).json({ ok: false, message: "Failed to send reset email" });
  }
});

app.post("/api/confirm-reset", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ ok: false, message: "Missing parameters" });
    const store = await loadJsonSafe(TOKEN_STORE_FILE);
    const entry = store[email];
    if (!entry) return res.status(400).json({ ok: false, message: "No reset request found for this email" });
    if (Date.now() > entry.expiry) {
      delete store[email];
      await saveJsonSafe(TOKEN_STORE_FILE, store);
      return res.status(400).json({ ok: false, message: "Recovery code expired. Request a new one" });
    }
    const inputHash = crypto.createHash("sha256").update(token).digest("hex");
    if (inputHash !== entry.tokenHash) return res.status(400).json({ ok: false, message: "Invalid recovery code" });
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
    return res.status(500).json({ ok: false, message: "Failed to confirm reset" });
  }
});

app.post("/api/check-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, message: "Missing parameters" });
    const credStore = await loadJsonSafe(CRED_STORE_FILE);
    const user = credStore[email];
    if (!user) return res.status(400).json({ ok: false, message: "No such admin" });
    if (user.algorithm !== "pbkdf2") return res.status(500).json({ ok: false, message: "Unsupported algorithm" });
    const derived = crypto.pbkdf2Sync(password, user.salt, user.iterations, user.keyLen, user.digest).toString("hex");
    if (derived === user.hash) return res.json({ ok: true });
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("Error in /api/check-login:", err);
    return res.status(500).json({ ok: false, message: "Login check failed" });
  }
});

app.get("/api/gdrive-image/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const auth = new google.auth.GoogleAuth({ keyFile: SERVICE_ACCOUNT_KEY_PATH, scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
    const drive = google.drive({ version: "v3", auth });
    const fileMetadata = await drive.files.get({ fileId, fields: "mimeType" });
    const mimeType = fileMetadata.data.mimeType;
    if (!mimeType || !mimeType.startsWith("image/")) return res.status(400).json({ message: "File is not an image" });
    const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data);
    const imageBase64 = imageBuffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Google Drive API Error:", error.message);
    if (error.code === "ENOENT") return res.status(500).json({ message: "Service account key not found. Ensure 'service-account-key.json' is in the 'data' directory" });
    if (error.errors) {
      const apiError = error.errors[0];
      if (apiError.reason === "notFound") return res.status(404).json({ message: "File not found. Check the link and sharing settings" });
      if (apiError.reason === "forbidden") return res.status(403).json({ message: "Access denied. Share the file with your service account's email address" });
    }
    res.status(500).json({ message: "Error fetching image from Google Drive" });
  }
});

app.get("/api/gdrive-folder-image/:folderId", async (req, res) => {
  const { folderId } = req.params;
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY_PATH,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Fetch the first image sorted by creation time, excluding trashed files
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, mimeType, createdTime)",
      orderBy: "createdTime asc",
      pageSize: 1,
      spaces: "drive",
    });

    const files = response.data.files;
    if (!files || files.length === 0) {
      return res.status(404).json({ message: "No images found in the folder" });
    }

    const firstImage = files[0];
    const fileId = firstImage.id;
    const mimeType = firstImage.mimeType;

    // Fetch the image content
    const imageResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const imageBuffer = Buffer.from(imageResponse.data);
    const imageBase64 = imageBuffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;
    
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Google Drive Folder API Error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errors: error.errors,
    });
    if (error.code === "ENOENT") {
      return res.status(500).json({ message: "Service account key not found. Ensure 'service-account-key.json' is in the 'data' directory" });
    }
    if (error.errors) {
      const apiError = error.errors[0];
      if (apiError.reason === "notFound") {
        return res.status(404).json({ message: "Folder not found. Check the folder ID and sharing settings" });
      }
      if (apiError.reason === "forbidden") {
        return res.status(403).json({ message: "Access denied. Share the folder with your service account's email address" });
      }
      if (apiError.reason === "userRateLimitExceeded" || apiError.reason === "rateLimitExceeded") {
        return res.status(429).json({ message: "Rate limit exceeded. Please try again later" });
      }
    }
    res.status(500).json({ message: "Error fetching image from Google Drive folder" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});