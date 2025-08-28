// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash.jsx";
import ChooseLanguage from "./pages/ChooseLanguage.jsx";
import CustomerDetails from "./pages/CustomerDetails.jsx";
import TwoOptions from "./pages/TwoOptions.jsx";
import HealthCheckup from "./pages/HealthCheckup.jsx";
import MedicineDispensing from "./pages/MedicineDispensing.jsx";
import EyeSight from "./pages/EyeSight.jsx";
import PaymentGate from "./pages/PaymentGate.jsx";
import OxygenPulse from "./pages/OxygenPulse.jsx";
import BodyTemperature from "./pages/BodyTemperature.jsx";
import Report from "./pages/Report.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import BodyComposition from "./pages/BodyComposition.jsx"; // Import the new component

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/choose-language" element={<ChooseLanguage />} />
      <Route path="/customer-details" element={<CustomerDetails />} />
      <Route path="/two-options" element={<TwoOptions />} />
      <Route path="/health-checkup" element={<HealthCheckup />} />
      <Route path="/medicine-dispensing" element={<MedicineDispensing />} />
      <Route path="/payment" element={<PaymentGate />} />
      <Route path="/oxygen-pulse" element={<OxygenPulse />} />
      <Route path="/body-temperature" element={<BodyTemperature />} />
      <Route path="/eyesight" element={<EyeSight />} />
      <Route path="/body-composition" element={<BodyComposition />} /> {/* Add the new route */}
      <Route path="/report" element={<Report />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-success" element={<OrderSuccess />} />
    </Routes>
  );
}