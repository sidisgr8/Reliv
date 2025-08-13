import React from "react";
import { Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash.jsx";
import ChooseLanguage from "./pages/ChooseLanguage.jsx";
import CustomerDetails from "./pages/CustomerDetails.jsx";
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/choose-language" element={<ChooseLanguage />} />
      <Route path="/customer-details" element={<CustomerDetails />} />

    </Routes>
  );
}
