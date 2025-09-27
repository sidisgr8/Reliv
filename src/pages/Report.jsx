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
import VirtualKeyboard from "../components/VirtualKeyboard";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { HeartIcon, EyeIcon, ScaleIcon, FireIcon, UserIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
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

// --- Helper Functions ---
function assessBP(sys, dia) {
  const s = Number(sys), d = Number(dia);
  if (!s || !d) return { label: "—", advice: "No BP values provided." };
  if (s < 100 || d < 65)
    return {
      label: "Low",
      advice: "May cause tiredness or dizziness. Try drinking water, coconut water, or adding a pinch of salt if not restricted.",
    };
  if (s >= 110 && s < 131 && d >= 72 && d < 89)
    return {
      label: "Normal",
      advice: "Healthy and considered normal for most Indians.",
    };
  return {
    label: "High",
    advice: "May mean stress or extra salt in diet. Reduce salt, eat fruits/veggies, practice deep breathing.",
  };
}

function assessOxygen(oxygen) {
  const v = Number(oxygen);
  if (!v) return { label: "—", advice: "No oxygen value provided." };
  if (v < 94)
    return {
      label: "Low",
      advice: "May feel breathless or fatigued. Try sitting upright, doing deep breathing, or checking air quality.",
    };
  return { label: "Normal", advice: "Healthy oxygen level." };
}

function assessPulse(pulse, isAthlete = false) {
  const v = Number(pulse);
  if (!v) return { label: "—", advice: "No pulse value provided." };
  if (v < 55 && !isAthlete)
    return {
      label: "Low",
      advice: "May feel weak or dizzy. Rest, hydrate, and eat a light snack.",
    };
  if (v >= 60 && v <= 100)
    return {
      label: "Normal",
      advice: "Good: Resting heart rate is within normal range.",
    };
  return {
    label: "High",
    advice: "Could be due to stress, caffeine, or dehydration. Drink water, slow your breathing, and rest, or running.",
  };
}

function assessTempF(t) {
  const v = Number(t);
  if (!v) return { label: "—", advice: "No temperature provided." };
  if (v < 96.8)
    return {
      label: "Low",
      advice: "Feeling cold, shivering. Keep warm, drink warm fluids.",
    };
  if (v >= 96.9 && v <= 99.8)
    return { label: "Normal", advice: "Good: Within normal range." };
  return {
    label: "High",
    advice: "Fever. Rest, drink fluids, sponge with lukewarm water.",
  };
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
  if (!left && !right) {
    return {
      summary: "—",
      note: "No eyesight input provided.",
      comment: "Please provide eye test results for assessment.",
    };
  }

  const leftSnellen = getSnellenEquivalent(left);
  const rightSnellen = getSnellenEquivalent(right);
  const summary = `Left: 20/${leftSnellen}, Right: 20/${rightSnellen}`;
  let leftComment = "",
    rightComment = "",
    combinedComment = "";

  if (leftSnellen !== "—") {
    if (leftSnellen <= 15)
      leftComment = "Good: Better than normal eyesight, nothing to worry about(left).";
    else if (leftSnellen <= 40)
      leftComment = "Normal: Great vision in your left eye—keep it up!";
    else
      leftComment = "Low: Blurry vision. Use proper lighting, take blink breaks, consult eye doctor if needed(left).";
  }

  if (rightSnellen !== "—") {
    if (rightSnellen <= 15)
      rightComment = "Good: Better than normal eyesight, nothing to worry about(right).";
    else if (rightSnellen <= 40)
      rightComment = "Normal: Excellent vision in your right eye—maintain healthy habits!";
    else
      rightComment = "Low: Blurry vision. Use proper lighting, take blink breaks, consult eye doctor if needed.(right).";
  }

  const worseSnellen = Math.max(
    leftSnellen === "—" ? 0 : leftSnellen,
    rightSnellen === "—" ? 0 : rightSnellen
  );
  if (worseSnellen <= 15)
    combinedComment = "Good: Better than normal eyesight, nothing to worry about.";
  else if (worseSnellen <= 40)
    combinedComment = "Normal: Both eyes are in great shape—keep nurturing your eye health!";
  else
    combinedComment = "Low: Blurry vision. Use proper lighting, take blink breaks, consult eye doctor if needed.";

  return {
    summary,
    note: combinedComment,
    comment: `${leftComment} ${rightComment} Overall, ${combinedComment}`,
  };
}

function assessBodyComposition(data) {
  if (!data) return {};
  const { bmi, fat_percent, muscle_percent, water_percent, bone_percent, protein_percent, visceral_fat_level, ffmi } = data;
  return {
    bmi: bmi < 18.5 ? "Low" : bmi <= 24.9 ? "Normal" : "High",
    fat_percent: fat_percent < 10 ? "Low" : fat_percent <= 23 ? "Normal" : "High",
    muscle_percent: muscle_percent < 32 ? "Low" : muscle_percent <= 44 ? "Normal" : "High",
    water_percent: water_percent < 48 ? "Low" : water_percent <= 65 ? "Normal" : "High",
    bone_percent: bone_percent < 2 ? "Low" : bone_percent <= 4 ? "Normal" : "High",
    protein_percent: protein_percent < 15 ? "Low" : protein_percent <= 22 ? "Normal" : "High",
    visceral_fat_level: visceral_fat_level < 1 ? "Low" : visceral_fat_level <= 9 ? "Normal" : "High",
    ffmi: ffmi < 17 ? "Low" : ffmi <= 20 ? "Normal" : "High",
  };
}

// --- Vitals History Chart ---
const VitalsHistoryChart = ({ history, currentVitals }) => {
  const current = { healthData: currentVitals, createdAt: new Date() };
  const combinedHistory = [...history, current]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10);

  const chartData = {
    labels: combinedHistory.map((h) => new Date(h.createdAt).toLocaleDateString()),
    datasets: [
      {
        label: "Systolic BP",
        data: combinedHistory.map((h) => h.healthData?.vitals?.systolic || h.vitals?.systolic),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        yAxisID: "y",
      },
      {
        label: "Diastolic BP",
        data: combinedHistory.map((h) => h.healthData?.vitals?.diastolic || h.vitals?.diastolic),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        yAxisID: "y",
      },
      {
        label: "Pulse",
        data: combinedHistory.map((h) => h.healthData?.vitals?.bpm || h.vitals?.bpm),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        yAxisID: "y",
      },
      {
        label: "Oxygen",
        data: combinedHistory.map((h) => h.healthData?.vitals?.oxygen || h.vitals?.oxygen),
        borderColor: "rgb(153, 102, 255)",
        backgroundColor: "rgba(153, 102, 255, 0.5)",
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: "Vitals History Trend", font: { size: 18, weight: 'bold' } },
    },
    scales: {
      y: { type: "linear", display: true, position: "left" },
      y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false } },
    },
    animation: { duration: 1000, easing: 'easeInOutQuad' },
  };

  return <Line options={options} data={chartData} />;
};

// --- Body Composition Chart ---
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
        backgroundColor: ["rgba(255, 99, 132, 0.3)", "rgba(54, 162, 235, 0.3)", "rgba(255, 206, 86, 0.3)", "rgba(75, 192, 192, 0.3)"],
        borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)", "rgba(75, 192, 192, 1)"],
        borderWidth: 2,
        hoverOffset: 20,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { 
        display: true, 
        text: "Body Composition", 
        font: { size: 16, weight: 'bold' },
        padding: { top: 10, bottom: 10 }
      },
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 12 },
          padding: 15,
          boxWidth: 20,
        }
      },
      tooltip: { 
        enabled: true, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        titleFont: { size: 12 },
        bodyFont: { size: 10 },
        padding: 8
      },
    },
    animation: { duration: 1500, easing: 'easeInOutQuart' },
    cutout: '60%',
  };

  return (
    <div className="w-full max-w-[300px] h-[300px] mx-auto">
      <Doughnut data={data} options={options} />
    </div>
  );
};

// --- Progress Bar Component ---
const ProgressBar = ({ value, min, max, ranges, unit }) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  let color = 'bg-gray-200';
  for (const [label, start, end, bg] of ranges) {
    if (value >= start && value <= end) {
      color = bg;
      break;
    }
  }
  return (
    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mt-2">
      <div className={`absolute h-full ${color}`} style={{ width: `${percentage}%` }} />
      <div className="absolute top-[-20px] left-0 w-full flex justify-between text-xs text-gray-500">
        <span>Insufficient</span><span>Low</span><span>Standard</span><span>High</span><span>Too High</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {value} {unit}
      </div>
    </div>
  );
};

// --- Progress Ring Component ---
const ProgressRing = ({ score }) => {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="mx-auto">
      <circle
        stroke="#E5E7EB"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="#F28C38"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="transition-all duration-1000 ease-in-out"
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-3xl font-bold text-[#F28C38]">
        {score}
      </text>
    </svg>
  );
};

// --- Status Color Helper ---
function getStatusColor(status) {
  if (!status) return "bg-gray-100 text-gray-800";
  const lowerCaseStatus = status.toLowerCase();
  if (lowerCaseStatus === "normal") return "bg-green-100 text-green-800";
  if (["low", "high"].includes(lowerCaseStatus)) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

// --- Status Class Helper ---
function getStatusClass(label) {
  if (label === 'Normal') return 'bg-green-50 border-green-200';
  if (['Low', 'High'].includes(label)) return 'bg-red-50 border-red-200';
  return 'bg-gray-50 border-gray-200';
}

// --- Main Report Component ---
export default function Report() {
  const { data } = useHealth();
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, vitals } = data;
  const [isSendingMyReport, setIsSendingMyReport] = useState(false);
  const [isSendingDoctorReport, setIsSendingDoctorReport] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCleansing, setShowCleansing] = useState(false);
  const [ecoStats, setEcoStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [doctorEmail, setDoctorEmail] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardInputName, setKeyboardInputName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [reportId, setReportId] = useState(null);

  const pdfRef = useRef();
  const referenceRef = useRef();
  const stockUpdated = useRef(false);
  const emailSectionRef = useRef();

  const allInputs = { doctorEmail };

  const handleInputFocus = (e) => {
    setIsKeyboardVisible(true);
    setKeyboardInputName(e.target.name);
    setTimeout(() => {
      emailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleKeyboardChange = (name, value) => {
    if (name === "doctorEmail") {
      setDoctorEmail(value);
    }
  };

  const tempF = vitals.temperature ? vitals.temperature.toFixed(1) : null;

  const bodyCompositionData = useMemo(() => {
    if (!vitals.weight || !patient.age || !patient.gender || !vitals.height || !vitals.impedance) {
      return null;
    }
    const sex = patient.gender.toLowerCase() === "male" ? 1 : 0;
    const { weight, impedance, height } = vitals;
    const { age } = patient;

    const fat_percent = bodyComposition.calc_fat_percent(weight, height, sex, age, impedance);
    const fat_mass = bodyComposition.calc_fat_mass(weight, fat_percent);
    const muscle_percent = bodyComposition.calc_muscle_percent(weight, height, sex, age, impedance);
    const muscle_mass = bodyComposition.calc_muscle_mass(weight, muscle_percent);
    const water_percent = bodyComposition.calc_water_percent(weight, height, sex, age, impedance);
    const bone_mass = bodyComposition.calc_bone_mass(weight, height, sex, age, impedance);
    const bone_percent = bodyComposition.calc_bone_percent(weight, bone_mass);
    const standard_weight = bodyComposition.calc_standard_weight(height);
    const subcutaneous_fat_percent = bodyComposition.calc_subcutaneous_fat_percent(fat_percent);

    return {
      bmi: bodyComposition.calc_bmi(weight, height),
      fat_percent,
      fat_mass,
      muscle_percent,
      muscle_mass,
      water_percent,
      water_mass: bodyComposition.calc_water_mass(weight, water_percent),
      bone_mass,
      bone_percent,
      protein_percent: bodyComposition.calc_protein_percent(muscle_percent),
      protein_mass: bodyComposition.calc_protein_mass(weight, bodyComposition.calc_protein_percent(muscle_percent)),
      visceral_fat_level: bodyComposition.calc_visceral_fat_level(weight, height, sex, age, impedance),
      bmr: bodyComposition.calc_bmr(weight, height, sex, age),
      metabolic_age: bodyComposition.calc_metabolic_age(bodyComposition.calc_bmr(weight, height, sex, age), age, sex),
      skeletal_muscle_percent: bodyComposition.calc_skeletal_muscle_percent(muscle_percent),
      subcutaneous_fat_percent,
      subcutaneous_fat_mass: bodyComposition.calc_subcutaneous_fat_mass(weight, subcutaneous_fat_percent),
      fat_free_weight: bodyComposition.calc_fat_free_weight(weight, fat_mass),
      body_surface_area: bodyComposition.calc_body_surface_area(height, weight),
      ideal_body_weight: bodyComposition.calc_ideal_body_weight(height, sex),
      standard_weight,
      weight_control: bodyComposition.calc_weight_control(standard_weight, weight),
      fat_control: bodyComposition.calc_fat_control(weight, fat_percent, sex),
      muscle_control: bodyComposition.calc_muscle_control(weight, muscle_percent),
      body_score: bodyComposition.calc_body_score(weight, height, sex, age, impedance),
      ffmi: bodyComposition.calc_ffmi(weight, height, fat_mass),
    };
  }, [vitals, patient]);

  useEffect(() => {
    const fetchHistoryAndGenerateQR = async () => {
      if (patient.email) {
        try {
          const historyRes = await fetch(`http://localhost:5000/api/reports/history/${patient.email}`);
          const historyData = await historyRes.json();
          setHistory(historyData);

          const reportRes = await fetch("http://localhost:5000/api/save-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ healthData: data, bodyCompositionData }),
          });
          const reportData = await reportRes.json();
          if (reportData.ok) {
            setReportId(reportData.reportId);
            const qrRes = await fetch("http://localhost:5000/api/qr-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: `http://localhost:5000/api/report/${reportData.reportId}/download` }),
            });
            const qrData = await qrRes.json();
            setQrCode(qrData.qrCode);
          }
        } catch (error) {
          console.error("Failed to fetch report history or generate QR code:", error);
        }
      }
    };
    fetchHistoryAndGenerateQR();
  }, [patient.email, data, bodyCompositionData]);

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

  useEffect(() => {
    if (stockUpdated.current) return;
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
      oxygen: assessOxygen(vitals.oxygen),
      pulse: assessPulse(vitals.bpm, patient.isAthlete),
      temp: assessTempF(tempF),
      eyes: assessEyes(vitals.leftEye, vitals.rightEye),
      body: assessBodyComposition(bodyCompositionData),
    }),
    [vitals, tempF, patient.isAthlete, bodyCompositionData]
  );

  useEffect(() => {
    const allNormal = Object.values(computed).every(c => c.label === "Normal" || (c.body && Object.values(c.body).every(s => s === "Normal")));
    if (allNormal) {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#F28C38', '#16A085', '#FF8C42'] });
    }
  }, [computed]);

  const captureReport = async () => {
    const content = pdfRef.current;
    if (!content) return null;
    content.classList.add("pdf-render");
    const canvas = await html2canvas(content, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: content.scrollWidth,
      windowHeight: content.scrollHeight,
    });
    content.classList.remove("pdf-render");
    return canvas.toDataURL("image/png");
  };

  const handleSendMyReport = async () => {
    if (!patient.email) {
      alert("Patient email is not available.");
      return;
    }
    setIsSendingMyReport(true);
    const imgData = await captureReport();
    try {
      const res = await fetch("http://localhost:5000/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: patient.email, name: patient.name, healthData: data, reportImage: imgData }),
      });
      const result = await res.json();
      if (result.ok) {
        setShowCleansing(true);
      } else {
        alert("Could not send your report. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send patient email:", error);
      alert("An error occurred while sending your report.");
    } finally {
      setIsSendingMyReport(false);
    }
  };

  const handleSendDoctorReport = async () => {
    if (!doctorEmail) {
      alert("Please provide the doctor's email address.");
      return;
    }
    setIsSendingDoctorReport(true);
    const imgData = await captureReport();
    try {
      const res = await fetch("http://localhost:5000/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: doctorEmail, name: patient.name, healthData: data, reportImage: imgData }),
      });
      const result = await res.json();
      if (result.ok) {
        alert(`Report successfully sent to ${doctorEmail}`);
        setDoctorEmail("");
      } else {
        alert("Could not send the report to the doctor. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send doctor email:", error);
      alert("An error occurred while sending the report.");
    } finally {
      setIsSendingDoctorReport(false);
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
      Blood Pressure: ${vitals.systolic || "none"} over ${vitals.diastolic || "none"} millimeters of mercury. Status: ${computed.bp.label}. Advice: ${computed.bp.advice}.
      Oxygen Saturation: ${vitals.oxygen || "none"} percent. Status: ${computed.oxygen.label}. Advice: ${computed.oxygen.advice}.
      Pulse Rate: ${vitals.bpm || "none"} beats per minute. Status: ${computed.pulse.label}. Advice: ${computed.pulse.advice}.
      Body Temperature: ${tempF || "none"} degrees Fahrenheit. Status: ${computed.temp.label}. Advice: ${computed.temp.advice}.
      Visual Acuity: ${computed.eyes.summary}. Note: ${computed.eyes.note}.
      This report is for informational purposes only.
    `;

    const utterance = new SpeechSynthesisUtterance(textToRead.trim());
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) speechSynthesis.cancel();
    };
  }, [isSpeaking]);

  const weightStatus = bodyCompositionData ? (
    bodyCompositionData.bmi < 18.5 ? "Low" : bodyCompositionData.bmi <= 24.9 ? "Normal" : "High"
  ) : "—";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen py-12 px-4 transition-all duration-300 ${isKeyboardVisible ? "pb-96" : "pb-12"} overflow-y-auto`}
    >
      <div className="max-w-4xl mx-auto">
        <div ref={pdfRef} className="bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-gray-200">
          <header className="bg-gray-200 text-gray-800 p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHBhdGggZD0iTTAgMTAwIEwwIDAgTDEwMCAwIiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPgo8L3N2Zz4=')]"/>
            <div className="relative z-10 flex justify-center items-center mb-4">
              <h1 className="text-5xl font-extrabold tracking-tight drop-shadow">
                <span className="text-[#F28C38]">Rel</span><span className="text-black">iv</span>
              </h1>
            </div>
            <h2 className="relative z-10 text-3xl font-bold text-center drop-shadow">Your Comprehensive Health Report</h2>
            {qrCode && (
              <div className="absolute top-4 right-4">
                <img src={qrCode} alt="QR Code to download report" className="w-24 h-24 rounded-lg shadow-sm" />
              </div>
            )}
          </header>

          <main className="p-8 space-y-12">
            <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 border-b-2 border-gray-300 pb-3 mb-6">
                <UserIcon className="h-6 w-6 text-[#F28C38]" /> Patient Details
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-gray-700">
                <p className="hover:bg-gray-100 rounded p-1 transition"><strong className="font-medium text-gray-500">Name:</strong> {patient.name || "N/A"}</p>
                <p className="hover:bg-gray-100 rounded p-1 transition"><strong className="font-medium text-gray-500">Age:</strong> {patient.age || "N/A"}</p>
                <p className="hover:bg-gray-100 rounded p-1 transition"><strong className="font-medium text-gray-500">Gender:</strong> {patient.gender || "N/A"}</p>
                <p className="hover:bg-gray-100 rounded p-1 transition"><strong className="font-medium text-gray-500">Phone:</strong> {patient.phone || "N/A"}</p>
                <p className="col-span-2 hover:bg-gray-100 rounded p-1 transition"><strong className="font-medium text-gray-500">Email:</strong> {patient.email || "N/A"}</p>
              </div>
            </motion.section>

            <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 border-b-2 border-gray-300 pb-3 mb-6">
                <HeartIcon className="h-6 w-6 text-[#F28C38]" /> Vital Signs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VitalCard
                  label="Blood Pressure"
                  value={`${vitals.systolic || "—"}/${vitals.diastolic || "—"} mmHg`}
                  status={computed.bp.label}
                  note={computed.bp.advice}
                  icon={<HeartIcon className="h-6 w-6 text-[#F28C38]" />}
                />
                <VitalCard
                  label="Oxygen Saturation"
                  value={`${vitals.oxygen || "—"} %`}
                  status={computed.oxygen.label}
                  note={computed.oxygen.advice}
                  progress={{ value: vitals.oxygen || 0, min: 80, max: 100, ranges: [['Insufficient', 0, 80, 'bg-red-500'], ['Low', 80, 94, 'bg-orange-500'], ['Standard', 94, 100, 'bg-green-500'], ['High', 100, Infinity, 'bg-blue-500']], unit: "%" }}
                  icon={<HeartIcon className="h-6 w-6 text-[#F28C38]" />}
                />
                <VitalCard
                  label="Pulse Rate"
                  value={`${vitals.bpm || "—"} BPM`}
                  status={computed.pulse.label}
                  note={computed.pulse.advice}
                  progress={{ value: vitals.bpm || 0, min: 40, max: 160, ranges: [['Insufficient', 0, 40, 'bg-blue-500'], ['Low', 40, 60, 'bg-blue-300'], ['Standard', 60, 100, 'bg-green-500'], ['High', 100, 160, 'bg-orange-500'], ['Too High', 160, Infinity, 'bg-red-500']], unit: "BPM" }}
                  icon={<HeartIcon className="h-6 w-6 text-[#F28C38]" />}
                />
                <VitalCard
                  label="Body Temperature"
                  value={`${tempF || "—"} °F`}
                  status={computed.temp.label}
                  note={computed.temp.advice}
                  progress={{ value: tempF || 0, min: 90, max: 105, ranges: [['Insufficient', 0, 95, 'bg-blue-500'], ['Low', 95, 97, 'bg-blue-300'], ['Standard', 97, 99, 'bg-green-500'], ['High', 99, 103, 'bg-orange-500'], ['Too High', 103, Infinity, 'bg-red-500']], unit: "°F" }}
                  icon={<HeartIcon className="h-6 w-6 text-[#F28C38]" />}
                />
                <VitalCard
                  className="md:col-span-2"
                  label="Visual Acuity"
                  value={computed.eyes.summary}
                  status="Screening Result"
                  note={computed.eyes.note}
                  icon={<EyeIcon className="h-6 w-6 text-[#F28C38]" />}
                />
              </div>
            </motion.section>

            {bodyCompositionData && (
              <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 border-b-2 border-gray-300 pb-3 mb-6">
                  <ScaleIcon className="h-6 w-6 text-[#F28C38]" /> Body Composition Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <VitalCard
                    label="BMI"
                    value={bodyCompositionData.bmi.toFixed(1)}
                    status={computed.body.bmi}
                    note="Body Mass Index"
                    progress={{ value: bodyCompositionData.bmi, min: 10, max: 40, ranges: [['Insufficient', 0, 15, 'bg-blue-500'], ['Low', 15, 18.5, 'bg-blue-300'], ['Standard', 18.5, 24.9, 'bg-green-500'], ['High', 24.9, 30, 'bg-orange-500'], ['Too High', 30, Infinity, 'bg-red-500']] }}
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Body Fat"
                    value={`${bodyCompositionData.fat_percent.toFixed(1)}% (${bodyCompositionData.fat_mass.toFixed(1)} kg)`}
                    status={computed.body.fat_percent}
                    note="Essential for energy storage"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Subcutaneous Fat"
                    value={`${bodyCompositionData.subcutaneous_fat_percent.toFixed(1)}% (${bodyCompositionData.subcutaneous_fat_mass.toFixed(1)} kg)`}
                    status={computed.body.fat_percent}
                    note="Fat under the skin"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Muscle"
                    value={`${bodyCompositionData.muscle_percent.toFixed(1)}% (${bodyCompositionData.muscle_mass.toFixed(1)} kg)`}
                    status={computed.body.muscle_percent}
                    note="Supports strength and movement"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Skeletal Muscle"
                    value={`${bodyCompositionData.skeletal_muscle_percent.toFixed(1)}%`}
                    status={computed.body.muscle_percent}
                    note="Voluntary muscle for movement"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Water"
                    value={`${bodyCompositionData.water_percent.toFixed(1)}% (${bodyCompositionData.water_mass.toFixed(1)} kg)`}
                    status={computed.body.water_percent}
                    note="Vital for bodily functions"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Bone Mass"
                    value={`${bodyCompositionData.bone_mass.toFixed(1)} kg (${bodyCompositionData.bone_percent.toFixed(1)}%)`}
                    status={computed.body.bone_percent}
                    note="Supports structure and strength"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Protein"
                    value={`${bodyCompositionData.protein_percent.toFixed(1)}% (${bodyCompositionData.protein_mass.toFixed(1)} kg)`}
                    status={computed.body.protein_percent}
                    note="Essential for tissue repair"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Visceral Fat"
                    value={bodyCompositionData.visceral_fat_level}
                    status={computed.body.visceral_fat_level}
                    note="Fat around organs"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="BMR"
                    value={`${bodyCompositionData.bmr.toFixed(0)} kcal`}
                    status="Basal Metabolic Rate"
                    note="Calories burned at rest"
                    icon={<FireIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Metabolic Age"
                    value={bodyCompositionData.metabolic_age}
                    status={bodyCompositionData.metabolic_age <= patient.age ? "Optimal" : "High"}
                    note="Compared to actual age"
                    icon={<FireIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Fat-Free Body Weight"
                    value={`${bodyCompositionData.fat_free_weight.toFixed(2)} kg`}
                    status={computed.body.fat_free_weight}
                    note="Weight excluding fat"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Body Surface Area"
                    value={`${bodyCompositionData.body_surface_area.toFixed(2)} m²`}
                    status={computed.body.body_surface_area}
                    note="Total skin surface"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Ideal Body Weight"
                    value={`${bodyCompositionData.ideal_body_weight.toFixed(2)} kg`}
                    status={Math.abs(bodyCompositionData.ideal_body_weight - vitals.weight) < 5 ? "Normal" : "Adjust"}
                    note="Based on height"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Standard Weight"
                    value={`${bodyCompositionData.standard_weight.toFixed(2)} kg`}
                    status={Math.abs(bodyCompositionData.standard_weight - vitals.weight) < 5 ? "Normal" : "Adjust"}
                    note="Optimal weight range"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Weight Control"
                    value={`${bodyCompositionData.weight_control.toFixed(2)} kg`}
                    status={Math.abs(bodyCompositionData.weight_control) < 1 ? "Normal" : bodyCompositionData.weight_control > 0 ? "Gain" : "Lose"}
                    note="Adjustment needed"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Fat Control"
                    value={`${bodyCompositionData.fat_control.toFixed(2)} kg`}
                    status={Math.abs(bodyCompositionData.fat_control) < 1 ? "Normal" : bodyCompositionData.fat_control > 0 ? "Gain" : "Lose"}
                    note="Fat adjustment"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="Muscle Control"
                    value={`${bodyCompositionData.muscle_control.toFixed(2)} kg`}
                    status={Math.abs(bodyCompositionData.muscle_control) < 1 ? "Normal" : bodyCompositionData.muscle_control > 0 ? "Gain" : "Lose"}
                    note="Muscle adjustment"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <VitalCard
                    label="FFMI"
                    value={bodyCompositionData.ffmi.toFixed(1)}
                    status={computed.body.ffmi}
                    note="Fat-Free Mass Index"
                    icon={<ScaleIcon className="h-6 w-6 text-[#F28C38]" />}
                  />
                  <div className="col-span-full relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="w-32 h-32 mx-auto flex items-center justify-center"
                    >
                      <ProgressRing score={bodyCompositionData.body_score} />
                    </motion.div>
                    <p className="text-center mt-2 text-sm font-medium">Overall Health Score</p>
                  </div>
                </div>
              </motion.section>
            )}

            {history.length > 0 && (
              <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
                <VitalsHistoryChart history={history} currentVitals={data} />
              </motion.section>
            )}

            {bodyCompositionData && (
              <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
                <BodyCompositionChart compositionData={bodyCompositionData} />
              </motion.section>
            )}

            <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.0 }}>
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center gap-2 border-b-2 border-gray-300 pb-3 mb-6">
                <FireIcon className="h-6 w-6 text-[#F28C38]" /> Your Personalized Health Insights
              </h3>
              <div className="space-y-4">
                <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.bp.label)}`}>
                  <strong>Blood Pressure:</strong> {vitals.systolic || "—"}/{vitals.diastolic || "—"} mmHg - <span className={getStatusColor(computed.bp.label)}>{computed.bp.label}</span>. {computed.bp.advice}
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.oxygen.label)}`}>
                  <strong>Oxygen Saturation:</strong> {vitals.oxygen || "—"}% - <span className={getStatusColor(computed.oxygen.label)}>{computed.oxygen.label}</span>. {computed.oxygen.advice}
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.pulse.label)}`}>
                  <strong>Pulse Rate:</strong> {vitals.bpm || "—"} BPM - <span className={getStatusColor(computed.pulse.label)}>{computed.pulse.label}</span>. {computed.pulse.advice}
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.temp.label)}`}>
                  <strong>Body Temperature:</strong> {tempF || "—"} °F - <span className={getStatusColor(computed.temp.label)}>{computed.temp.label}</span>. {computed.temp.advice}
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.eyes.label)}`}>
                  <strong>Visual Acuity:</strong> {computed.eyes.summary} - <span className={getStatusColor(computed.eyes.note.split(': ')[0])}>{computed.eyes.note.split(': ')[0]}</span>. {computed.eyes.comment}
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(weightStatus)}`}>
                  <strong>Body Weight:</strong> {vitals.weight || "—"} kg - <span className={getStatusColor(weightStatus)}>{weightStatus}</span>. {bodyCompositionData?.weight_control > 0 ? "Consider gaining with nutrient-dense foods like nuts and dairy." : bodyCompositionData?.weight_control < 0 ? "Aim to lose through balanced meals and activity." : "Perfect balance—keep it up with consistent habits."}
                </motion.div>
                {bodyCompositionData && (
                  <>
                    <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.body.fat_percent)}`}>
                      <strong>Body Fat:</strong> {bodyCompositionData.fat_percent.toFixed(1)}% ({bodyCompositionData.fat_mass.toFixed(1)} kg) - <span className={getStatusColor(computed.body.fat_percent)}>{computed.body.fat_percent}</span>. {computed.body.fat_percent === "Normal" ? "Healthy fat levels." : computed.body.fat_percent === "Low" ? "Consider balanced diet to increase." : "Reduce with exercise and diet."}
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.body.muscle_percent)}`}>
                      <strong>Muscle:</strong> {bodyCompositionData.muscle_percent.toFixed(1)}% ({bodyCompositionData.muscle_mass.toFixed(1)} kg) - <span className={getStatusColor(computed.body.muscle_percent)}>{computed.body.muscle_percent}</span>. {computed.body.muscle_percent === "Normal" ? "Great muscle mass." : computed.body.muscle_percent === "Low" ? "Incorporate strength training." : "Maintain with regular exercise."}
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.body.water_percent)}`}>
                      <strong>Water:</strong> {bodyCompositionData.water_percent.toFixed(1)}% ({bodyCompositionData.water_mass.toFixed(1)} kg) - <span className={getStatusColor(computed.body.water_percent)}>{computed.body.water_percent}</span>. {computed.body.water_percent === "Normal" ? "Well-hydrated." : computed.body.water_percent === "Low" ? "Increase water intake." : "Monitor hydration levels."}
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.body.protein_percent)}`}>
                      <strong>Protein:</strong> {bodyCompositionData.protein_percent.toFixed(1)}% ({bodyCompositionData.protein_mass.toFixed(1)} kg) - <span className={getStatusColor(computed.body.protein_percent)}>{computed.body.protein_percent}</span>. {computed.body.protein_percent === "Normal" ? "Optimal protein levels." : computed.body.protein_percent === "Low" ? "Add protein-rich foods like eggs or lentils." : "Maintain with balanced diet."}
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className={`p-4 rounded-xl shadow-md bg-gradient-to-r from-white to-gray-50 ${getStatusClass(computed.body.visceral_fat_level)}`}>
                      <strong>Visceral Fat:</strong> {bodyCompositionData.visceral_fat_level} - <span className={getStatusColor(computed.body.visceral_fat_level)}>{computed.body.visceral_fat_level}</span>. {computed.body.visceral_fat_level === "Normal" ? "Healthy organ fat levels." : computed.body.visceral_fat_level === "High" ? "Reduce with cardio and diet." : "Maintain low levels."}
                    </motion.div>
                  </>
                )}
                <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl shadow-md bg-gradient-to-r from-green-100 to-green-200 text-green-800">
                  You're making excellent progress on your wellness journey! Keep up the great work for lasting health.
                </motion.div>
              </div>
            </motion.section>

            <motion.section ref={referenceRef} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }} className="px-8 pb-8">
              <h3 className="text-2xl font-semibold text-gray-800 border-b-2 border-gray-300 pb-3 mb-6">
                Body Composition Reference Guide
              </h3>
              <div className="text-gray-700 text-sm overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Metric</th>
                      <th className="border p-2 text-left">Men</th>
                      <th className="border p-2 text-left">Women</th>
                      <th className="border p-2 text-left">Formula/Notes</th>
                    </tr>
                  </thead>
                  <tbody className="[& tr:nth-child(even)]:bg-gray-50">
                    <tr>
                      <td className="border p-2">BMI</td>
                      <td className="border p-2">Low: &lt;18.5<br />Normal: 18.5–24.9<br />High: ≥25</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Weight (kg) ÷ [Height (m)]²</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Fat %</td>
                      <td className="border p-2">Low: &lt;10%<br />Normal: 11–23%<br />High: &gt;25%</td>
                      <td className="border p-2">Low: &lt;18%<br />Normal: 18–28%<br />High: &gt;32%</td>
                      <td className="border p-2">Bioelectrical impedance-based</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Subcutaneous Fat %</td>
                      <td className="border p-2">Low: &lt;10%<br />Normal: ~15%<br />High: &gt;25%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Varies; Body Weight × % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Muscle %</td>
                      <td className="border p-2">Low: &lt;32%<br />Normal: 32–44%<br />High: &gt;44%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Body Weight × % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Skeletal Muscle %</td>
                      <td className="border p-2">Low: &lt;28%<br />Normal: 28–35%<br />High: &gt;35%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Subset of Muscle %</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Water %</td>
                      <td className="border p-2">Low: &lt;48%<br />Normal: 48–65%<br />High: &gt;65%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Bioelectrical impedance-based</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Bone Mass</td>
                      <td className="border p-2">Low: &lt;2 kg<br />Normal: 2–4 kg<br />High: &gt;4 kg</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Bioelectrical impedance-based</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Protein %</td>
                      <td className="border p-2">Low: &lt;15%<br />Normal: 15–22%<br />High: &gt;22%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Body Weight × % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Visceral Fat Level</td>
                      <td className="border p-2">Low: 0–1<br />Normal: 1–9<br />High: ≥10</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Body Fat Mass × 0.15 approx.</td>
                    </tr>
                    <tr>
                      <td className="border p-2">BMR</td>
                      <td className="border p-2">Low: &lt;1300 kcal<br />Normal: 1400–1800 kcal<br />High: &gt;2000 kcal</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Depends on age/weight</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Metabolic Age</td>
                      <td className="border p-2">Low: &lt; real age<br />Normal: = real age<br />High: &gt; real age</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Close to or lower than real age</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Fat-Free Body Weight</td>
                      <td className="border p-2">Low: &lt;70%<br />Normal: 70–80%<br />High: &gt;80%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Weight - Fat Mass</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Surface Area</td>
                      <td className="border p-2">Low: &lt;1.6 m²<br />Normal: 1.6–2.0 m²<br />High: &gt;2.0 m²</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">sqrt(Height*Weight/3600)</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Ideal Body Weight</td>
                      <td className="border p-2">Normal: BMI 22 based on height</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Devine formula adjusted</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Weight/Fat/Muscle Control</td>
                      <td className="border p-2" colSpan="2">Normal: Close to 0 (balanced)</td>
                      <td className="border p-2">Positive: gain; Negative: reduce</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Score</td>
                      <td className="border p-2">Low: &lt;75<br />Normal: 80–90<br />Good: 90–95<br />Excellent: &gt;95</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Composite score</td>
                    </tr>
                    <tr>
                      <td className="border p-2">FFMI</td>
                      <td className="border p-2">Low: &lt;17<br />Normal: 17–20<br />High: &gt;21</td>
                      <td className="border p-2">Low: &lt;14<br />Normal: 14–17<br />High: &gt;18</td>
                      <td className="border p-2">Fat-Free Mass ÷ Height²</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Impedance</td>
                      <td className="border p-2" colSpan="2">Lower with more muscle/water</td>
                      <td className="border p-2">Varies by hydration, size</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-4 text-xs">
                  These ranges are generalized for Indians (~68–70% population) as reference, not diagnosis. For body fat and water %, depends on body type; consult professional for tips. Want to be a part of the Team and know more? WhatsApp 9163606455.
                </p>
              </div>
            </motion.section>

            <footer className="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
              <p>This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.</p>
              <p>&copy; {new Date().getFullYear()} Reliv. All rights reserved.</p>
              {ecoStats && (
                <p className="mt-2">
                  Fun Fact: Your digital choice saved ~{ecoStats.individual.water}L of water & ~{ecoStats.individual.co2}g of CO2. Collectively, our users have saved ~{ecoStats.total.water}L of water, ~{ecoStats.total.co2}g of CO2, and ~{ecoStats.total.paper} sheets of paper!
                </p>
              )}
            </footer>
          </main>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReadAloud}
            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-200"
          >
            {isSpeaking ? "Pause Reading" : "Listen to Report"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMyReport}
            disabled={isSendingMyReport || !patient.email}
            className="bg-[#F28C38] text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-[#FFA06A] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingMyReport ? "Sending..." : "Email My Report"}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-gray-300 transition-all duration-200"
          >
            Home
          </motion.button>
        </div>

        <div ref={emailSectionRef} className="mt-6 text-center">
          <input
            type="email"
            name="doctorEmail"
            value={doctorEmail}
            onChange={(e) => setDoctorEmail(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="Enter Doctor's Email..."
            className="border border-gray-300 rounded-xl px-4 py-3 w-full max-w-sm mx-auto shadow-sm focus:ring-2 focus:ring-[#F28C38] bg-white"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendDoctorReport}
            disabled={isSendingDoctorReport || !doctorEmail}
            className="mt-4 bg-[#16A085] text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-[#1ABC9C] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingDoctorReport ? "Sending..." : "Send to Doctor"}
          </motion.button>
        </div>

        {showCleansing && <UVCleansingAnimation onComplete={() => navigate("/")} />}

        {isKeyboardVisible && (
          <VirtualKeyboard
            inputName={keyboardInputName}
            inputs={allInputs}
            onChange={handleKeyboardChange}
            onClose={() => setIsKeyboardVisible(false)}
            className="fixed bottom-0 left-0 right-0 z-50"
          />
        )}
      </div>
    </motion.div>
  );
}

// --- Vital Card Component ---
const VitalCard = ({ label, value, status, note, className = "", progress, icon }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-100 shadow-md p-6 transition-shadow hover:shadow-lg ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-base font-semibold text-gray-600">{label}</p>
      </div>
      <p className="text-4xl font-extrabold text-gray-900">{value}</p>
      {progress && <ProgressBar {...progress} />}
      {status && status !== "Screening Result" && (
        <span className={`mt-3 inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(status)}`}>{status}</span>
      )}
      {note && <p className="mt-3 text-sm text-gray-500 italic">{note}</p>}
    </motion.div>
  );
};