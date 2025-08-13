// src/components/Logo.jsx
import React from "react";

export default function Logo({ className = "", size = "text-3xl md:text-4xl" }) {
  return (
    <div className={`inline-flex items-center ${className}`} aria-hidden="true">
      <h1 className={`${size} font-extrabold leading-tight`}>
        <span className="text-orange-500">Rel</span>
        <span className="text-black">iv</span>
      </h1>
    </div>
  );
}
