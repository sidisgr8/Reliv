// src/pages/OrderSuccess.jsx
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import TopEllipseBackground from '../components/TopEllipseBackground';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const stockUpdated = useRef(false);

  // Stock reduction logic for the purchased kits
  useEffect(() => {
    if (stockUpdated.current) {
      return;
    }
    const { cart } = location.state || {};
    if (cart && cart.length > 0) {
      console.log("Processing stock reduction for successful order:", cart);
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
          console.log("✅ Stock updated successfully from OrderSuccess.");
          stockUpdated.current = true;
        }
      } catch (error) {
        console.error("Failed to update stock:", error);
      }
    }
  }, [location.state]);

  // Redirect to home after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 4000); // 4 seconds

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-gray-50 font-sans flex flex-col items-center justify-center text-center px-4">
      <TopEllipseBackground color="#E6FFFA" height="50%" />
      <div className="relative z-10">
        <Logo />
        <h1 className="text-3xl font-extrabold text-gray-800 mt-6">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mt-2">
          Thank you for your order. Your items will be processed shortly.
        </p>
        <div className="mt-8 text-4xl">
            ✅
        </div>
        <p className="text-sm text-gray-500 mt-8">
          Redirecting to the homepage automatically...
        </p>
      </div>
    </div>
  );
}