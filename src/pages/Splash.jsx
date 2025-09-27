import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/relivlogo.jpeg"

const Splash = () => {
  const navigate = useNavigate();
  const [sliding, setSliding] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const animationTimeout = setTimeout(() => {
      setSliding(true);
      setTextVisible(true);
    }, 20);
    return () => clearTimeout(animationTimeout);
  }, []);

  const handleTermsClick = () => {
    setShowTerms(true);
  };

  const handleAgree = () => {
    setAgreed(true);
    setShowTerms(false);
  };

  const handleDisagree = () => {
    setShowTerms(false);
    setAgreed(false);
  };

  const handleProceed = () => {
    if (!showTerms || agreed) {
      navigate("/choose-language");
    } else {
      alert("Please agree to the Terms & Conditions to proceed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
      <div className="w-full h-screen relative overflow-hidden">
        <div
          className={`absolute top-0 left-0 w-full transform transition-transform duration-[2500ms] ease-in-out ${
            sliding ? "-translate-y-full" : "translate-y-0"
          }`}
        >
          <svg
            className="w-full h-[65vh]"
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

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
          <h1
            className={`text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-gray-800 transition-opacity duration-[2500ms] ease-in-out ${textVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className="text-orange-500">Rel</span>
            <span className="text-black">iv</span>
          </h1>
          <p
            className={`mt-6 text-lg md:text-xl lg:text-2xl text-gray-600 italic text-center max-w-2xl transition-opacity duration-[2500ms] ease-in-out ${textVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            Your Personalized Health Checkup & Medicine Dispenser
          </p>
        </div>

        <div
          className={`absolute bottom-0 left-0 w-full transform transition-transform duration-[2500ms] ease-in-out z-20 ${
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
            {showTerms ? (
              <div className="bg-white p-6 rounded-lg max-h-[70vh] overflow-y-auto text-black w-11/12 md:w-3/4 lg:w-1/2">
                <div className="flex justify-center mb-4">
                  <img src={logo} alt="Reliv Logo" className="w-32 h-32" />
                </div>
                <h2 className="text-2xl font-bold text-center text-orange-500 mb-4">Reliv – User License Agreement</h2>
                <p className="text-sm text-gray-700 mb-2"><strong>Introduction</strong><br />This User License Agreement (hereinafter referred to as Agreement) is the final, integrated, and exclusive agreement between you (User) and Reliv, concerning the health kiosk and related services provided by Reliv. This Agreement is legally binding on your use of Reliv’s kiosk and services. Please read carefully, including clauses on limitation of liability, user rights restrictions, dispute resolution, and applicable laws.</p>
                <p className="text-sm text-gray-700 mb-2"><strong>1. Declaration of Rights</strong><br />Reliv owns the intellectual property rights of its products and services, which are protected by law. Any unauthorized revision, duplication, distribution, reverse engineering, or translation of Reliv’s kiosk or software will be considered an infringement, and Reliv retains the right to take legal action.</p>
                <p className="text-sm text-gray-700 mb-2"><strong>2. Services Provided by Reliv</strong><br />Reliv’s health kiosk offers a comprehensive body analysis covering 25+ vital parameters. These insights help you monitor, understand, and maintain a healthy lifestyle cycle.</p>
                <p className="text-sm text-gray-700 mb-2"><strong>2.1 Data Security & Privacy</strong><br />Reliv is committed to protecting your privacy and personal health data. Measures include: Encryption of sensitive data, Restricted access for authorized personnel only, Continuous monitoring to prevent unauthorized use or data breaches.</p>
                <p className="text-sm text-gray-700 mb-2"><strong>3. Medical Disclaimer</strong><br />Reliv is not a replacement for a doctor or medical professional. The kiosk provides indicative insights only, based on the parameters you provide. The data must not be considered medical advice, diagnosis, or treatment. Reliv bears no liability or responsibility for any decisions, actions, or outcomes based on kiosk data. Users are strongly advised to consult a certified healthcare professional for medical concerns.</p>
                <p className="text-sm text-gray-700 mb-4"><strong>Final Acknowledgement</strong><br />By using Reliv’s kiosk and services, you agree to the following: Accept all clauses of this Agreement, Not misuse, duplicate, or illegally distribute Reliv’s products or services. By clicking “Agree” or proceeding with usage, you confirm your acceptance of this Agreement. If you do not agree, please refrain from using Reliv’s kiosks or services.</p>
                <div className="mt-4 flex justify-between">
                  <button onClick={handleDisagree} className="bg-gray-300 text-black py-2 px-4 rounded-lg hover:bg-gray-400">Disagree</button>
                  <button onClick={handleAgree} className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">Agree</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-white text-center text-sm md:text-base mb-4 px-6">
                  By signing up, I agree to Reliv's{" "}
                  <span onClick={handleTermsClick} className="font-bold cursor-pointer hover:underline text-white">Terms & Conditions</span>
                </p>
                <button
                  onClick={handleProceed}
                  className="bg-white text-orange-500 font-medium py-2 px-6 rounded-lg shadow-md hover:bg-gray-200 transition-colors"
                >
                  Let’s find your best option →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Splash;