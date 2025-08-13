import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";

export default function CustomerDetails() {
  const [slideUp, setSlideUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlideUp(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* Top faded orange header area */}
      <div className="bg-gradient-to-b from-orange-50 to-white pt-[60px] pb-6 flex flex-col items-center">
        <Logo size="text-3xl" />
        <p className="mt-3 text-gray-600">A couple of questions to start</p>
      </div>

      {/* Sliding card */}
      <div
        className={`mt-auto transform transition-transform duration-700 ease-out ${
          slideUp ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl border border-gray-300 px-6 py-8">
          <h2 className="text-base font-semibold mb-6">
            Who is Reliv taking care of today
          </h2>

          {/* Name */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Age */}
          <div className="mb-4">
            <input
              type="number"
              placeholder="Enter your age"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <input
              type="tel"
              placeholder="Enter your Phone no."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Gender */}
          <div className="mb-6">
            <p className="mb-2 font-medium">Select your Gender</p>
            <div className="flex items-center gap-4">
              {["Male", "Female", "Others"].map((gender) => (
                <label key={gender} className="flex items-center gap-2">
                  <input type="radio" name="gender" value={gender} />
                  <span>{gender}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Proceed button */}
          <PrimaryButton className="w-full justify-center">
            Proceed →
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
