import React, { useState, useEffect } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import TopEllipseBackground from "../components/TopEllipseBackground";
import Oximeter from "../assets/Oximeter.mp4";
import BodyTemperature from "./BodyTemperature";
import { useHealth } from "../context/HealthContext";

/**
 * Splash screen before Oxygen page
 * - stays for 2s and then navigates to the oxygen input page
 */
const Splash = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="relative w-full min-h-screen bg-white overflow-hidden font-sans">
      <button
        className="absolute top-5 left-5 text-[22px] bg-transparent border-none cursor-pointer z-[3]"
        onClick={() => window.history.back()}
        aria-label="back"
      >
        ←
      </button>

      {/* Top ellipse background */}
      <TopEllipseBackground color="#FFF1EA" height="60%" />

      <div className="relative z-[10] h-full flex flex-col items-center justify-center px-6">
        <div className="mb-6">
          <Logo />
        </div>

        <div className="max-w-xs text-center">
          <h2 className="text-[18px] font-normal leading-snug text-gray-800 mb-4">
            Now we’ll be checking your{" "}
            <span className="font-bold">Oxygen</span>
          </h2>

          <h3 className="text-[28px] font-extrabold text-gray-900 mb-6">
            Let’s <span className="text-[#E85C25]">Get</span>
            <br />
            <span className="text-[#E85C25]">Started!</span>
          </h3>

          <p className="text-[14px] text-center leading-snug text-gray-700">
            Please <span className="text-[#E85C25]">follow</span> the steps
            <br />
            carefully that will be shown
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Oxygen measurement page with backend fetch and no pulse input
 */
const OxygenPulsePage = ({ onProceed }) => {
  const [oxygen, setOxygen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data, update } = useHealth();

  const triggerOxygen = async () => {
    setLoading(true);
    setError("");
    setOxygen(null);
    try {
      const resp = await fetch("http://localhost:5001/trigger_oxygen", {
        method: "POST",
      });
      const result = await resp.json();
      if (result.status === "success" && result.value !== null) {
        setOxygen(result.value);
      } else {
        setError(result.message || "Error receiving oxygen data.");
      }
    } catch {
      setError("Failed to connect to backend.");
    }
    setLoading(false);
  };

  const handleProceed = () => {
    update({
      vitals: { oxygen },
    });
    onProceed();
  };

  const canProceed = oxygen !== null && oxygen > 0;

  return (
    <div className="relative w-full min-h-screen bg-white font-sans overflow-hidden flex flex-col">
      {/* Top ellipse background */}
      <TopEllipseBackground color="#FFF1EA" height="50%" />

      <div className="relative z-10 flex flex-col flex-grow p-4 md:p-6">
        {/* Back button */}
        <header className="flex-shrink-0 flex items-center">
          <button
            onClick={() => window.history.back()}
            className="text-3xl text-gray-800"
            aria-label="back"
          >
            ←
          </button>
        </header>

        {/* Main area */}
        <main className="flex-grow flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-xs">
            <div className="flex justify-center">
              <Logo />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-3 text-center">
              Oxygen Saturation
            </h2>

            <p className="text-base text-gray-700 mb-3 text-center">
              Please place your finger in the pulse oximeter
            </p>

            {/* Oxygen measurement card */}
            <div className="bg-white rounded-xl p-5 w-full shadow-md mt-2 mb-5 flex flex-col items-center">
              <PrimaryButton
                onClick={triggerOxygen}
                disabled={loading}
                className={`w-full max-w-xs bg-orange-500 hover:bg-orange-600 transition-all duration-300 text-white font-bold px-8 py-2 rounded-lg shadow-lg mb-4 ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
                style={{ fontSize: "1.1rem" }}
              >
                {loading ? "Measuring..." : "Measure Oxygen"}
              </PrimaryButton>
              {error && (
                <div className="text-red-500 text-center font-semibold mb-4">
                  {error}
                </div>
              )}
              {oxygen !== null && (
                <div className="text-orange-500 font-bold text-5xl flex items-center gap-2 select-none">
                  {oxygen}%
                  <span role="img" aria-label="oxygen">
                    🩸
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t text-sm text-gray-600">
              <p>Extracted Gender: {data.patient?.gender || "unknown"}</p>
              <p>Extracted Age: {data.patient?.age || "unknown"}</p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4 pt-3">
          {/* Illustration */}
          <div className="w-full max-w-xs h-28 mb-3">
            <video
              src={Oximeter}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Divider */}
          <hr className="w-full max-w-xs border-t border-black mb-3" />

          {/* Pagination + button */}
          <div className="w-full max-w-xs flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
              <span className="text-xs text-gray-500 ml-2">2/5 complete</span>
            </div>

            <PrimaryButton
              className="w-full justify-center"
              onClick={handleProceed}
              disabled={!canProceed}
            >
              Proceed →
            </PrimaryButton>
          </div>
        </footer>
      </div>
    </div>
  );
};

/**
 * Wrapper with splash logic + navigation to BodyTemperature
 */
export default function OxygenPulse() {
  const [currentPage, setCurrentPage] = useState("splash");

  const showOxygenPage = () => setCurrentPage("oxygen");
  const showBodyTemperature = () => setCurrentPage("bodyTemp");

  switch (currentPage) {
    case "splash":
      return <Splash onComplete={showOxygenPage} />;
    case "oxygen":
      return <OxygenPulsePage onProceed={showBodyTemperature} />;
    case "bodyTemp":
      return <BodyTemperature />;
    default:
      return <Splash onComplete={showOxygenPage} />;
  }
}
