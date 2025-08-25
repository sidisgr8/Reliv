import React, { useEffect, useState } from 'react';

export default function UVCleansingAnimation({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalTime = 15000; // 15 seconds
    const intervalTime = 100; // update every 100ms
    let elapsedTime = 0;

    const interval = setInterval(() => {
      elapsedTime += intervalTime;
      setProgress((elapsedTime / totalTime) * 100);

      if (elapsedTime >= totalTime) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
      <div className="text-center text-white">
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }
            .pulsing-text {
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}
        </style>
        <h2 className="text-3xl font-bold mb-4 pulsing-text">UV Cleansing...</h2>
        <p className="mb-6">Please wait while we sanitize the equipment.</p>
        
        <div className="w-64 bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-400 h-2.5 rounded-full transition-all duration-100 ease-linear" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}