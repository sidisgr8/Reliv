import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Added for navigation
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import TopEllipseBackground from "../components/TopEllipseBackground";
import MeditatingGirlVideo from "../assets/MeditatingGirl.mp4";
import ClockTimerVideo from "../assets/ClockTimer.mp4"; // <-- Import ClockTimer.mp4
import { useHealth } from "../context/HealthContext";

// ---------------- Splash Screen ----------------
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

        {/* Text */}
        <div className="max-w-xs text-center">
          <h2 className="text-[18px] font-semibold text-gray-900 mb-4">
            Now we’ll be checking your{" "}
            <span className="text-[#E85C25] font-semibold">
              Body temperature
            </span>
          </h2>

          <h3 className="text-[28px] font-extrabold text-gray-900 mb-6">
            Let’s <span className="text-[#E85C25]">Get</span> Started!
          </h3>

          <p className="text-[14px] text-center leading-snug text-gray-700">
            Please <span className="text-[#E85C25]">follow</span> the steps
            carefully that will be shown
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------- Main Temperature Page ----------------
const BodyTemperaturePage = () => {
  const [temperature, setTemperature] = useState("");
  const navigate = useNavigate(); // ✅ Hook for navigation
  const { update } = useHealth();

const handleNext = () => {
  update({
    bodyTemperature: temperature,
  });
  navigate("/eyesight");
};

  return (
    <div className="relative w-full min-h-screen bg-white font-sans overflow-hidden flex flex-col">
      {/* Top ellipse */}
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

            {/* Calculated card */}
            <div className="bg-white rounded-xl p-5 w-full shadow-md mt-2">
              <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">
                Calculated
              </h3>
              <p className="text-sm text-gray-700 mb-4 text-center">
                Kindly enter the values shown
              </p>

              {/* Temperature input */}
              <div className="flex items-center gap-2 justify-center">
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                  inputMode="numeric"
                  aria-label="temperature"
                />
                <span className="text-sm text-gray-700">Farenheit</span>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4 pt-3">
          {/* Done text */}
          <p className="text-lg font-semibold text-[#E85C25] mb-2">Done!</p>

          {/* Illustration */}
          <div className="w-full max-w-[150px] mb-3">
            <video
              src={ClockTimerVideo} // <-- Use ClockTimer.mp4 here
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto"
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
            <span className="text-xs text-gray-500 ml-2">3/4 complete</span>
          </div>

          {/* Next button with navigation */}
          <PrimaryButton
      className="w-full max-w-xs justify-center"
      onClick={handleNext}
    >
      Next →
    </PrimaryButton>
        </footer>
      </div>
    </div>
  );
};

// ---------------- Wrapper ----------------
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
