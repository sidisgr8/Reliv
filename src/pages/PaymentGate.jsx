// src/pages/PaymentGate.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";

const PaymentGate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart = [], isMedicineFlow = false, totalPrice = 0 } = location.state || {};

  // Determine payment amount and text based on flow
  const paymentAmount = isMedicineFlow ? totalPrice : 500;
  const paymentMessage = isMedicineFlow
    ? `Please complete the payment of ₹${paymentAmount} for your medical kits.`
    : "Please complete the payment of ₹500 to access your report.";

  const startPayment = () => {
    console.log("🛠️ Simulating payment...");
    setTimeout(() => {
      console.log("✅ Mock Payment Success");
      if (isMedicineFlow) {
        navigate("/order-success", { state: { cart } });
      } else {
        navigate("/report", { state: { cart } });
      }
    }, 1000);
  };

  return (
    <div className="relative w-full min-h-screen bg-white font-sans overflow-hidden flex flex-col">
      <TopEllipseBackground color="#FFF1EA" height="60%" />

      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-4">
        <div className="mb-6">
          <Logo />
        </div>

        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {isMedicineFlow ? "Complete Your Purchase" : "Your report is Ready!"}
          </h2>

          <p className="text-gray-700 text-sm mb-6">
            {paymentMessage}
          </p>

          <button
            onClick={startPayment}
            className="px-6 py-2 bg-[#E85C25] hover:bg-[#c74c1f] text-white rounded-lg font-semibold shadow-md"
          >
            Pay ₹{paymentAmount}
          </button>
          
          {/* This button only makes sense in the health checkup flow */}
          {!isMedicineFlow && (
            <div className="mt-8">
              <p className="text-gray-600 text-sm">Also want to buy medical kits?</p>
              <button
                onClick={() => navigate('/medicine-dispensing', { state: { fromPaymentGate: true, cart } })}
                className="mt-2 text-orange-500 font-semibold hover:underline"
              >
                Browse Medical Kits →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGate;