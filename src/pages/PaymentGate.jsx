// src/pages/PaymentGate.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";
import { useHealth } from "../context/HealthContext";


const PaymentGate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: healthData } = useHealth();
  const { cart = [], totalPrice = 0, fromPaymentGate = false } = location.state || {};

  // Determine the flow:
  // - If fromPaymentGate is true, a health checkup was done, so a report is needed.
  // - If fromPaymentGate is false and cart is empty, it's a health-checkup-only flow.
  // - Otherwise, it's a medicine-only flow.
  const needsReport = fromPaymentGate || cart.length === 0;

  const paymentAmount = needsReport ? (totalPrice || 500) : totalPrice;
  const paymentMessage = needsReport
    ? `Please complete the payment of ₹${paymentAmount} to access your report and purchase kits.`
    : `Please complete the payment of ₹${paymentAmount} for your medical kits.`;
  
  const title = needsReport ? "Your Report is Ready!" : "Complete Your Purchase";

  const startPayment = async () => {
    console.log("🛠️ Simulating payment...");
    // Simulate payment success after 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("✅ Mock Payment Success");
  
    // After payment, try to send a receipt if there are items in the cart
    if (cart.length > 0 && healthData.patient.email) {
      try {
        console.log("Attempting to send receipt...");
        await fetch('http://localhost:5000/api/send-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient: healthData.patient,
            cart,
            totalPrice,
          }),
        });
        console.log("Receipt email request sent.");
      } catch (error) {
        console.error("Failed to send receipt email:", error);
        // Don't block the user flow if the email fails
      }
    }
  
    // Navigate to the next page
    if (needsReport) {
      navigate("/report", { state: { cart } });
    } else {
      navigate("/order-success", { state: { cart } });
    }
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
            {title}
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
          {!fromPaymentGate && cart.length === 0 && (
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