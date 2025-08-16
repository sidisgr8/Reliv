import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());

// ✅ FIX: Increased the limit to 50mb to handle large PDF files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


// --- Mock payment route ---
app.post("/create-order", (req, res) => {
  res.json({ id: "order_mock_123456", amount: 50000, currency: "INR" });
});


// --- REAL GMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER, // Loaded from .env
    pass: process.env.GMAIL_PASS, // Loaded from .env
  },
});


app.post("/send-report", async (req, res) => {
  try {
    const { to, name, pdf } = req.body;

    if (!pdf) {
      return res.status(400).json({ ok: false, message: "PDF data is missing." });
    }

    const mailOptions = {
      from: `Reliv Reports <${process.env.GMAIL_USER}>`,
      to: to,
      subject: `Your Reliv Health Report${name ? ` – ${name}` : ""}`,
      html: `<p>Hi ${name || 'there'},</p><p>Your personalized health report is attached.</p>`,
      attachments: [
        {
          filename: 'health-report.pdf',
          content: pdf.split('base64,')[1],
          encoding: 'base64',
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email successfully sent to ${to}`);
    res.json({ ok: true });

  } catch (e) {
    console.error("Email sending error:", e);
    res.status(500).json({ ok: false, message: "Failed to send the email." });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});