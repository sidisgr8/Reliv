// src/components/PrimaryButton.jsx
import React from "react";

export default function PrimaryButton({
  children,
  onClick,
  className = "",
  ariaLabel,
  type = "button",
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-6 py-2 rounded-lg font-medium
                  shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400
                  ${disabled ? "opacity-60 cursor-not-allowed" : "bg-orange-500 text-white hover:bg-orange-600"}
                  ${className}`}
    >
      {children}
    </button>
  );
}
