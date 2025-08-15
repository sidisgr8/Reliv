import React from "react";

export default function TopEllipseBackground({ color = "#FFF1EA", height = "60%" }) {
  return (
    <div
      className="absolute top-0 left-0 w-full z-0"
      style={{
        height,
        backgroundColor: color,
        clipPath: "ellipse(120% 100% at 50% -40%)",
      }}
    ></div>
  );
}
