import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";

export default function ChooseLanguage() {
  const [slideUp, setSlideUp] = useState(false);

  useEffect(() => {
    // Start the slide-up animation right after mount
    const t = setTimeout(() => setSlideUp(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* Top faded orange header area */}
      <div className="bg-gradient-to-b from-orange-50 to-white pt-10 pb-6 flex flex-col items-center">
        <Logo size="text-3xl" />
        <p className="mt-3 text-gray-600">A couple of questions to start</p>
      </div>

      {/* Sliding card */}
      <div
        className={`bg-white rounded-t-3xl shadow-lg px-6 py-8 mt-auto transform transition-transform duration-700 ease-out ${
          slideUp ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <h2 className="text-base font-semibold mb-6">Choose your language</h2>

        {/* Language options */}
        <div className="space-y-4 mb-6">
          {["English", "Hindi", "Bengali"].map((lang) => (
            <button
              key={lang}
              className="w-full border border-gray-300 rounded-lg py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Proceed button */}
        <PrimaryButton className="w-full justify-center">
          Proceed →
        </PrimaryButton>
      </div>
    </div>
  );
}
