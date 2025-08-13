import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function HealthCheckup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
      <Logo size="text-4xl" />
      <h2 className="mt-4 text-2xl">Health Checkup</h2>
      <p className="mt-2 text-gray-600">This page is under construction.</p>
      <button
        onClick={() => navigate(-1)}
        className="mt-6 text-orange-500 hover:underline"
      >
        ← Go Back
      </button>
    </div>
  );
}