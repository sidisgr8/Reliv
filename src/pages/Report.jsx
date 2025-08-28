import React, { useEffect, useMemo, useState, useRef } from "react";
import { useHealth } from "../context/HealthContext";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import UVCleansingAnimation from "../components/UVCleansingAnimation";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import * as bodyComposition from "../utils/bodyComposition";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// --- Helper Functions (assessBP, assessSpO2, etc. - unchanged) ---
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

const VitalsHistoryChart = ({ history, currentVitals }) => {
  const combinedHistory = [
    ...history,
    { ...currentVitals, createdAt: new Date() },
  ]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10); // Limit to last 10 entries for clarity

  const chartData = {
    labels: combinedHistory.map((h) =>
      new Date(h.createdAt).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Systolic BP",
        data: combinedHistory.map((h) => h.vitals.systolic),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        yAxisID: "y",
      },
      {
        label: "Diastolic BP",
        data: combinedHistory.map((h) => h.vitals.diastolic),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        yAxisID: "y",
      },
      {
        label: "Pulse",
        data: combinedHistory.map((h) => h.vitals.pulse),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        yAxisID: "y",
      },
      {
        label: "SpO2",
        data: combinedHistory.map((h) => h.vitals.spo2),
        borderColor: "rgb(153, 102, 255)",
        backgroundColor: "rgba(153, 102, 255, 0.5)",
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Vitals History",
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    animation: {
      duration: 0,
    },
  };

  return <Line options={options} data={chartData} />;
};

const BodyCompositionChart = ({ compositionData }) => {
  const data = {
    labels: ["Fat", "Muscle", "Bone", "Water"],
    datasets: [
      {
        label: "Body Composition %",
        data: [
          compositionData.fat_percent,
          compositionData.muscle_percent,
          compositionData.bone_percent,
          compositionData.water_percent,
        ],
        backgroundColor: [
          "rgba(255, 99, 132, 0.2)",
          "rgba(54, 162, 235, 0.2)",
          "rgba(255, 206, 86, 0.2)",
          "rgba(75, 192, 192, 0.2)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Body Composition Breakdown",
      },
    },
  };

  return <Doughnut data={data} options={options} />;
};

// --- Main Report Component ---

export default function Report() {
  const { data } = useHealth();
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, vitals } = data;
  const [sending, setSending] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCleansing, setShowCleansing] = useState(false); // State to control animation
  const [ecoStats, setEcoStats] = useState(null);
  const pdfRef = useRef();
  const stockUpdated = useRef(false);
  const [history, setHistory] = useState([]);
  const [qrCode, setQrCode] = useState("");
  const [reportId, setReportId] = useState(null);

  const bodyCompositionData = useMemo(() => {
    if (!vitals.weight || !patient.age || !patient.gender) {
      return null;
    }
    const sex = patient.gender.toLowerCase() === "male" ? 1 : 0;
    const { weight, impedance } = vitals;
    const { age } = patient;
    const height = 170; // Assuming a default height, you might want to ask for this too

    const fat_percent = bodyComposition.calc_fat_percent(
      weight,
      height,
      sex,
      age,
      impedance
    );
    const muscle_percent = bodyComposition.calc_muscle_percent(
      weight,
      height,
      sex,
      age,
      impedance
    );
    const water_percent = bodyComposition.calc_water_percent(
      weight,
      height,
      sex,
      age,
      impedance
    );
    const bone_mass = bodyComposition.calc_bone_mass(
      weight,
      height,
      sex,
      age,
      impedance
    );
    const bone_percent = bodyComposition.calc_bone_percent(weight, bone_mass);

    return {
      bmi: bodyComposition.calc_bmi(weight, height),
      fat_percent,
      fat_mass: bodyComposition.calc_fat_mass(weight, fat_percent),
      muscle_percent,
      muscle_mass: bodyComposition.calc_muscle_mass(weight, muscle_percent),
      water_percent,
      water_mass: bodyComposition.calc_water_mass(weight, water_percent),
      bone_mass,
      bone_percent,
      protein_percent: bodyComposition.calc_protein_percent(muscle_percent),
      visceral_fat_level: bodyComposition.calc_visceral_fat_level(
        weight,
        height,
        sex,
        age,
        impedance
      ),
      bmr: bodyComposition.calc_bmr(weight, height, sex, age),
      metabolic_age: bodyComposition.calc_metabolic_age(
        bodyComposition.calc_bmr(weight, height, sex, age),
        age,
        sex
      ),
    };
  }, [vitals, patient]);

  useEffect(() => {
    const fetchHistoryAndGenerateQR = async () => {
      if (patient.email) {
        try {
          // Fetch history
          const historyRes = await fetch(
            `http://localhost:5000/api/reports/history/${patient.email}`
          );
          const historyData = await historyRes.json();
          setHistory(historyData);

          // Save current report and get ID
          const reportRes = await fetch(
            "http://localhost:5000/api/save-report",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                healthData: data,
              }),
            }
          );
          const reportData = await reportRes.json();
          if (reportData.ok) {
            setReportId(reportData.reportId);
            // Generate QR code
            const qrRes = await fetch("http://localhost:5000/api/qr-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: `http://localhost:5000/api/report/${reportData.reportId}/download`,
              }),
            });
            const qrData = await qrRes.json();
            setQrCode(qrData.qrCode);
          }
        } catch (error) {
          console.error(
            "Failed to fetch report history or generate QR code:",
            error
          );
        }
      }
    };
    fetchHistoryAndGenerateQR();
  }, [patient.email, data]);

  // Fetch eco stats on component mount
  useEffect(() => {
    const fetchEcoStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/eco-stats");
        const stats = await res.json();
        setEcoStats(stats);
      } catch (error) {
        console.error("Failed to fetch eco stats:", error);
      }
    };
    fetchEcoStats();
  }, []);

  // Stock reduction logic for any kits purchased with the report
  useEffect(() => {
    if (stockUpdated.current) {
      return;
    }

    const { cart } = location.state || {};
    if (cart && cart.length > 0) {
      console.log("Processing stock reduction for cart on Report page:", cart);
      try {
        const storedKitsRaw = localStorage.getItem("medicalKits_v1");
        if (storedKitsRaw) {
          const storedKits = JSON.parse(storedKitsRaw);
          const updatedKits = storedKits.map((kit) => {
            const cartItem = cart.find((item) => item.id === kit.id);
            if (cartItem) {
              return { ...kit, quantity: kit.quantity - cartItem.quantity };
            }
            return kit;
          });
          localStorage.setItem("medicalKits_v1", JSON.stringify(updatedKits));
          console.log("✅ Stock updated successfully from Report page.");
          stockUpdated.current = true;
        }
      } catch (error) {
        console.error("Failed to update stock from Report page:", error);
      }
    }
  }, [location.state]);

  const computed = useMemo(
    () => ({
      bp: assessBP(vitals.systolic, vitals.diastolic),
      spo2: assessSpO2(vitals.spo2),
      pulse: assessPulse(vitals.pulse),
      temp: assessTempF(vitals.tempF),
      eyes: assessEyes(vitals.leftEye, vitals.rightEye),
    }),
    [vitals]
  );

  const generatePdf = async () => {
    const content = pdfRef.current;
    if (!content) return;

    content.classList.add("pdf-render");

    const canvas = await html2canvas(content, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: content.scrollWidth,
      windowHeight: content.scrollHeight,
    });

    content.classList.remove("pdf-render");

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    return pdf;
  };

  const handleDownloadPdf = async () => {
    const pdf = await generatePdf();
    pdf.save(`Reliv-Health-Report-${patient.name || "user"}.pdf`);
  };

  const handleSendEmail = async () => {
    setSending(true);
    const content = pdfRef.current;
    content.classList.add("pdf-render");
    const canvas = await html2canvas(content, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: content.scrollWidth,
      windowHeight: content.scrollHeight,
    });
    content.classList.remove("pdf-render");
    const imgData = canvas.toDataURL("image/png");

    try {
      const res = await fetch("http://localhost:5000/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: patient.email,
          name: patient.name,
          healthData: data,
          reportImage: imgData,
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setShowCleansing(true); // Trigger the animation on success
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

  const handleReadAloud = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = `
      Health Screening Report for ${patient.name || "the user"}.
      Patient Information:
      Name: ${patient.name || "Not provided"}.
      Age: ${patient.age || "Not provided"}.
      Gender: ${patient.gender || "Not provided"}.
      Phone: ${patient.phone || "Not provided"}.
      Email: ${patient.email || "Not provided"}.
      Health Vitals:
      Blood Pressure: ${vitals.systolic || "none"} over ${
      vitals.diastolic || "none"
    }. Status: ${computed.bp.label}. Advice: ${computed.bp.advice}.
      Oxygen Saturation: ${vitals.spo2 || "none"} percent. Status: ${
      computed.spo2.label
    }. Advice: ${computed.spo2.advice}.
      Pulse Rate: ${vitals.pulse || "none"} B P M. Status: ${
      computed.pulse.label
    }. Advice: ${computed.pulse.advice}.
      Body Temperature: ${vitals.tempF || "none"} degrees Fahrenheit. Status: ${
      computed.temp.label
    }. Advice: ${computed.temp.advice}.
      Visual Acuity: ${computed.eyes.summary}. Note: ${computed.eyes.note}.
      This report is for informational purposes only.
    `;

    const utterance = new SpeechSynthesisUtterance(textToRead.trim());
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Cleanup speech on component unmount
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div
          ref={pdfRef}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <header className="bg-orange-500 text-white p-8 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-full bg-orange-50"
              style={{
                clipPath: "ellipse(150% 100% at 50% -50%)",
                opacity: 0.1,
              }}
            ></div>
            <div className="relative z-10 flex justify-center items-center mb-4">
              <h1 className="text-4xl font-extrabold leading-tight text-white">
                <span className="text-white">Rel</span>
                <span className="text-gray-800">iv</span>
              </h1>
            </div>
            <h2 className="relative z-10 text-2xl font-bold text-center text-white">
              Health Screening Report
            </h2>
          </header>

          <main className="p-8">
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-gray-700">
                <p>
                  <strong className="font-medium text-gray-500">Name:</strong>{" "}
                  {patient.name || "N/A"}
                </p>
                <p>
                  <strong className="font-medium text-gray-500">Age:</strong>{" "}
                  {patient.age || "N/A"}
                </p>
                <p>
                  <strong className="font-medium text-gray-500">
                    Gender:
                  </strong>{" "}
                  {patient.gender || "N/A"}
                </p>
                <p>
                  <strong className="font-medium text-gray-500">
                    Phone:
                  </strong>{" "}
                  {patient.phone || "N/A"}
                </p>
                <p className="col-span-2">
                  <strong className="font-medium text-gray-500">
                    Email:
                  </strong>{" "}
                  {patient.email || "N/A"}
                </p>
              </div>
            </section>
            <section>
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-6">
                Health Vitals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VitalCard
                  label="Blood Pressure"
                  value={`${vitals.systolic || "—"}/${
                    vitals.diastolic || "—"
                  } mmHg`}
                  status={computed.bp.label}
                  note={computed.bp.advice}
                />
                <VitalCard
                  label="Oxygen Saturation (SpO₂)"
                  value={`${vitals.spo2 || "—"} %`}
                  status={computed.spo2.label}
                  note={computed.spo2.advice}
                />
                <VitalCard
                  label="Pulse Rate"
                  value={`${vitals.pulse || "—"} BPM`}
                  status={computed.pulse.label}
                  note={computed.pulse.advice}
                />
                <VitalCard
                  label="Body Temperature"
                  value={`${vitals.tempF || "—"} °F`}
                  status={computed.temp.label}
                  note={computed.temp.advice}
                />
                <VitalCard
                  className="md:col-span-2"
                  label="Visual Acuity"
                  value={computed.eyes.summary}
                  status="Screening Result"
                  note={computed.eyes.note}
                />
              </div>
            </section>
            {bodyCompositionData && (
              <section className="mt-8">
                <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">
                  Body Composition
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <VitalCard
                    label="BMI"
                    value={bodyCompositionData.bmi.toFixed(1)}
                    status="Body Mass Index"
                    note="A measure of body fat based on height and weight."
                  />
                  <VitalCard
                    label="Body Fat"
                    value={`${bodyCompositionData.fat_percent.toFixed(1)}%`}
                    status="Fat Percentage"
                    note={`${bodyCompositionData.fat_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Muscle"
                    value={`${bodyCompositionData.muscle_percent.toFixed(1)}%`}
                    status="Muscle Percentage"
                    note={`${bodyCompositionData.muscle_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Water"
                    value={`${bodyCompositionData.water_percent.toFixed(1)}%`}
                    status="Water Percentage"
                    note={`${bodyCompositionData.water_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Bone Mass"
                    value={`${bodyCompositionData.bone_mass.toFixed(1)} kg`}
                    status="Bone Mass"
                    note={`${bodyCompositionData.bone_percent.toFixed(1)} %`}
                  />
                  <VitalCard
                    label="Protein"
                    value={`${bodyCompositionData.protein_percent.toFixed(
                      1
                    )}%`}
                    status="Protein Percentage"
                    note="Essential for muscle repair and growth."
                  />
                  <VitalCard
                    label="Visceral Fat"
                    value={bodyCompositionData.visceral_fat_level}
                    status="Level"
                    note="Fat surrounding your organs."
                  />
                  <VitalCard
                    label="BMR"
                    value={`${bodyCompositionData.bmr.toFixed(0)} kcal`}
                    status="Basal Metabolic Rate"
                    note="Calories your body burns at rest."
                  />
                  <VitalCard
                    label="Metabolic Age"
                    value={bodyCompositionData.metabolic_age}
                    status="Years"
                    note="Your body's age based on metabolism."
                  />
                </div>
              </section>
            )}
            {history.length > 0 && (
              <section className="mt-8">
                <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">
                  Vitals History
                </h3>
                <VitalsHistoryChart history={history} currentVitals={data} />
              </section>
            )}
            {bodyCompositionData && (
              <section className="mt-8">
                <BodyCompositionChart compositionData={bodyCompositionData} />
              </section>
            )}
            {qrCode && (
              <section className="mt-8 text-center">
                <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">
                  Download Your Report
                </h3>
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code to download report" />
                </div>
              </section>
            )}
            <footer className="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
              <p>
                This report is for informational purposes only and is not a
                substitute for professional medical advice, diagnosis, or
                treatment.
              </p>
              <p>
                &copy; {new Date().getFullYear()} Reliv. All rights reserved.
              </p>
              {ecoStats && (
                <p className="mt-2">
                  Fun Fact: Your digital choice saved ~
                  {ecoStats.individual.water}L of water & ~
                  {ecoStats.individual.co2}g of CO2. Collectively, our users
                  have saved ~{ecoStats.total.water}L of water, ~
                  {ecoStats.total.co2}g of CO2, and ~{ecoStats.total.paper}{" "}
                  sheets of paper!
                </p>
              )}
            </footer>
          </main>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <button
            onClick={handleReadAloud}
            className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-600 transition-transform transform hover:scale-105"
          >
            {isSpeaking ? "Stop Reading" : "Read Report Aloud"}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={sending || !patient.email}
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-orange-600 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Email Report"}
          </button>
          <button
            onClick={handleDownloadPdf}
            className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-800 transition-transform transform hover:scale-105"
          >
            Download PDF
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-300 transition-transform transform hover:scale-105"
          >
            Home
          </button>
        </div>
      </div>

      {/* Conditionally render the animation overlay */}
      {showCleansing && (
        <UVCleansingAnimation onComplete={() => navigate("/")} />
      )}
    </div>
  );
}

// --- Reusable VitalCard Component ---
const VitalCard = ({ label, value, status, note, className = "" }) => {
  const getStatusColor = (statusLabel) => {
    const lowerCaseStatus = statusLabel.toLowerCase();
    if (["normal"].includes(lowerCaseStatus))
      return "bg-green-100 text-green-800";
    if (["elevated", "borderline"].includes(lowerCaseStatus))
      return "bg-yellow-100 text-yellow-800";
    if (
      [
        "stage 1 hypertension",
        "stage 2 hypertension",
        "high",
        "fever",
        "low",
      ].includes(lowerCaseStatus)
    )
      return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-all duration-300 hover:shadow-md hover:border-orange-200 ${className}`}
    >
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {status !== "Screening Result" && (
        <div className="mt-3 flex items-center">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              status
            )}`}
          >
            {status}
          </span>
        </div>
      )}
      <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
        {note}
      </p>
    </div>
  );
};