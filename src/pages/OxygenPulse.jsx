import React, { useState, useEffect } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import TopEllipseBackground from "../components/TopEllipseBackground";
import MeditatingGirlVideo from "../assets/MeditatingGirl.mp4";
import BodyTemperature from "./BodyTemperature";
import { useHealth } from "../context/HealthContext";


/**
 * Splash screen before Oxygen & Pulse page
 * - stays for 2s and then navigates to the inputs page
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
            <span className="font-bold">Oxygen & Pulse</span>
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
 * Main Oxygen & Pulse page
 */
const OxygenPulsePage = ({ onProceed }) => {
  const [oxygen, setOxygen] = useState("");
  const [pulse, setPulse] = useState("");

   const { update } = useHealth();

  const handleProceed = () => {
    update({
      vitals: { spo2: oxygen, pulse },
    });
    onProceed();
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

        {/* Main area */}
        <main className="flex-grow flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-xs">
            <div className="flex justify-center">
              <Logo />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-3 text-center">
              Oxygen & Pulse
            </h2>

            <p className="text-base text-gray-700 mb-3 text-center">
              Please place your finger in the pulse oximeter
            </p>

            {/* Calculated card */}
            <div className="bg-white rounded-xl p-5 w-full shadow-md mt-2">
              <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">
                Calculated
              </h3>
              <p className="text-sm text-gray-700 mb-4 text-center">
                Kindly enter the values shown
              </p>

              <div className="flex w-full gap-3">
                <div className="flex flex-col items-center flex-1">
                  <label className="text-sm text-gray-700 mb-1">Oxygen</label>
                  <input
                    type="number"
                    value={oxygen}
                    onChange={(e) => setOxygen(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                    inputMode="numeric"
                    aria-label="oxygen"
                  />
                </div>

                <div className="flex flex-col items-center flex-1">
                  <label className="text-sm text-gray-700 mb-1">Pulse</label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                    inputMode="numeric"
                    aria-label="pulse"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4 pt-3">
          {/* Illustration */}
          <div className="w-full max-w-xs h-28 mb-3">
            <video
              src={MeditatingGirlVideo}
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
              <span className="text-xs text-gray-500 ml-2">2/4 complete</span>
            </div>

            <PrimaryButton
              className="w-full justify-center"
              onClick={handleProceed}
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
