import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHealth } from "../context/HealthContext";

export default function CustomerDetails() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { update } = useHealth();
  const [slideUp, setSlideUp] = useState(false);

  const [form, setForm] = useState({
    name: "",
    age: "",
    email: "",
    phone: "",
    gender: "",
  });

  useEffect(() => {
    const tOut = setTimeout(() => setSlideUp(true), 20);
    return () => clearTimeout(tOut);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProceed = () => {
    update({ patient: form }); // Save to global context
    navigate("/two-options");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      {/* Top faded orange header area */}
      <div className="bg-gradient-to-b from-orange-50 to-white pt-[60px] pb-6 flex flex-col items-center">
        <Logo size="text-3xl" />
        <p className="mt-3 text-gray-600">{t("introMessage")}</p>
      </div>

      {/* Sliding card */}
      <div
        className={`mt-auto transform transition-transform duration-700 ease-out ${
          slideUp ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl border border-gray-300 px-6 py-8">
          <h2 className="text-base font-semibold mb-6">{t("whoIsReliv")}</h2>

          {/* Name */}
          <div className="mb-4">
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t("enterName")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Age */}
          <div className="mb-4">
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder={t("enterAge")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t("enterEmail")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder={t("enterPhone")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Gender */}
          <div className="mb-6">
            <p className="mb-2 font-medium">{t("selectGender")}</p>
            <div className="flex items-center gap-4">
              {["male", "female", "others"].map((genderKey) => (
                <label key={genderKey} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value={t(genderKey)}
                    checked={form.gender === t(genderKey)}
                    onChange={handleChange}
                  />
                  <span>{t(genderKey)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Proceed button */}
          <PrimaryButton
            className="w-full justify-center"
            onClick={handleProceed}
          >
            {t("proceed")}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
