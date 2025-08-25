// src/pages/Checkout.jsx

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import TopEllipseBackground from "../components/TopEllipseBackground";
import PrimaryButton from "../components/PrimaryButton";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Safely access cart data and the new fromPaymentGate flag from location state
  const { cart = [], totalPrice = 0, fromPaymentGate = false } = location.state || {};

  const reportCost = fromPaymentGate ? 500 : 0;
  const finalTotalPrice = totalPrice + reportCost;

  if (cart.length === 0 && !fromPaymentGate) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <Logo size="text-4xl" />
        <h2 className="mt-4 text-2xl">Your cart is empty.</h2>
        <button onClick={() => navigate('/medicine-dispensing')} className="mt-6 text-orange-500 hover:underline">
          ← Go back to kits
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 font-sans">
      <TopEllipseBackground color="#FFF1EA" height="30%" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mt-2">
            Order Summary
          </h1>
        </header>

        <main className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="space-y-4">
            {fromPaymentGate && (
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-bold text-gray-800">Health Report</p>
                  <p className="text-sm text-gray-500">
                    Your comprehensive health summary.
                  </p>
                </div>
                <p className="font-semibold text-gray-700">
                  ₹{reportCost}
                </p>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-700">
                  ₹{item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t-2 pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-gray-600">Total Amount</span>
              <span className="text-orange-500">₹{finalTotalPrice}</span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <PrimaryButton onClick={() => navigate('/payment', { state: { cart, totalPrice, fromPaymentGate: true }})} className="w-full max-w-sm justify-center">
              Proceed to Payment
            </PrimaryButton>
            <button onClick={() => navigate(-1)} className="mt-4 text-sm text-gray-600 hover:text-orange-500">
              ← Back to Kits
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}