import React from "react";
import { Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash.jsx";
import ChooseLanguage from "./pages/ChooseLanguage.jsx";
import CustomerDetails from "./pages/CustomerDetails.jsx";
import TwoOptions from "./pages/TwoOptions.jsx";
import HealthCheckup from "./pages/HealthCheckup.jsx"; // 👈 Import HealthCheckup
import MedicineDispensing from "./pages/MedicineDispensing.jsx";
import EyeSight from "./pages/EyeSight.jsx";
 // 👈 Import MedicineDispensing
import OxygenPulse from "./pages/OxygenPulse.jsx"; // 👈 Add this import
import BodyTemperature from "./pages/BodyTemperature";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/choose-language" element={<ChooseLanguage />} />
      <Route path="/customer-details" element={<CustomerDetails />} />
      <Route path="/two-options" element={<TwoOptions />} />
      {/* 👇 Add the new routes for the two flows */}
      <Route path="/health-checkup" element={<HealthCheckup />} />
      <Route path="/medicine-dispensing" element={<MedicineDispensing />} />
      
      <Route path="/oxygen-pulse" element={<OxygenPulse />} />
      <Route path="/body-temperature" element={<BodyTemperature />} />
      <Route path="/EyeSight" element={<EyeSight />}/>
    </Routes>
  );
}