// src/pages/OrderSuccess.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import TopEllipseBackground from '../components/TopEllipseBackground';
import UVCleansingAnimation from '../components/UVCleansingAnimation';

// Placeholder email sending animation
function EmailSendAnimation({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 5000); // 5 sec
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50 text-white">
      <h2 className="text-3xl font-bold mb-4 animate-pulse">Sending Confirmation Email...</h2>
      <p>Please wait while we notify you by email.</p>
    </div>
  );
}

// Payment success screen
function PaymentSuccess({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000); // 2 sec
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <TopEllipseBackground color="#E6FFFA" height="50%" />
      <div className="relative z-10">
        <Logo />
        <h1 className="text-3xl font-extrabold text-gray-800 mt-6">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mt-2">
          Thank you for your order. Your items will be processed shortly.
        </p>
        <div className="mt-8 text-4xl">✅</div>
      </div>
    </div>
  );
}

// Cleansing success screen
function CleansingSuccess({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000); // 2 sec
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative min-h-screen bg-green-50 flex flex-col items-center justify-center text-center px-4">
      <TopEllipseBackground color="#D1FAE5" height="50%" />
      <div className="relative z-10">
        <Logo />
        <h1 className="text-3xl font-extrabold text-green-800 mt-6">
          Cleansing Completed!
        </h1>
        <p className="text-green-600 mt-2">
          Your kit has been sanitized successfully.
        </p>
        <div className="mt-8 text-4xl">🧼✨</div>
      </div>
    </div>
  );
}

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const stockUpdated = useRef(false);

  // flow states: "email" → "payment" → "uv" → "cleansingSuccess"
  const [step, setStep] = useState("email");

  // Stock reduction logic
  useEffect(() => {
    if (stockUpdated.current) return;

    const { cart } = location.state || {};
    if (cart && cart.length > 0) {
      try {
        const storedKitsRaw = localStorage.getItem("medicalKits_v1");
        if (storedKitsRaw) {
          const storedKits = JSON.parse(storedKitsRaw);
          const updatedKits = storedKits.map(kit => {
            const cartItem = cart.find(item => item.id === kit.id);
            if (cartItem) {
              return { ...kit, quantity: kit.quantity - cartItem.quantity };
            }
            return kit;
          });
          localStorage.setItem("medicalKits_v1", JSON.stringify(updatedKits));
          stockUpdated.current = true;
          console.log("✅ Stock updated successfully.");
        }
      } catch (error) {
        console.error("Failed to update stock:", error);
      }
    }
  }, [location.state]);

  // Final redirect after cleansing success
  const handleRedirectHome = () => {
    navigate('/');
  };

  if (step === "email") {
    return <EmailSendAnimation onComplete={() => setStep("payment")} />;
  }

  if (step === "payment") {
    return <PaymentSuccess onComplete={() => setStep("uv")} />;
  }

  if (step === "uv") {
    return <UVCleansingAnimation onComplete={() => setStep("cleansingSuccess")} />;
  }

  if (step === "cleansingSuccess") {
    return <CleansingSuccess onComplete={handleRedirectHome} />;
  }

  return null;
}
