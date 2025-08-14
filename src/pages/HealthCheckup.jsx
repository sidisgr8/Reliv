import React, { useState, useEffect } from "react";

// --- Reusable UI Components ---

const Logo = () => {
  return (
    <h1 className="text-[28px] font-bold">
      <span className="text-[#E85C25]">Re</span>
      <span className="text-black">liv</span>
    </h1>
  );
};

const WaveBackground = ({ className }) => {
  return (
    <div className={`w-full h-full overflow-hidden leading-0 ${className || ''}`}>
      <svg
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        className="block w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#fff1ea"
          d="M0,150 C480,80 960,220 1440,150 L1440,300 L0,300 Z"
        />
      </svg>
    </div>
  );
};

// --- Page Components ---

// Splash Screen Component (displays for 2 seconds)
const HealthCheckPage = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
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

// BloodPressure Page (defined here to prevent import errors)
const BloodPressure = () => {
    return (
        <div className="relative w-full h-screen bg-white font-sans overflow-hidden">
            {/* Background Wave */}
            <div className="absolute top-0 left-0 w-full h-[60%] z-0 bg-[#FFF1EA]" style={{ clipPath: 'ellipse(120% 100% at 50% -40%)' }}></div>

            {/* Content laid out with Flexbox */}
            <div className="relative z-10 h-full flex flex-col p-5">
                {/* Top Bar with Back Arrow */}
                <header className="flex-shrink-0 flex items-center">
                    <button onClick={() => window.history.back()} className="text-3xl text-gray-800">
                        ←
                    </button>
                </header>

                {/* Main Content Area */}
                <main className="flex-grow flex flex-col items-center pt-2">
                    <Logo />
                    <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-6">Blood Pressure</h2>
                    
                    {/* Calculated Box */}
                    <div className="bg-white rounded-xl p-5 w-full max-w-xs shadow-md">
                        <h3 className="text-lg font-semibold text-center text-gray-700 mb-4">Calculated</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-gray-600 font-medium">Diastolic</label>
                                <div className="w-28 text-center p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-800">120</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <label className="text-gray-600 font-medium">Systolic</label>
                                <div className="w-28 text-center p-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-800">60</div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Bottom Section */}
                <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4">
                    {/* Illustration */}
                    <div className="w-full max-w-xs h-48 mb-4">
                         <img 
                            src="https://ik.imagekit.io/storyset/illustrations/meditating/pana.svg" 
                            alt="Woman meditating" 
                            className="w-full h-full object-contain"
                         />
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                        <span className="text-xs text-gray-500 ml-2">1/5 complete</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

// Main App component to control page navigation
export default function App() {
  const [currentPage, setCurrentPage] = useState('splash');

  const showNextPage = () => {
    setCurrentPage('next');
  };

  switch (currentPage) {
    case 'splash':
      return <HealthCheckPage onComplete={showNextPage} />;
    case 'next':
      return <BloodPressure />;
    default:
      return <HealthCheckPage onComplete={showNextPage} />;
  }
}
