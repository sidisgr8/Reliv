import React, { useState, useEffect } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import TopEllipseBackground from "../components/TopEllipseBackground";
import eyeChartImg from "../assets/eye-chart.png";

/**
 * Splash screen before Eye Sight test
 */
const EyeSightSplash = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 2000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="relative w-full min-h-screen bg-white overflow-hidden font-sans">
      {/* Back button */}
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
            <span className="font-bold text-[#E85C25]">Eye Sight</span>
          </h2>

          <h3 className="text-[28px] font-extrabold text-gray-900 mb-6">
            Let’s <span className="text-[#E85C25]">Get</span>
            <br />
            <span className="text-[#E85C25]">Started!</span>
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

/**
 * Eye Sight test page
 */
const EyeSightTest = ({ onNext }) => {
  const [leftEyeLine, setLeftEyeLine] = useState("");
  const [rightEyeLine, setRightEyeLine] = useState("");

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
            <div className="flex justify-center mb-4">
              <Logo />
            </div>

            {/* Eye chart image */}
            <div className="w-full mb-4">
              <img
                src={eyeChartImg}
                alt="Eye Sight Chart"
                className="w-full object-contain"
              />
            </div>

            {/* Left eye input */}
            <p className="text-sm text-gray-700 mb-1 font-medium">
              Left Eye: Cover your right eye and read the chart.
            </p>
            <label className="text-xs text-gray-600">
              Enter the no. of the smallest line you could read (1-9)
            </label>
            <input
              type="number"
              value={leftEyeLine}
              onChange={(e) => setLeftEyeLine(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 mb-4"
              inputMode="numeric"
              aria-label="Left eye line"
            />

            {/* Right eye input */}
            <p className="text-sm text-gray-700 mb-1 font-medium">
              Right Eye: Cover your left eye and read the chart.
            </p>
            <label className="text-xs text-gray-600">Smallest line no.</label>
            <input
              type="number"
              value={rightEyeLine}
              onChange={(e) => setRightEyeLine(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 mb-6"
              inputMode="numeric"
              aria-label="Right eye line"
            />

            <PrimaryButton className="w-full" onClick={onNext}>
              Submit →
            </PrimaryButton>
          </div>
        </main>

        {/* Footer pagination */}
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
            <span className="text-xs text-gray-500 ml-2">4/4 complete</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

/**
 * Wrapper to control Eye Sight flow
 */
export default function EyeSight() {
  const [currentPage, setCurrentPage] = useState("splash");

  const showTest = () => setCurrentPage("test");

  switch (currentPage) {
    case "splash":
      return <EyeSightSplash onComplete={showTest} />;
    case "test":
      return <EyeSightTest onNext={() => console.log("Go to next step")} />;
    default:
      return <EyeSightSplash onComplete={showTest} />;
  }
}
