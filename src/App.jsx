import React from "react";
import { Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash.jsx";
import ChooseLanguage from "./pages/ChooseLanguage.jsx";
import CustomerDetails from "./pages/CustomerDetails.jsx";
import TwoOptions from "./pages/TwoOptions.jsx";
import HealthCheckup from "./pages/HealthCheckup.jsx"; // 👈 Import HealthCheckup
import MedicineDispensing from "./pages/MedicineDispensing.jsx";
import BloodPressure from "./pages/BloodPressure.jsx" // 👈 Import MedicineDispensing

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
      <Route path="/blood-pressure" element={<BloodPressure/>} />
    </Routes>
  );
}