// src/pages/BodyComposition.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import TopEllipseBackground from "../components/TopEllipseBackground";
import { useHealth } from "../context/HealthContext";

const BodyComposition = () => {
  const [weight, setWeight] = useState("");
  const [impedance, setImpedance] = useState("");
  const [height, setHeight] = useState("");
  const navigate = useNavigate();
  const { update } = useHealth();

  const handleFetchFromDevice = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/get-device-data');
      const data = await response.json();
      if (data.weight && data.impedance) {
        setWeight(data.weight);
        setImpedance(data.impedance);
      }
    } catch (error) {
      console.error('Failed to fetch data from device:', error);
      alert('Could not fetch data from the device. Please ensure the Python script is running and the device is connected.');
    }
  };

  const handleSubmit = () => {
    update({
      vitals: { weight: weight, impedance: impedance, height: height },
    });
    navigate("/payment");
  };

  return (
    <div className="relative w-full min-h-screen bg-white font-sans overflow-hidden flex flex-col">
      <TopEllipseBackground color="#FFF1EA" height="50%" />
      <div className="relative z-10 flex flex-col flex-grow p-4 md:p-6">
        <header className="flex-shrink-0 flex items-center">
          <button
            onClick={() => window.history.back()}
            className="text-3xl text-gray-800"
            aria-label="back"
          >
            ←
          </button>
        </header>
        <main className="flex-grow flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-xs">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-3 text-center">
              Body Composition
            </h2>
            <div className="bg-white rounded-xl p-5 w-full shadow-md mt-2">
              <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">
                Enter your details
              </h3>
              <div className="flex flex-col gap-4">
                <PrimaryButton className="w-full" onClick={handleFetchFromDevice}>
                  Fetch from Device
                </PrimaryButton>
                <div>
                  <label className="text-sm text-gray-700 mb-1 font-medium">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    inputMode="numeric"
                    aria-label="Height in cm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 font-medium">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    inputMode="numeric"
                    aria-label="Weight in kg"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 font-medium">
                    Impedance (ohms)
                  </label>
                  <input
                    type="number"
                    value={impedance}
                    onChange={(e) => setImpedance(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1"
                    inputMode="numeric"
                    aria-label="Impedance in ohms"
                  />
                </div>
              </div>
            </div>
            <PrimaryButton className="w-full mt-6" onClick={handleSubmit}>
              Proceed to Payment →
            </PrimaryButton>
          </div>
        </main>
        {/* Footer pagination */}
        <footer className="flex-shrink-0 flex flex-col items-center justify-end pb-4 pt-3">
            <div className="flex items-center space-x-2 mb-3">
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-[#E85C25] rounded-full"></div>
                <span className="text-xs text-gray-500 ml-2">5/5 complete</span>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default BodyComposition;