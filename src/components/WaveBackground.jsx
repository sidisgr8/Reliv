// src/components/WaveBackground.jsx
import React from "react";

export default function WaveBackground({
  position = "bottom", // "top" or "bottom"
  className = "",
  variant = "faded", // future-proofing
}) {
  const isTop = position === "top";
  // faded peach color; adjust via Tailwind classes or change fill below
  const fill = variant === "faded" ? "#FDEDE7" : "#F97316";

  return (
    <div
      aria-hidden="true"
      className={`absolute left-0 w-full pointer-events-none ${
        isTop ? "top-0" : "bottom-0"
      } ${className}`}
      style={{ zIndex: -1 }}
    >
      <svg
        className={`${isTop ? "h-[48vh]" : "h-[36vh]"} w-full`}
        viewBox="0 0 1440 320"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Example soft wave path — tweak path data as you like */}
        <path
          fill={fill}
          d={
            isTop
              ? "M0,96 C200,0 500,160 720,120 C940,80 1200,8 1440,64 L1440,0 L0,0 Z"
              : "M0,224 C200,160 500,320 720,288 C940,256 1200,96 1440,128 L1440,320 L0,320 Z"
          }
        />
      </svg>
    </div>
  );
}
