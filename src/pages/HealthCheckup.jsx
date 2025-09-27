import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import MeditatingGirlVideo from "../assets/MeditatingGirl.mp4";
import BPband from "../assets/BPband.mp4"
import { useHealth } from "../context/HealthContext";

const WaveBackground = ({ className }) => (
  <div className={`w-full h-full overflow-hidden leading-0 ${className || ""}`}>
    <svg
      viewBox="0 0 1440 300"
      preserveAspectRatio="none"
      className="block w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="#fff1ea" d="M0,150 C480,80 960,220 1440,150 L1440,300 L0,300 Z" />
    </svg>
  </div>
);

const HealthCheckPage = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden font-sans">
      <button
        className="absolute top-5 left-5 text-[22px] bg-transparent border-none cursor-pointer z-[3]"
        onClick={() => window.history.back()}
      >
        ←
      </button>
      <div className="relative z-[2] h-full flex flex-col items-center justify-center pb-20">
        <div className="mb-6">
          <Logo />
        </div>
        <h2 className="text-[20px] font-normal text-center leading-snug mb-4">
          You chose <span className="font-bold">Health</span>
          <br />
          <span className="font-bold">Check-up</span>
        </h2>
        <h3 className="text-[18px] font-bold mb-10">
          Let’s <span className="text-[#E85C25]">Go!</span>
        </h3>
        <p className="text-[14px] text-center leading-snug">
          Please <span className="text-[#E85C25]">follow</span> the steps
          <br />
          carefully that will be shown
        </p>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 z-[1]">
        <WaveBackground />
      </div>
    </div>
  );
};

const BloodPressure = ({ onProceed }) => {
  const [bpResult, setBpResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data, update } = useHealth();

  const triggerBloodPressure = async () => {
    setLoading(true);
    setError("");
    setBpResult(null);
    // Simulate a successful API call with mock data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const mockResult = {
      status: "success",
      bpString: "BP: 120/80 BPM: 70",
    };
    if (mockResult.status === "success" && mockResult.bpString) {
      const match = mockResult.bpString.match(/BP: (\d+)\/(\d+) BPM: (\d+)/);
      if (match) {
        const systolic = match[1];
        const diastolic = match[2];
        const bpm = match[3];
        setBpResult({ systolic, diastolic, bpm });
        update({
          vitals: { systolic, diastolic, bpm },
        });
      } else {
        setError("Could not parse blood pressure data.");
      }
    } else {
      setError(mockResult.message || "Error receiving blood pressure data.");
    }
    setLoading(false);
  };

  const canProceed =
    bpResult && bpResult.systolic && bpResult.diastolic && bpResult.bpm;

  return (
    <div className="relative w-full h-screen bg-white font-sans overflow-hidden">
      <div
        className="absolute top-0 left-0 w-full h-[60%] z-0 bg-[#FFF1EA]"
        style={{ clipPath: "ellipse(120% 100% at 50% -40%)" }}
      />
      <div
        className="relative z-10 h-full flex flex-col p-5 overflow-y-auto"
        style={{ maxHeight: "100vh" }}
      >
        <header className="flex-shrink-0 flex items-center">
          <button
            onClick={() => window.history.back()}
            className="text-3xl text-gray-800"
          >
            ←
          </button>
        </header>
        <main className="flex-grow flex flex-col items-center pt-2">
          <Logo />
          <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-6">
            Blood Pressure
          </h2>
          <div className="bg-white rounded-xl p-5 w-full max-w-xs shadow-md">
            <h3 className="text-lg font-semibold text-center text-gray-700 mb-4">
              Measurement
            </h3>
            <div className="flex flex-col items-center">
              <button
                onClick={triggerBloodPressure}
                disabled={loading}
                className={`w-full bg-orange-500 hover:bg-orange-600 transition-all duration-300 text-white font-bold px-8 py-2 rounded-lg shadow-lg mb-4 ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
                style={{ fontSize: "1.1rem" }}
              >
                {loading ? "Measuring..." : "Calculate"}
              </button>
              {(bpResult || error) && (
                <div
                  className="w-fit bg-white rounded-2xl shadow-lg px-6 py-4 border border-orange-300 flex flex-col items-center animate-fade-in mt-2"
                  style={{ minWidth: 230 }}
                >
                  {error && (
                    <div className="text-red-500 font-semibold text-center">
                      {error}
                    </div>
                  )}
                  {bpResult && (
                    <>
                      <span className="text-[1.1rem] font-bold text-gray-800 mb-2">
                        🩺 Blood Pressure Result
                      </span>
                      <div className="flex flex-row mb-1 gap-8">
                        <div className="flex flex-col items-center">
                          <span className="text-orange-500 font-bold text-3xl">
                            {bpResult.systolic}️
                          </span>
                          <span className="text-gray-600 font-medium">Sys 🩸</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-orange-500 font-bold text-3xl">
                            {bpResult.diastolic}
                          </span>
                          <span className="text-gray-600 font-medium">Dia 💧</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-orange-500 font-bold text-3xl">
                            {bpResult.bpm}
                          </span>
                          <span className="text-gray-600 font-medium">BPM ❤️</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t text-sm text-gray-600 flex flex-col space-y-1">
              <p>Extracted Gender: {data.patient?.gender || "unknown"}</p>
              <p>Extracted Age: {data.patient?.age || "unknown"}</p>
            </div>
          </div>
        </main>
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4">
          <div className="w-full max-w-xs h-48 mb-4">
            <video
              src={BPband}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <span className="text-xs text-gray-500 ml-2">1/5 complete</span>
          </div>
          <PrimaryButton
            className="w-full max-w-xs mt-4 justify-center"
            onClick={onProceed}
            disabled={!canProceed}
          >
            Proceed →
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState("splash");
  const navigate = useNavigate();

  const showNextPage = () => setCurrentPage("blood");
  const goToOxygenPulse = () => {
    navigate("/oxygen-pulse");
  };

  switch (currentPage) {
    case "splash":
      return <HealthCheckPage onComplete={showNextPage} />;
    case "blood":
      return <BloodPressure onProceed={goToOxygenPulse} />;
    default:
      return <HealthCheckPage onComplete={showNextPage} />;
  }
}