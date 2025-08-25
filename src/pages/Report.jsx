// src/pages/Report.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useHealth } from "../context/HealthContext";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --- Helper Functions (assessBP, assessSpO2, etc. - unchanged) ---
function assessBP(sys, dia) {
  const s = Number(sys), d = Number(dia);
  if (!s || !d) return { label: "—", advice: "No BP values provided." };
  if (s < 120 && d < 80) return { label: "Normal", advice: "Great! Keep up a healthy lifestyle." };
  if (s < 130 && d < 80) return { label: "Elevated", advice: "Monitor regularly; consider diet/exercise." };
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) return { label: "Stage 1 Hypertension", advice: "Consult a clinician; lifestyle changes recommended." };
  if (s >= 140 || d >= 90) return { label: "Stage 2 Hypertension", advice: "Seek medical advice soon." };
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
function getSnellenEquivalent(line) {
    const lines = { '1': 200, '2': 100, '3': 70, '4': 50, '5': 40, '6': 30, '7': 25, '8': 20, '9': 15 };
    return lines[line] || '—';
}
function assessEyes(left, right) {
  if (!left && !right) return { summary: "—", note: "No eyesight input provided." };
  return {
    summary: `Left: 20/${getSnellenEquivalent(left)}, Right: 20/${getSnellenEquivalent(right)}`,
    note: "This is a basic screening. Smaller line numbers indicate better acuity.",
  };
}


// --- Main Report Component ---

export default function Report() {
  const { data } = useHealth();
  const navigate = useNavigate();
  const { patient, vitals } = data;
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const pdfRef = useRef();

  // 🚨 Stock reduction logic has been moved to OrderSuccess.jsx 🚨

  const computed = useMemo(() => ({
    bp: assessBP(vitals.systolic, vitals.diastolic),
    spo2: assessSpO2(vitals.spo2),
    pulse: assessPulse(vitals.pulse),
    temp: assessTempF(vitals.tempF),
    eyes: assessEyes(vitals.leftEye, vitals.rightEye),
  }), [vitals]);

  const generatePdf = async () => {
    const content = pdfRef.current;
    if (!content) return;
  
    content.classList.add('pdf-render');
  
    const canvas = await html2canvas(content, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: content.scrollWidth,
      windowHeight: content.scrollHeight,
    });
  
    content.classList.remove('pdf-render');
  
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    let heightLeft = pdfHeight;
    let position = 0;
  
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  
    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
    return pdf;
  };

  const handleDownloadPdf = async () => {
    const pdf = await generatePdf();
    pdf.save(`Reliv-Health-Report-${patient.name || 'user'}.pdf`);
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const pdf = await generatePdf();
      const pdfBase64 = pdf.output('datauristring');
      const res = await fetch("http://localhost:5000/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: patient.email, name: patient.name, pdf: pdfBase64 }),
      });
      const result = await res.json();
      if (result.ok) {
        if (result.previewUrl) {
          setPreviewUrl(result.previewUrl);
          alert("Report sent to test inbox. Opening preview...");
          window.open(result.previewUrl, "_blank");
        } else {
          alert("Report emailed successfully!");
        }
      } else {
        alert("Could not send email. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("An error occurred. Please check the server logs.");
    } finally {
      setSending(false);
    }
  };

  // ... rest of the component (JSX is unchanged)
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div ref={pdfRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <header className="bg-orange-500 text-white p-8 relative overflow-hidden">
             <div 
                className="absolute top-0 left-0 w-full h-full bg-orange-50"
                style={{ clipPath: 'ellipse(150% 100% at 50% -50%)', opacity: 0.1}}
             ></div>
            <div className="relative z-10 flex justify-center items-center mb-4">
               <h1 className="text-4xl font-extrabold leading-tight text-white">
                  <span className="text-white">Rel</span>
                  <span className="text-gray-800">iv</span>
                </h1>
            </div>
            <h2 className="relative z-10 text-2xl font-bold text-center text-white">Health Screening Report</h2>
          </header>

          <main className="p-8">
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">Patient Information</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-gray-700">
                <p><strong className="font-medium text-gray-500">Name:</strong> {patient.name || "N/A"}</p>
                <p><strong className="font-medium text-gray-500">Age:</strong> {patient.age || "N/A"}</p>
                <p><strong className="font-medium text-gray-500">Gender:</strong> {patient.gender || "N/A"}</p>
                <p><strong className="font-medium text-gray-500">Phone:</strong> {patient.phone || "N/A"}</p>
                <p className="col-span-2"><strong className="font-medium text-gray-500">Email:</strong> {patient.email || "N/A"}</p>
              </div>
            </section>
            <section>
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-6">Health Vitals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VitalCard label="Blood Pressure" value={`${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg`} status={computed.bp.label} note={computed.bp.advice} />
                <VitalCard label="Oxygen Saturation (SpO₂)" value={`${vitals.spo2 || "—"} %`} status={computed.spo2.label} note={computed.spo2.advice} />
                <VitalCard label="Pulse Rate" value={`${vitals.pulse || "—"} BPM`} status={computed.pulse.label} note={computed.pulse.advice} />
                <VitalCard label="Body Temperature" value={`${vitals.tempF || "—"} °F`} status={computed.temp.label} note={computed.temp.advice} />
                <VitalCard className="md:col-span-2" label="Visual Acuity" value={computed.eyes.summary} status="Screening Result" note={computed.eyes.note} />
              </div>
            </section>
            <footer className="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
              <p>This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.</p>
              <p>&copy; {new Date().getFullYear()} Reliv. All rights reserved.</p>
            </footer>
          </main>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <button onClick={handleSendEmail} disabled={sending || !patient.email} className="bg-orange-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-orange-600 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
            {sending ? "Sending..." : "Email Report"}
          </button>
          {sending && (
            <span className="block w-full text-center text-xs text-gray-500 mt-2">
              😉 Your report will be sent within a day!
            </span>
          )}
          <button onClick={handleDownloadPdf} className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-800 transition-transform transform hover:scale-105">
            Download PDF
          </button>
          <button onClick={() => navigate('/')} className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-300 transition-transform transform hover:scale-105">
            Home
          </button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-300 transition-transform transform hover:scale-105 text-center">
              Open Test Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// --- New Reusable VitalCard Component (unchanged) ---
const VitalCard = ({ label, value, status, note, className = "" }) => {
    const getStatusColor = (statusLabel) => {
        const lowerCaseStatus = statusLabel.toLowerCase();
        if (['normal'].includes(lowerCaseStatus)) return 'bg-green-100 text-green-800';
        if (['elevated', 'borderline'].includes(lowerCaseStatus)) return 'bg-yellow-100 text-yellow-800';
        if (['stage 1 hypertension', 'stage 2 hypertension', 'high', 'fever', 'low'].includes(lowerCaseStatus)) return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    };
    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:border-orange-200 ${className}`}>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        {status !== 'Screening Result' && (
            <div className="mt-3 flex items-center">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                {status}
            </span>
            </div>
        )}
        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">{note}</p>
        </div>
    );
};