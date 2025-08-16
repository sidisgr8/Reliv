import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

// --- Payment mock (optional, keeps your current flow) ---
app.post("/create-order", (req, res) => {
  res.json({ id: "order_mock_123456", amount: 50000, currency: "INR" });
});

// --- Email route ---
let cachedTransporter = null;

async function getTestTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const testAccount = await nodemailer.createTestAccount(); // Ethereal (no signup)
  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log("📬 Ethereal test account ready:", testAccount.user);
  return cachedTransporter;
}

app.post("/send-report", async (req, res) => {
  try {
    const { to, name, html } = req.body;

    const transporter = await getTestTransporter();

    const info = await transporter.sendMail({
      from: 'Reliv Reports <reports@reliv.test>',
      to: to || "test@example.com", // if no email entered, send to a placeholder
      subject: `Your Reliv Health Report${name ? ` – ${name}` : ""}`,
      html: html || "<p>No content</p>",
    });

    const previewUrl = nodemailer.getTestMessageUrl(info); // preview link for Ethereal
    console.log("✅ Email sent. Preview URL:", previewUrl);
    res.json({ ok: true, previewUrl });
  } catch (e) {
    console.error("Email error:", e);
    res.status(500).json({ ok: false });
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});
