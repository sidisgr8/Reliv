import React, { useMemo, useState } from "react";
import { useHealth } from "../context/HealthContext";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";

function assessBP(sys, dia) {
  const s = Number(sys), d = Number(dia);
  if (!s || !d) return { label: "—", advice: "No BP values provided." };
  if (s < 120 && d < 80) return { label: "Normal", advice: "Great! Keep up a healthy lifestyle." };
  if (s < 130 && d < 80) return { label: "Elevated", advice: "Monitor regularly; consider diet/exercise." };
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89))
    return { label: "Stage 1 Hypertension", advice: "Consult a clinician; lifestyle changes recommended." };
  if (s >= 140 || d >= 90)
    return { label: "Stage 2 Hypertension", advice: "Seek medical advice soon." };
  return { label: "—", advice: "Check values." };
}
function assessSpO2(spo2) {
  const v = Number(spo2);
  if (!v) return { label: "—", advice: "No SpO₂ value provided." };
  if (v >= 95) return { label: "Normal", advice: "Oxygen saturation is within normal range." };
  if (v >= 90) return { label: "Borderline", advice: "Monitor; if symptoms occur, contact a clinician." };
  return { label: "Low", advice: "Low oxygen level; seek care if persistent." };
}
function assessPulse(pulse) {
  const v = Number(pulse);
  if (!v) return { label: "—", advice: "No pulse value provided." };
  if (v >= 60 && v <= 100) return { label: "Normal", advice: "Resting heart rate is within normal range." };
  if (v < 60) return { label: "Low", advice: "Could be normal for athletes; else, monitor." };
  return { label: "High", advice: "Tachycardia; consider rest and consult if persistent." };
}
function assessTempF(t) {
  const v = Number(t);
  if (!v) return { label: "—", advice: "No temperature provided." };
  if (v < 97) return { label: "Low", advice: "Slightly low; ensure warmth and re-check." };
  if (v <= 99) return { label: "Normal", advice: "Within normal range." };
  if (v < 100.4) return { label: "Elevated", advice: "Mild elevation; monitor." };
  return { label: "Fever", advice: "Possible fever; consider medical advice." };
}
function assessEyes(left, right) {
  if (!left && !right) return { summary: "—", note: "No eyesight input provided." };
  return {
    summary: `Left line: ${left || "—"}, Right line: ${right || "—"}`,
    note: "Smaller line number indicates better acuity. This is a screening only.",
  };
}

export default function Report() {
  const { data } = useHealth();
  const { patient, vitals } = data;
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const computed = useMemo(() => {
    return {
      bp: assessBP(vitals.systolic, vitals.diastolic),
      spo2: assessSpO2(vitals.spo2),
      pulse: assessPulse(vitals.pulse),
      temp: assessTempF(vitals.tempF),
      eyes: assessEyes(vitals.leftEye, vitals.rightEye),
    };
  }, [vitals]);

  // HTML used in the email body (simple inline styles for better email client support)
  const emailHtml = useMemo(() => {
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:16px;">
        <h2 style="color:#111;margin:0 0 8px;"><span style="color:#E85C25">Rel</span><strong>iv</strong> – Health Report</h2>
        <p style="margin:0 0 16px;color:#333;">Hi ${patient.name || "there"}, here is your screening summary.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr><td colspan="2" style="padding:8px 0;"><strong>Patient</strong></td></tr>
            <tr><td style="padding:6px 0;color:#555;">Name</td><td>${patient.name || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#555;">Age</td><td>${patient.age || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#555;">Gender</td><td>${patient.gender || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#555;">Phone</td><td>${patient.phone || "—"}</td></tr>
          </tbody>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            <tr><td colspan="2" style="padding:8px 0;"><strong>Measurements</strong></td></tr>
            <tr><td style="padding:6px 0;color:#555;">Blood Pressure</td>
                <td>${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg — <strong>${computed.bp.label}</strong><br/><span style="color:#666;">${computed.bp.advice}</span></td></tr>
            <tr><td style="padding:6px 0;color:#555;">SpO₂</td>
                <td>${vitals.spo2 || "—"}% — <strong>${computed.spo2.label}</strong><br/><span style="color:#666;">${computed.spo2.advice}</span></td></tr>
            <tr><td style="padding:6px 0;color:#555;">Pulse</td>
                <td>${vitals.pulse || "—"} bpm — <strong>${computed.pulse.label}</strong><br/><span style="color:#666;">${computed.pulse.advice}</span></td></tr>
            <tr><td style="padding:6px 0;color:#555;">Temperature</td>
                <td>${vitals.tempF || "—"} °F — <strong>${computed.temp.label}</strong><br/><span style="color:#666;">${computed.temp.advice}</span></td></tr>
            <tr><td style="padding:6px 0;color:#555;">Eye Sight</td>
                <td>${computed.eyes.summary}<br/><span style="color:#666;">${computed.eyes.note}</span></td></tr>
          </tbody>
        </table>
        <p style="margin-top:16px;color:#888;font-size:12px;">
          This report is informational and not a medical diagnosis. Please consult a qualified clinician for concerns.
        </p>
      </div>
    `;
  }, [patient, vitals, computed]);

  const sendEmail = async () => {
    try {
      setSending(true);
      const res = await fetch("http://localhost:5000/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: patient.email,
          name: patient.name,
          html: emailHtml,
        }),
      });
      const data = await res.json();
      setSending(false);
      if (data.ok) {
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
          alert("Report sent (test inbox). Opening preview link...");
          window.open(data.previewUrl, "_blank");
        } else {
          alert("Report emailed successfully.");
        }
      } else {
        alert("Could not send email.");
      }
    } catch (e) {
      setSending(false);
      console.error(e);
      alert("Send failed. Check the server logs.");
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <TopEllipseBackground color="#FFF1EA" height="40%" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-center mb-4"><Logo /></div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-6">Your Health Report</h1>

        <div className="bg-white rounded-2xl shadow p-5 md:p-8 space-y-6">
          <section>
            <h2 className="font-semibold text-lg mb-2">Patient</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Name:</span> {patient.name || "—"}</div>
              <div><span className="text-gray-500">Age:</span> {patient.age || "—"}</div>
              <div><span className="text-gray-500">Gender:</span> {patient.gender || "—"}</div>
              <div><span className="text-gray-500">Phone:</span> {patient.phone || "—"}</div>
              <div className="md:col-span-2"><span className="text-gray-500">Email:</span> {patient.email || "—"}</div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card label="Blood Pressure" value={`${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg`} status={computed.bp.label} note={computed.bp.advice} />
            <Card label="SpO₂" value={`${vitals.spo2 || "—"} %`} status={computed.spo2.label} note={computed.spo2.advice} />
            <Card label="Pulse" value={`${vitals.pulse || "—"} bpm`} status={computed.pulse.label} note={computed.pulse.advice} />
            <Card label="Temperature" value={`${vitals.tempF || "—"} °F`} status={computed.temp.label} note={computed.temp.advice} />
            <Card className="md:col-span-2" label="Eye Sight" value={computed.eyes.summary} status="Screening" note={computed.eyes.note} />
          </section>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <button
              onClick={sendEmail}
              disabled={sending || !patient.email}
              className="px-6 py-3 bg-[#E85C25] text-white rounded-lg font-semibold shadow disabled:opacity-60"
            >
              {sending ? "Sending..." : "Email this report"}
            </button>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-gray-100 rounded-lg font-semibold shadow text-gray-700 text-center"
              >
                Open test email preview
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, status, note, className = "" }) {
  return (
    <div className={`bg-[#FFF8F4] rounded-2xl p-4 shadow-sm ${className}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="mt-1 text-sm"><span className="font-semibold">{status}</span></div>
      <div className="text-xs text-gray-600 mt-1">{note}</div>
    </div>
  );
}
