import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  // Initialize the navigate function from React Router
  const navigate = useNavigate();

  // State to control the sliding animation of the top and bottom sections.
  // false -> top is visible, bottom is off-screen.
  // true  -> top slides out, bottom slides in.
  const [sliding, setSliding] = useState(false);

  // State to control the fade-in of the central text.
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    // A short timeout ensures that the initial styles are applied before the transition starts.
    const animationTimeout = setTimeout(() => {
      setSliding(true);
      setTextVisible(true); // Start the fade-in animation for the text.
    }, 20); // A small delay like 20ms is enough.

    // Cleanup function to clear the timeout if the component unmounts.
    return () => clearTimeout(animationTimeout);
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      {/* Bounding container must hide overflow so the sliding elements don't create scrollbars. */}
      <div className="w-full h-screen relative overflow-hidden">
        
        {/* TOP ORANGE BAND — slides up and out when 'sliding' becomes true. */}
        <div
          className={`absolute top-0 left-0 w-full transform transition-transform duration-[2500ms] ease-in-out ${
            sliding ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          <svg
            className="w-full h-[65vh]" // Increased height for a more pronounced curve
            viewBox="0 0 1440 500"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              fill="#F97316"
              d="M0,32 C200,120 500,0 720,32 C940,64 1200,120 1440,64 L1440,0 L0,0 Z"
            />
          </svg>
        </div>

        {/* CENTERED CONTENT — remains stationary while the curves animate around it. Has a z-index of 10. */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
          <h1
            className={`text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight transition-opacity duration-[2500ms] ease-in-out ${textVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className="text-orange-500">Rel</span>
            <span className="text-black">iv</span>
          </h1>
          <p
            className={`mt-6 text-lg md:text-xl lg:text-2xl text-gray-600 italic text-center max-w-2xl transition-opacity duration-[2500ms] ease-in-out ${textVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            Your Personalized Health checkup & <br className="hidden sm:block" />
            Medicine dispenser
          </p>
        </div>

        {/* BOTTOM CURVE + CTA — starts off-screen and slides up into view. Added z-20 to ensure it's on top and clickable. */}
        <div
          className={`absolute bottom-0 left-0 w-full transform transition-transform duration-[2500ms] ease-in-out z-20 ${
            sliding ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* A small negative translation to prevent a 1px gap between the SVG and the div below it. */}
          <svg
            className="w-full h-[36vh] -translate-y-[-1px]"
            viewBox="0 0 1440 320"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              fill="#F97316"
              d="M0,224 C200,160 500,320 720,288 C940,256 1200,96 1440,128 L1440,320 L0,320 Z"
            />
          </svg>

          {/* This div contains the content within the bottom orange section. */}
          <div className="bg-orange-500 pb-10 flex flex-col items-center">
            <p className="text-white text-center text-sm md:text-base mb-4 px-6">
              By signing up, I agree to Reliv's{" "}
              <span className="font-bold cursor-pointer hover:underline">Terms & Conditions</span>
            </p>
            <button
              onClick={() => navigate("/choose-language")}
              className="bg-white text-black font-medium py-2 px-6 rounded-lg shadow-md hover:bg-gray-200 transition-colors"
            >
              Let’s find your best option →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
