import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import TopEllipseBackground from "../components/TopEllipseBackground";
import TemparatureGun from "../assets/TemparatureGun.mp4";
import { useHealth } from "../context/HealthContext";

// Splash screen before Body Temperature check
const Splash = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="relative w-full min-h-screen bg-white overflow-hidden font-sans">
      {/* Back Button */}
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
        {/* Logo */}
        <div className="mb-6">
          <Logo />
        </div>

        {/* Informative Text */}
        <div className="max-w-xs text-center">
          <h2 className="text-[18px] font-semibold text-gray-900 mb-4">
            Now we’ll be checking your{" "}
            <span className="text-[#E85C25] font-semibold">Body temperature</span>
          </h2>

          <h3 className="text-[28px] font-extrabold text-gray-900 mb-6">
            Let’s <span className="text-[#E85C25]">Get</span> Started!
          </h3>

          <p className="text-[14px] text-center leading-snug text-gray-700">
            Please <span className="text-[#E85C25]">follow</span> the steps carefully that will be shown
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Body Temperature measurement page
const BodyTemperaturePage = () => {
  const [temperature, setTemperature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data, update } = useHealth();
  const navigate = useNavigate();

  const triggerTemperature = async () => {
    setLoading(true);
    setError("");
    setTemperature(null);
    // Simulate a successful API call with mock data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const mockResult = {
      status: "success",
      value: 37.5,
    };
    if (mockResult.status === "success" && mockResult.value !== null) {
      setTemperature(mockResult.value);
    } else {
      setError(mockResult.message || "Error receiving temperature data.");
    }
    setLoading(false);
  };

  const canProceed = temperature !== null && temperature > 0;

  const handleProceed = () => {
    update({ vitals: { temperature } });
    // Replace the route "/eyesight" as per your routing
    navigate("/eyesight");
  };

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

        {/* Main content */}
        <main className="flex-grow flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-xs">
            <div className="flex justify-center">
              <Logo />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-3 text-center">
              Body Temperature
            </h2>

            {/* Measurement card */}
            <div className="bg-white rounded-xl p-5 w-full shadow-md mt-2 mb-5 flex flex-col items-center">
              <PrimaryButton
                onClick={triggerTemperature}
                disabled={loading}
                className={`w-full max-w-xs bg-orange-500 hover:bg-orange-600 transition-all duration-300 text-white font-bold px-8 py-2 rounded-lg shadow-lg mb-4 ${
                  loading ? "opacity-60 cursor-not-allowed" : ""
                }`}
                style={{ fontSize: "1.1rem" }}
              >
                {loading ? "Measuring..." : "Measure Temperature"}
              </PrimaryButton>

              {error && (
                <div
                  className="text-red-500 text-center font-semibold mb-4"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {temperature !== null && (
                <div
                  className="text-orange-500 font-bold text-5xl flex items-center gap-2 select-none"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {temperature.toFixed(1)}°C
                  <span role="img" aria-label="thermometer emoji">
                    🌡️
                  </span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t text-sm text-gray-600 flex flex-col space-y-1">
                <p>Extracted Gender: {data.patient?.gender || "unknown"}</p>
                <p>Extracted Age: {data.patient?.age || "unknown"}</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4 pt-3">
          {/* Illustration */}
          <div className="w-full max-w-xs h-48 mb-4">
            <video
              src={TemparatureGun}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
              aria-hidden="true"
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <span className="text-xs text-gray-500 ml-2">3/5 complete</span>
          </div>

          {/* Proceed button */}
          <PrimaryButton
            className="w-full max-w-xs justify-center"
            onClick={handleProceed}
            disabled={!canProceed}
            aria-disabled={!canProceed}
          >
            Proceed →
          </PrimaryButton>
        </footer>
      </div>
    </div>
  );
};

// Wrapper component managing splash and main page display
export default function BodyTemperature() {
  const [currentPage, setCurrentPage] = useState("splash");

  const showNext = () => setCurrentPage("main");

  switch (currentPage) {
    case "splash":
      return <Splash onComplete={showNext} />;
    case "main":
      return <BodyTemperaturePage />;
    default:
      return <Splash onComplete={showNext} />;
  }
}