import React, { useEffect, useState } from "react";

export default function EmailSendingAnimation({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalTime = 5000; // 5 seconds
    const intervalTime = 100;
    let elapsedTime = 0;

    const interval = setInterval(() => {
      elapsedTime += intervalTime;
      setProgress((elapsedTime / totalTime) * 100);

      if (elapsedTime >= totalTime) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
      <div className="text-center text-white">
        <h2 className="text-3xl font-bold mb-4 animate-pulse">
          Sending Confirmation Email...
        </h2>
        <p className="mb-6">Please wait while we finalize your order</p>

        <div className="w-64 bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-teal-400 h-2.5 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
