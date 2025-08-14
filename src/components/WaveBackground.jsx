import React from 'react';

/**
 * A responsive wave-shaped background component that replicates the provided image.
 * The wave is wider in the middle and uses a fixed color.
 *
 * @param {object} props - The component props.
 * @param {string} [props.className] - Additional Tailwind CSS classes for the container div.
 */
const WaveBackground = ({ className }) => {
  return (
    <div className={`w-full overflow-hidden leading-0 ${className || ''}`}>
      {/* - viewBox has been adjusted to give the wave more vertical space.
        - preserveAspectRatio="none" is crucial for responsiveness. It allows the SVG
          to stretch to fill the width of its container.
      */}
      <svg
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        className="block w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/*
          The 'd' attribute defines the path for the wave shape.
          - The vertical values have been adjusted to make the wave taller and wider in the middle.
          - The 'fill' attribute is now hardcoded with the requested color.
        */}
        <path
          fill="#fff1ea"
          d="M0,80 C180,40,360,40,540,80 C720,120,900,120,1080,80 C1260,40,1440,40,1440,80 V220 C1260,260,1080,260,900,220 C720,180,540,180,360,220 C180,260,0,260,0,220 Z"
        />
      </svg>
    </div>
  );
};

// --- Example Usage: App.js ---
// You can uncomment this section to see how to use the component.
/*
import WaveBackground from './WaveBackground'; // Adjust the import path

function App() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="relative text-center py-24">
        <div className="absolute inset-0 z-0">
          <WaveBackground />
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-gray-800">Welcome to My Site</h1>
          <p className="mt-4 text-lg text-gray-600">This content sits on top of the wave.</p>
        </div>
      </header>

      <main className="p-8">
        <h2 className="text-3xl font-semibold text-gray-800">Main Content Area</h2>
        <p className="mt-4 text-gray-600">
          The rest of your page content goes here.
        </p>
      </main>
    </div>
  );
}
*/

export default WaveBackground;
