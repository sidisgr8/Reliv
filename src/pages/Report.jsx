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
  const s = Number(sys),
    d = Number(dia);
  if (!s || !d) return { label: "—", advice: "No BP values provided." };
  if (s < 120 && d < 80)
    return { label: "Normal", advice: "Good: Keep up a healthy lifestyle." };
  if (s < 130 && d < 80)
    return {
      label: "Elevated",
      advice: "Keep a check: Monitor regularly; consider diet/exercise.",
    };
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89))
    return {
      label: "Stage 1 Hypertension",
      advice: "Alert: Consult a clinician; lifestyle changes recommended.",
    };
  if (s >= 140 || d >= 90)
    return {
      label: "Stage 2 Hypertension",
      advice: "Alert: Seek medical advice soon.",
    };
  return { label: "—", advice: "Check values." };
}

function assessSpO2(spo2) {
  const v = Number(spo2);
  if (!v) return { label: "—", advice: "No SpO₂ value provided." };
  if (v >= 95)
    return {
      label: "Normal",
      advice: "Good: Oxygen saturation is within normal range.",
    };
  if (v >= 90)
    return {
      label: "Borderline",
      advice: "Keep a check: Monitor; if symptoms occur, contact a clinician.",
    };
  return { label: "Low", advice: "Alert: Low oxygen level; seek care if persistent." };
}

function assessPulse(pulse) {
  const v = Number(pulse);
  if (!v) return { label: "—", advice: "No pulse value provided." };
  if (v >= 60 && v <= 100)
    return {
      label: "Normal",
      advice: "Good: Resting heart rate is within normal range.",
    };
  if (v < 60)
    return {
      label: "Low",
      advice: "Keep a check: Could be normal for athletes; else, monitor.",
    };
  return {
      label: "High",
      advice: "Alert: Tachycardia; consider rest and consult if persistent.",
    };
}

function assessTempF(t) {
  const v = Number(t);
  if (!v) return { label: "—", advice: "No temperature provided." };
  if (v < 97)
    return { label: "Low", advice: "Alert: Slightly low; ensure warmth and re-check." };
  if (v <= 99.5) return { label: "Normal", advice: "Good: Within normal range." };
  if (v <= 100.4)
    return { label: "Elevated", advice: "Keep a check: Mild elevation; monitor." };
  if (v <= 102)
    return { label: "Fever", advice: "Keep a check: Mild fever; monitor and rest." };
  if (v <= 104)
    return { label: "High Fever", advice: "Alert: High fever; seek medical advice." };
  return { label: "Critical Fever", advice: "Alert: Critical temperature; urgent medical attention needed." };
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
    return { summary: "—", note: "No eyesight input provided.", comment: "Please provide eye test results for assessment." };
  }

  const leftSnellen = getSnellenEquivalent(left);
  const rightSnellen = getSnellenEquivalent(right);
  const summary = `Left: 20/${leftSnellen}, Right: 20/${rightSnellen}`;
  let leftComment = "", rightComment = "", combinedComment = "";

  if (leftSnellen !== "—") {
    if (leftSnellen <= 25) leftComment = "Good: Great vision in your left eye—keep it up!";
    else if (leftSnellen <= 40) leftComment = "Keep a check: Your left eye is doing well, but spectacles might help for fine details.";
    else if (leftSnellen <= 70) leftComment = "Alert: Your left eye could benefit from spectacles; a check-up is a good idea.";
    else leftComment = "Alert: Your left eye vision is limited—please see a doctor.";
  }

  if (rightSnellen !== "—") {
    if (rightSnellen <= 25) rightComment = "Good: Excellent vision in your right eye—maintain healthy habits!";
    else if (rightSnellen <= 40) rightComment = "Keep a check: Your right eye is solid, though spectacles might improve clarity.";
    else if (rightSnellen <= 70) rightComment = "Alert: Spectacles could help your right eye; consider a professional visit.";
    else rightComment = "Alert: Your right eye vision needs attention—consult a doctor.";
  }

  const worseSnellen = Math.max(leftSnellen === "—" ? 0 : leftSnellen, rightSnellen === "—" ? 0 : rightSnellen);
  if (worseSnellen <= 25) combinedComment = "Good: Both eyes are in great shape—keep nurturing your eye health!";
  else if (worseSnellen <= 40) combinedComment = "Keep a check: Your vision is generally good, but spectacles might enhance your experience.";
  else if (worseSnellen <= 70) combinedComment = "Alert: Spectacles could improve your vision; a professional check is recommended.";
  else combinedComment = "Alert: Your vision suggests a need for a doctor’s evaluation.";

  return {
    summary,
    note: combinedComment,
    comment: `${leftComment} ${rightComment} Overall, ${combinedComment}`,
  };
}

const VitalsHistoryChart = ({ history, currentVitals }) => {
  const combinedHistory = [
    ...history,
    { ...currentVitals, createdAt: new Date() },
  ]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10);

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
  const [isSendingMyReport, setIsSendingMyReport] = useState(false);
  const [isSendingDoctorReport, setIsSendingDoctorReport] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCleansing, setShowCleansing] = useState(false);
  const [ecoStats, setEcoStats] = useState(null);
  const pdfRef = useRef();
  const referenceRef = useRef();
  const stockUpdated = useRef(false);
  const [history, setHistory] = useState([]);
  const [doctorEmail, setDoctorEmail] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardInputName, setKeyboardInputName] = useState("");

  const allInputs = { doctorEmail };

  const handleInputFocus = (e) => {
    setIsKeyboardVisible(true);
    setKeyboardInputName(e.target.name);
  };

  const handleKeyboardChange = (name, value) => {
    if (name === "doctorEmail") {
      setDoctorEmail(value);
    }
  };

  const bodyCompositionData = useMemo(() => {
    if (!vitals.weight || !patient.age || !patient.gender || !vitals.height) {
      return null;
    }
    const sex = patient.gender.toLowerCase() === "male" ? 1 : 0;
    const { weight, impedance, height } = vitals;
    const { age } = patient;

    const fat_percent = bodyComposition.calc_fat_percent(
      weight,
      height,
      sex,
      age,
      impedance
    );
    const fat_mass = bodyComposition.calc_fat_mass(weight, fat_percent);
    const muscle_percent = bodyComposition.calc_muscle_percent(
      weight,
      height,
      sex,
      age,
      impedance
    );
    const muscle_mass = bodyComposition.calc_muscle_mass(
      weight,
      muscle_percent
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
    const standard_weight = bodyComposition.calc_standard_weight(height);
    const subcutaneous_fat_percent = bodyComposition.calc_subcutaneous_fat_percent(
      fat_percent
    );

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
      protein_mass: bodyComposition.calc_protein_mass(
        weight,
        bodyComposition.calc_protein_percent(muscle_percent)
      ),
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
      skeletal_muscle_percent: bodyComposition.calc_skeletal_muscle_percent(
        muscle_percent
      ),
      subcutaneous_fat_percent,
      subcutaneous_fat_mass: bodyComposition.calc_subcutaneous_fat_mass(
        weight,
        subcutaneous_fat_percent
      ),
      fat_free_weight: bodyComposition.calc_fat_free_weight(weight, fat_mass),
      body_surface_area: bodyComposition.calc_body_surface_area(height, weight),
      ideal_body_weight: bodyComposition.calc_ideal_body_weight(height, sex),
      standard_weight,
      weight_control: bodyComposition.calc_weight_control(
        standard_weight,
        weight
      ),
      fat_control: bodyComposition.calc_fat_control(weight, fat_percent, sex),
      muscle_control: bodyComposition.calc_muscle_control(
        weight,
        muscle_percent
      ),
      body_score: bodyComposition.calc_body_score(
        weight,
        height,
        sex,
        age,
        impedance
      ),
      ffmi: bodyComposition.calc_ffmi(weight, height, fat_mass),
    };
  }, [vitals, patient]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (patient.email) {
        try {
          const historyRes = await fetch(
            `http://localhost:5000/api/reports/history/${patient.email}`
          );
          const historyData = await historyRes.json();
          setHistory(historyData);

          await fetch(
            "http://localhost:5000/api/save-report",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                healthData: data,
                bodyCompositionData: bodyCompositionData,
              }),
            }
          );
        } catch (error) {
          console.error(
            "Failed to fetch report history:",
            error
          );
        }
      }
    };
    fetchHistory();
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
        body: JSON.stringify({
          to: patient.email,
          name: patient.name,
          healthData: data,
          reportImage: imgData,
        }),
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
        body: JSON.stringify({
          to: doctorEmail,
          name: patient.name,
          healthData: data,
          reportImage: imgData,
        }),
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

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  return (
    <div className={`bg-gray-50 min-h-screen py-12 px-4 transition-all duration-300 ${isKeyboardVisible ? 'pb-80' : 'pb-12'}`}>
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
                  <strong className="font-medium text-gray-500">Gender:</strong>{" "}
                  {patient.gender || "N/A"}
                </p>
                <p>
                  <strong className="font-medium text-gray-500">Phone:</strong>{" "}
                  {patient.phone || "N/A"}
                </p>
                <p className="col-span-2">
                  <strong className="font-medium text-gray-500">Email:</strong>{" "}
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
                  />
                  <VitalCard
                    label="Body Fat"
                    value={`${bodyCompositionData.fat_percent.toFixed(1)}%`}
                    note={`${bodyCompositionData.fat_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Subcutaneous Fat"
                    value={`${bodyCompositionData.subcutaneous_fat_percent.toFixed(
                      1
                    )}%`}
                    note={`${bodyCompositionData.subcutaneous_fat_mass.toFixed(
                      1
                    )} kg`}
                  />
                  <VitalCard
                    label="Muscle"
                    value={`${bodyCompositionData.muscle_percent.toFixed(1)}%`}
                    note={`${bodyCompositionData.muscle_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Skeletal Muscle"
                    value={`${bodyCompositionData.skeletal_muscle_percent.toFixed(
                      1
                    )}%`}
                  />
                  <VitalCard
                    label="Water"
                    value={`${bodyCompositionData.water_percent.toFixed(1)}%`}
                    note={`${bodyCompositionData.water_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Bone Mass"
                    value={`${bodyCompositionData.bone_mass.toFixed(1)} kg`}
                    note={`${bodyCompositionData.bone_percent.toFixed(1)} %`}
                  />
                  <VitalCard
                    label="Protein"
                    value={`${bodyCompositionData.protein_percent.toFixed(1)}%`}
                    note={`${bodyCompositionData.protein_mass.toFixed(1)} kg`}
                  />
                  <VitalCard
                    label="Visceral Fat"
                    value={bodyCompositionData.visceral_fat_level}
                    status="Level"
                  />
                  <VitalCard
                    label="BMR"
                    value={`${bodyCompositionData.bmr.toFixed(0)} kcal`}
                    status="Basal Metabolic Rate"
                  />
                  <VitalCard
                    label="Metabolic Age"
                    value={bodyCompositionData.metabolic_age}
                    status="Years"
                  />
                  <VitalCard
                    label="Fat-Free Body Weight"
                    value={`${bodyCompositionData.fat_free_weight.toFixed(2)} kg`}
                  />
                  <VitalCard
                    label="Body Surface Area"
                    value={`${bodyCompositionData.body_surface_area.toFixed(
                      2
                    )} m²`}
                  />
                  <VitalCard
                    label="Ideal Body Weight"
                    value={`${bodyCompositionData.ideal_body_weight.toFixed(
                      2
                    )} kg`}
                  />
                  <VitalCard
                    label="Standard Weight"
                    value={`${bodyCompositionData.standard_weight.toFixed(2)} kg`}
                  />
                  <VitalCard
                    label="Weight Control"
                    value={`${bodyCompositionData.weight_control.toFixed(2)} kg`}
                  />
                  <VitalCard
                    label="Fat Control"
                    value={`${bodyCompositionData.fat_control.toFixed(2)} kg`}
                  />
                  <VitalCard
                    label="Muscle Control"
                    value={`${bodyCompositionData.muscle_control.toFixed(2)} kg`}
                  />
                  <VitalCard
                    label="Body Score"
                    value={bodyCompositionData.body_score}
                  />
                  <VitalCard
                    label="FFMI"
                    value={bodyCompositionData.ffmi.toFixed(1)}
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

            <section className="mt-8">
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">
                Personalized Layman Report Summary
              </h3>
              <ul className="list-disc pl-5 text-gray-700 text-sm">
                <li>
                  <strong>Blood Pressure:</strong> {vitals.systolic || "—"}/{vitals.diastolic || "—"} mmHg - {computed.bp.label}. {computed.bp.advice} {computed.bp.label.includes("Hypertension") ? "Basic home remedy: Reduce salt intake, walk 30 minutes daily, and practice relaxation techniques." : ""}
                </li>
                <li>
                  <strong>Oxygen Saturation (SpO₂):</strong> {vitals.spo2 || "—"}% - {computed.spo2.label}. {computed.spo2.advice}
                </li>
                <li>
                  <strong>Pulse Rate:</strong> {vitals.pulse || "—"} BPM - {computed.pulse.label}. {computed.pulse.advice}
                </li>
                <li>
                  <strong>Body Temperature:</strong> {vitals.tempF || "—"} °F - {computed.temp.label}. {computed.temp.advice}
                </li>
                <li>
                  <strong>Visual Acuity:</strong> {computed.eyes.summary}. {computed.eyes.comment}
                </li>
                <li>
                  <strong>Weight:</strong> Your weight is {vitals.weight ? `${vitals.weight} kg` : "N/A"}, which is{" "}
                  {bodyCompositionData && vitals.weight ? (
                    patient.gender.toLowerCase() === "male" ? (
                      vitals.weight < 50 ? "low (Athletic)" :
                      vitals.weight <= 90 ? "Standard" : "high (Needs Boost)"
                    ) : (
                      vitals.weight < 40 ? "low (Athletic)" :
                      vitals.weight <= 80 ? "Standard" : "high (Needs Boost)"
                    )
                  ) : "N/A"}.{" "}
                  {bodyCompositionData && vitals.weight ? (
                    patient.gender.toLowerCase() === "male" ? (
                      vitals.weight < 50 ? "Increase calorie intake with nutrient-dense foods like whole grains, lean proteins, and healthy fats." :
                      vitals.weight <= 90 ? "Maintain with a balanced diet including adequate protein and regular exercise like walking." :
                      "Focus on portion control and incorporate 30 minutes of cardio 3-4 times a week to manage weight."
                    ) : (
                      vitals.weight < 40 ? "Increase calorie intake with nutrient-dense foods like whole grains, lean proteins, and healthy fats." :
                      vitals.weight <= 80 ? "Maintain with a balanced diet including adequate protein and regular exercise like walking." :
                      "Focus on portion control and incorporate 30 minutes of cardio 3-4 times a week to manage weight."
                    )
                  ) : "Please provide weight data for personalized advice."}
                </li>
                <li>
                  <strong>BMI:</strong> Your BMI is {bodyCompositionData ? bodyCompositionData.bmi.toFixed(1) : "N/A"}, which is{" "}
                  {bodyCompositionData ? (
                    bodyCompositionData.bmi < 18.0 ? "low (Underweight)" :
                    bodyCompositionData.bmi <= 22.9 ? "Standard (Normal)" :
                    bodyCompositionData.bmi <= 24.9 ? "high (Overweight)" : "high (Obese)"
                  ) : "N/A"}.{" "}
                  {bodyCompositionData ? (
                    bodyCompositionData.bmi < 18.0 ? "Increase calorie intake with nutrient-dense foods like nuts, avocados, and whole grains to gain weight." :
                    bodyCompositionData.bmi <= 22.9 ? "Maintain with a balanced diet and regular physical activity like walking or yoga." :
                    bodyCompositionData.bmi <= 24.9 ? "Incorporate cardio exercises like brisk walking or cycling 3-4 times a week to manage weight." :
                    "Focus on a calorie-controlled diet and consult a nutritionist for weight management strategies."
                  ) : "Please provide weight and height for BMI advice."}
                </li>
                <li>
                  <strong>Body Fat:</strong> Your body fat is {bodyCompositionData ? `${bodyCompositionData.fat_percent.toFixed(1)}%` : "N/A"}, which is{" "}
                  {bodyCompositionData && patient.gender.toLowerCase() === "male" ? (
                    bodyCompositionData.fat_percent < 6 ? "low (Athletic)" :
                    bodyCompositionData.fat_percent <= 13 ? "low (Excellent)" :
                    bodyCompositionData.fat_percent <= 20 ? "Standard" : "high (Needs Boost)"
                  ) : bodyCompositionData ? (
                    bodyCompositionData.fat_percent < 14 ? "low (Athletic)" :
                    bodyCompositionData.fat_percent <= 20 ? "low (Excellent)" :
                    bodyCompositionData.fat_percent <= 30 ? "Standard" : "high (Needs Boost)"
                  ) : "N/A"}.{" "}
                  {bodyCompositionData ? (
                    patient.gender.toLowerCase() === "male" ? (
                      bodyCompositionData.fat_percent < 6 ? "Maintain your lean physique with high-protein meals and strength training." :
                      bodyCompositionData.fat_percent <= 13 ? "Continue with cardio and strength exercises to stay lean." :
                      bodyCompositionData.fat_percent <= 20 ? "Maintain with healthy fats like olive oil and regular exercise." :
                      "Reduce fat by adding 30 minutes of cardio 3-4 times a week and cutting processed foods."
                    ) : (
                      bodyCompositionData.fat_percent < 14 ? "Maintain your lean physique with high-protein meals and strength training." :
                      bodyCompositionData.fat_percent <= 20 ? "Continue with cardio and strength exercises to stay lean." :
                      bodyCompositionData.fat_percent <= 30 ? "Maintain with healthy fats like olive oil and regular exercise." :
                      "Reduce fat by adding 30 minutes of cardio 3-4 times a week and cutting processed foods."
                    )
                  ) : "Please provide complete data for body fat advice."}
                </li>
                <li>
                  <strong>Muscle %:</strong> Your muscle percentage is {bodyCompositionData ? `${bodyCompositionData.muscle_percent.toFixed(1)}%` : "N/A"}, which is{" "}
                  {bodyCompositionData && patient.gender.toLowerCase() === "male" ? (
                    bodyCompositionData.muscle_percent < 33 ? "low (Needs Boost)" :
                    bodyCompositionData.muscle_percent <= 52 ? "Standard" : "high (Athletic)"
                  ) : bodyCompositionData ? (
                    bodyCompositionData.muscle_percent < 24 ? "low (Needs Boost)" :
                    bodyCompositionData.muscle_percent <= 42 ? "Standard" : "high (Athletic)"
                  ) : "N/A"}.{" "}
                  {bodyCompositionData ? (
                    patient.gender.toLowerCase() === "male" ? (
                      bodyCompositionData.muscle_percent < 33 ? "Build muscle with strength training 2-3 times a week and a protein-rich diet." :
                      bodyCompositionData.muscle_percent <= 52 ? `Maintain with ${patient.age < 40 ? "weightlifting" : "moderate resistance exercises"} 2-3 times a week.` :
                      "Sustain your athletic build with advanced strength training and adequate protein."
                    ) : (
                      bodyCompositionData.muscle_percent < 24 ? "Build muscle with strength training 2-3 times a week and a protein-rich diet." :
                      bodyCompositionData.muscle_percent <= 42 ? `Maintain with ${patient.age < 40 ? "weightlifting" : "moderate resistance exercises"} 2-3 times a week.` :
                      "Sustain your athletic build with advanced strength training and adequate protein."
                    )
                  ) : "Please provide complete data for muscle advice."}
                </li>
                <li>
                  <strong>Body Type:</strong> Your body type is{" "}
                  {bodyCompositionData ? (
                    bodyCompositionData.bmi < 18.0 || (patient.gender.toLowerCase() === "male" ? bodyCompositionData.muscle_percent > 52 : bodyCompositionData.muscle_percent > 42) ? "Slim/Lean (Ectomorph-like)" :
                    (bodyCompositionData.bmi >= 18.0 && bodyCompositionData.bmi <= 22.9 && (patient.gender.toLowerCase() === "male" ? bodyCompositionData.fat_percent <= 20 : bodyCompositionData.fat_percent <= 30)) ? "Athletic/Balanced (Mesomorph-like)" :
                    "Rounded/Strong (Endomorph-like)"
                  ) : "N/A"}.{" "}
                  {bodyCompositionData ? (
                    bodyCompositionData.bmi < 18.0 || (patient.gender.toLowerCase() === "male" ? bodyCompositionData.muscle_percent > 52 : bodyCompositionData.muscle_percent > 42) ? "Your fast metabolism benefits from high-calorie, nutrient-dense foods and strength training." :
                    (bodyCompositionData.bmi >= 18.0 && bodyCompositionData.bmi <= 22.9 && (patient.gender.toLowerCase() === "male" ? bodyCompositionData.fat_percent <= 20 : bodyCompositionData.fat_percent <= 30)) ? "Your balanced physique thrives on a mix of cardio and strength training." :
                    "Your strong build benefits from calorie control and regular cardio to optimize metabolism."
                  ) : "Please provide complete data for body type advice."}
                </li>
                <li>
                  <strong>Goals:</strong>{" "}
                  {bodyCompositionData ? (
                    <>
                      {bodyCompositionData.weight_control > 0 ? `Gain ${bodyCompositionData.weight_control.toFixed(1)} kg with a high-protein diet and strength training.` :
                       bodyCompositionData.weight_control < 0 ? `Reduce ${Math.abs(bodyCompositionData.weight_control).toFixed(1)} kg with cardio and portion control.` :
                       "Maintain your current weight with a balanced diet."}{" "}
                      {bodyCompositionData.fat_control > 0 ? `Increase healthy fat intake slightly with foods like avocados.` :
                       bodyCompositionData.fat_control < 0 ? `Reduce ${Math.abs(bodyCompositionData.fat_control).toFixed(1)} kg of fat with 3-4 weekly cardio sessions.` :
                       "Maintain body fat with a mix of cardio and strength training."}{" "}
                      {bodyCompositionData.muscle_control > 0 ? `Gain ${bodyCompositionData.muscle_control.toFixed(1)} kg of muscle with strength training ${patient.age < 40 ? "3-4 times" : "2-3 times"} a week.` :
                       bodyCompositionData.muscle_control < 0 ? `Maintain muscle mass with moderate resistance exercises.` :
                       "Sustain muscle mass with regular resistance workouts."}
                    </>
                  ) : "Please provide complete data to set personalized goals."}
                </li>
                <li>
                  <strong>Motivational Note:</strong> Your unique body is on a journey to better health! Stay consistent with exercise and a tailored diet to reach your goals.
                </li>
              </ul>
            </section>

            <section ref={referenceRef} className="mt-8 px-8 pb-8">
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-orange-200 pb-2 mb-4">
                Body Composition Reference Guide
              </h3>
              <div className="text-gray-700 text-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Metric</th>
                      <th className="border p-2 text-left">Men</th>
                      <th className="border p-2 text-left">Women</th>
                      <th className="border p-2 text-left">Formula/Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">BMI</td>
                      <td className="border p-2">Underweight: &lt;18.0<br />Normal: 18.0–22.9<br />Overweight: 23–24.9<br />Obese: ≥25</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Weight (kg) ÷ [Height (m)]²</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Fat %</td>
                      <td className="border p-2">Essential: 2–5%<br />Athletes: 6–13%<br />Fitness: 14–17%<br />Standard: 18–24%<br />Overfat: ≥25%</td>
                      <td className="border p-2">Essential: 10–13%<br />Athletes: 14–20%<br />Fitness: 21–24%<br />Standard: 25–31%<br />Overfat: ≥32%</td>
                      <td className="border p-2">Bioelectrical impedance-based</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Subcutaneous Fat %</td>
                      <td className="border p-2">Athletes: 6–12%<br />Standard: 13–20%<br />High: 21–30%<br />Very High: &gt;30%</td>
                      <td className="border p-2">Athletes: 16–22%<br />Standard: 23–30%<br />High: 31–40%<br />Very High: &gt;40%</td>
                      <td className="border p-2">Body Weight × Subcutaneous Fat % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Muscle %</td>
                      <td className="border p-2">Low: &lt;33%<br />Standard: 33–39%<br />Athletic: &gt;39%</td>
                      <td className="border p-2">Low: &lt;24%<br />Standard: 24–30%<br />Athletic: &gt;30%</td>
                      <td className="border p-2">Body Weight × Muscle % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Water %</td>
                      <td className="border p-2">Low: &lt;55%<br />Standard: 55–65%<br />High: &gt;65%</td>
                      <td className="border p-2">Low: &lt;45%<br />Standard: 45–60%<br />High: &gt;60%</td>
                      <td className="border p-2">Bioelectrical impedance-based</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Bone %</td>
                      <td className="border p-2">Low: &lt;12%<br />Standard: 12–15%<br />High: &gt;15%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Body Weight × Bone % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Protein %</td>
                      <td className="border p-2">Low: &lt;16%<br />Standard: 16–20%<br />Athletic: &gt;20%</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Body Weight × Protein % ÷ 100</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Visceral Fat Level</td>
                      <td className="border p-2">Normal: 1–9<br />High: 10–14<br />Very High: ≥15</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Visceral Fat Mass: Body Fat Mass × 0.15</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Ideal Body Weight</td>
                      <td className="border p-2">50 kg + 2.3 kg/inch over 5 ft</td>
                      <td className="border p-2">45.5 kg + 2.3 kg/inch over 5 ft</td>
                      <td className="border p-2">Devine formula</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Body Score</td>
                      <td className="border p-2">Very Good: 80<br />Average: 60–80<br />Needs Improvement: &lt;60</td>
                      <td className="border p-2">Same</td>
                      <td className="border p-2">Composite health score</td>
                    </tr>
                    <tr>
                      <td className="border p-2">FFMI</td>
                      <td className="border p-2">Needs Boost: &lt;17<br />Standard: 17–25<br />Athletic: &gt;25</td>
                      <td className="border p-2">Needs Boost: &lt;14<br />Standard: 14–20<br />Athletic: &gt;20</td>
                      <td className="border p-2">Fat-Free Mass ÷ Height²</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Impedance</td>
                      <td className="border p-2" colSpan="2">Higher muscle/water: lower impedance<br />Higher fat: higher impedance</td>
                      <td className="border p-2">Varies by height, hydration, body size</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4">
                  <h4 className="text-lg font-medium text-gray-800 mb-2">Classifications</h4>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Metric</th>
                        <th className="border p-2 text-left">Men</th>
                        <th className="border p-2 text-left">Women</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2">Weight</td>
                        <td className="border p-2">Standard: 50–90 kg<br />Else: Out of Range</td>
                        <td className="border p-2">Standard: 40–80 kg<br />Else: Out of Range</td>
                      </tr>
                      <tr>
                        <td className="border p-2">BMI</td>
                        <td className="border p-2">Standard: 18.5–24.9<br />Else: Needs Boost</td>
                        <td className="border p-2">Same</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Body Fat %</td>
                        <td className="border p-2">Athletic: &lt;6%<br />Excellent: 6–13%<br />Standard: 14–20%<br />Needs Boost: &gt;20%</td>
                        <td className="border p-2">Athletic: &lt;14%<br />Excellent: 14–20%<br />Standard: 21–30%<br />Needs Boost: &gt;30%</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Subcutaneous Fat %</td>
                        <td className="border p-2">Athletic: &lt;10%<br />Standard: 10–20%<br />Needs Boost: &gt;20%</td>
                        <td className="border p-2">Athletic: &lt;15%<br />Standard: 15–25%<br />Needs Boost: &gt;25%</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Muscle %</td>
                        <td className="border p-2">Needs Boost: &lt;33%<br />Standard: 33–52%<br />Athletic: &gt;52%</td>
                        <td className="border p-2">Needs Boost: &lt;24%<br />Standard: 24–42%<br />Athletic: &gt;42%</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Muscle Mass</td>
                        <td className="border p-2">Needs Boost: &lt;35 kg<br />Standard: 35–50 kg<br />Athletic: &gt;50 kg</td>
                        <td className="border p-2">Needs Boost: &lt;25 kg<br />Standard: 25–40 kg<br />Athletic: &gt;40 kg</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Skeletal Muscle %</td>
                        <td className="border p-2">Needs Boost: &lt;23%<br />Standard: 23–36%<br />Athletic: &gt;36%</td>
                        <td className="border p-2">Needs Boost: &lt;17%<br />Standard: 17–29%<br />Athletic: &gt;29%</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Body Water %</td>
                        <td className="border p-2">Standard: 50–65%<br />Else: Needs Boost</td>
                        <td className="border p-2">Standard: 45–60%<br />Else: Needs Boost</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Bone Mass</td>
                        <td className="border p-2">Needs Boost: &lt;2.5 kg<br />Standard: 2.5–4.0 kg<br />Athletic: &gt;4.0 kg</td>
                        <td className="border p-2">Needs Boost: &lt;2.0 kg<br />Standard: 2.0–3.5 kg<br />Athletic: &gt;3.5 kg</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Protein %</td>
                        <td className="border p-2">Needs Boost: &lt;15%<br />Standard: 15–20%<br />Athletic: &gt;20%</td>
                        <td className="border p-2">Needs Boost: &lt;12%<br />Standard: 12–18%<br />Athletic: &gt;18%</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Protein Mass</td>
                        <td className="border p-2">Needs Boost: &lt;12 kg<br />Standard: 12–18 kg<br />Athletic: &gt;18 kg</td>
                        <td className="border p-2">Needs Boost: &lt;10 kg<br />Standard: 10–15 kg<br />Athletic: &gt;15 kg</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Visceral Fat Level</td>
                        <td className="border p-2">Athletic: ≤9<br />Standard: 10–12<br />Needs Boost: &gt;12</td>
                        <td className="border p-2">Same</td>
                      </tr>
                      <tr>
                        <td className="border p-2">BMR</td>
                        <td className="border p-2">Needs Boost: &lt;1600 kcal<br />Standard: 1600–2200 kcal<br />Athletic: &gt;2200 kcal</td>
                        <td className="border p-2">Needs Boost: &lt;1200 kcal<br />Standard: 1200–1800 kcal<br />Athletic: &gt;1800 kcal</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Metabolic Age</td>
                        <td className="border p-2">Younger: &lt;Age - 5<br />Standard: ±5 years<br />Older: &gt;Age + 5</td>
                        <td className="border p-2">Same</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Body Surface Area</td>
                        <td className="border p-2">Needs Boost: &lt;1.7 m²<br />Standard: 1.7–2.2 m²<br />Athletic: &gt;2.2 m²</td>
                        <td className="border p-2">Needs Boost: &lt;1.5 m²<br />Standard: 1.5–1.9 m²<br />Athletic: &gt;1.9 m²</td>
                      </tr>
                      <tr>
                        <td className="border p-2">Weight/Fat/Muscle Control</td>
                        <td className="border p-2" colSpan="2">Positive: Gain x kg<br />Negative: Reduce x kg<br />Zero: Standard</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-4">
                    <strong>Corrections/Comments:</strong> BMI formula: Weight (kg) ÷ [Height (m)]². All ranges align with Indian standards and WHO guidelines.
                  </p>
                </div>
              </div>
            </section>

            <footer className="text-center text-xs text-gray-400 mt-12 pt-4 border-t">
              <p>
                This report is for informational purposes only and is not a
                substitute for professional medical advice, diagnosis, or
                treatment.
              </p>
              <p>&copy; {new Date().getFullYear()} Reliv. All rights reserved.</p>
              {ecoStats && (
                <p className="mt-2">
                  Fun Fact: Your digital choice saved ~
                  {ecoStats.individual.water}L of water & ~
                  {ecoStats.individual.co2}g of CO2. Collectively, our users have
                  saved ~{ecoStats.total.water}L of water, ~
                  {ecoStats.total.co2}g of CO2, and ~{ecoStats.total.paper} sheets
                  of paper!
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
            onClick={handleSendMyReport}
            disabled={isSendingMyReport || !patient.email}
            className="bg-orange-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-orange-600 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingMyReport ? "Sending..." : "Email My Report"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-200 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-md hover:bg-gray-300 transition-transform transform hover:scale-105"
          >
            Home
          </button>
        </div>
        
        <div className="mt-6 text-center">
            <input
              type="email"
              name="doctorEmail"
              value={doctorEmail}
              onChange={e => setDoctorEmail(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Enter Doctor's Email..."
              className="border rounded-lg px-4 py-3 w-full max-w-sm mx-auto shadow-sm focus:ring-2 focus:ring-orange-400"
            />
             <button
            onClick={handleSendDoctorReport}
            disabled={isSendingDoctorReport || !doctorEmail}
            className="mt-4 bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-green-600 transition-transform transform hover:scale-105 disabled:opacity-50"
          >
            {isSendingDoctorReport ? "Sending..." : "Send to Doctor"}
          </button>
        </div>
      </div>

      {showCleansing && (
        <UVCleansingAnimation onComplete={() => navigate("/")} />
      )}

      {isKeyboardVisible && (
        <VirtualKeyboard
          inputName={keyboardInputName}
          inputs={allInputs}
          onChange={handleKeyboardChange}
          onClose={() => setIsKeyboardVisible(false)}
        />
      )}
    </div>
  );
}


// --- Reusable VitalCard Component ---
const VitalCard = ({ label, value, status, note, className = "" }) => {
  const getStatusColor = (statusLabel) => {
    if (!statusLabel) return "bg-gray-100 text-gray-800";
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
      {status && status !== "Screening Result" && (
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
      {note && (
        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
          {note}
        </p>
      )}
    </div>
  );
};