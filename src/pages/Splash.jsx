import React, { useState, useEffect } from "react";

const Splash = () => {
  // sliding === false -> top is visible, bottom off-screen
  // sliding === true  -> top slides up (out), bottom + CTA slide up into place and remain there
  const [sliding, setSliding] = useState(false);
  const [textVisible, setTextVisible] = useState(false);


  useEffect(() => {
    // small tick so initial styles are applied before transition starts
    const t = setTimeout(() => {
  setSliding(true);
  setTextVisible(true); // start fade-in
}, 20);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* bounding container must hide overflow so top sliding out doesn't create scrollbars */}
      <div className="w-full h-screen relative overflow-hidden">
        {/* TOP ORANGE BAND — will slide up and out when sliding becomes true */}
        <div
          className={`absolute top-0 left-0 w-full transform transition-transform duration-[2500ms] ease-in-out ${
            sliding ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          <svg
            className="w-full h-[65vh]" // increased height for thicker curve
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

        {/* CENTERED CONTENT — stays put while curves move */}
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

        {/* BOTTOM CURVE + CTA — starts OFF-SCREEN (translate-y-full), then slides to translate-y-0 */}
        <div
          className={`absolute bottom-0 left-0 w-full transform transition-transform duration-[2500ms] ease-in-out ${
            sliding ? "translate-y-0" : "translate-y-full"
          }`}
        >
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

          <div className="bg-orange-500 pb-10 flex flex-col items-center">
            <p className="text-white text-center text-sm md:text-base mb-4 px-6">
              By signing up, I agree to Reliv's{" "}
              <span className="font-bold">Terms & Conditions</span>
            </p>
            <button className="bg-white text-black font-medium py-2 px-6 rounded-lg shadow">
              Let’s find your best option →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
