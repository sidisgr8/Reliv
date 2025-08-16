import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";

const PaymentGate = () => {
  const navigate = useNavigate();

  const startPayment = () => {
    // ✅ Mock payment flow (no Razorpay)
    console.log("🛠️ Simulating payment...");
    setTimeout(() => {
      console.log("✅ Mock Payment Success");
      navigate("/report"); // Go to report page after fake payment
    }, 1000); // wait 1 second to mimic processing
  };

  return (
    <div className="relative w-full min-h-screen bg-white font-sans overflow-hidden flex flex-col">
      {/* Background */}
      <TopEllipseBackground color="#FFF1EA" height="60%" />

      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-4">
        <div className="mb-6">
          <Logo />
        </div>

        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Your report is{" "}
            <span className="text-[#E85C25] font-bold">Ready!</span>
          </h2>

          <p className="text-gray-700 text-sm mb-6">
            Please complete the payment of ₹500 to access your report.
          </p>

          <button
            onClick={startPayment}
            className="px-6 py-2 bg-[#E85C25] hover:bg-[#c74c1f] text-white rounded-lg font-semibold shadow-md"
          >
            Pay Now
          </button>

          {/* ✅ --- NEW BUTTON ADDED BELOW --- ✅ */}
          <div className="mt-8">
            <p className="text-gray-600 text-sm">Also want to buy medical kits?</p>
            <button
              onClick={() => navigate('/medicine-dispensing', { state: { fromPaymentGate: true } })}
              className="mt-2 text-orange-500 font-semibold hover:underline"
            >
              Browse Medical Kits →
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PaymentGate;