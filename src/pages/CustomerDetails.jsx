import React, { useEffect, useState } from "react";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHealth } from "../context/HealthContext";
import { KeyboardWrapper } from "../components/KeyboardWrapper";

function CustomerDetails({ inputs, onInputChange }) {
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
  const [errors, setErrors] = useState({
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

  useEffect(() => {
    if (inputs) {
      setForm((prevForm) => ({ ...prevForm, ...inputs }));
    }
  }, [inputs]);

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!form.name.trim()) {
      newErrors.name = t("nameRequired");
      isValid = false;
    }
    if (!form.age || form.age < 1 || form.age > 120) {
      newErrors.age = t("ageInvalid");
      isValid = false;
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t("emailInvalid");
      isValid = false;
    }
    if (!form.phone || !/^\+?\d{10,15}$/.test(form.phone.replace(/\D/g, ""))) {
      newErrors.phone = t("phoneInvalid");
      isValid = false;
    }
    if (!form.gender) {
      newErrors.gender = t("genderRequired");
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const sanitizedValue = type !== "radio" ? value.trimStart() : value;
    
    setForm((prev) => ({ ...prev, [name]: sanitizedValue }));
    
    if (type !== "radio" && onInputChange) {
      onInputChange(name, sanitizedValue);
    }

    // Clear error for the field being edited
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleProceed = () => {
    if (validateForm()) {
      update({ patient: form });
      navigate("/two-options");
    }
  };

  const handleClear = () => {
    setForm({
      name: "",
      age: "",
      email: "",
      phone: "",
      gender: "",
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden pb-20 md:pb-64">
      {/* Top faded orange header area */}
      <div className="bg-gradient-to-b from-orange-50 to-white pt-16 pb-6 flex flex-col items-center">
        <Logo size="text-3xl md:text-4xl" />
        <p className="mt-3 text-gray-600 text-center text-sm md:text-base">
          {t("introMessage")}
        </p>
      </div>

      {/* Sliding card */}
      <div
        className={`mt-auto transform transition-transform duration-700 ease-out ${
          slideUp ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl border border-gray-300 px-6 py-8 max-w-lg mx-auto md:max-w-2xl">
          <h2 className="text-lg md:text-xl font-semibold mb-6 text-center">
            {t("whoIsReliv")}
          </h2>

          {/* Name */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              {t("enterName")}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t("enterName")}
              className={`w-full border ${
                errors.name ? "border-red-500" : "border-gray-300"
              } rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-red-500 text-sm mt-1">
                {errors.name}
              </p>
            )}
          </div>

          {/* Age */}
          <div className="mb-4">
            <label htmlFor="age" className="block text-sm font-medium mb-1">
              {t("enterAge")}
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder={t("enterAge")}
              className={`w-full border ${
                errors.age ? "border-red-500" : "border-gray-300"
              } rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors`}
              aria-invalid={!!errors.age}
              aria-describedby={errors.age ? "age-error" : undefined}
            />
            {errors.age && (
              <p id="age-error" className="text-red-500 text-sm mt-1">
                {errors.age}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              {t("enterEmail")}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t("enterEmail")}
              className={`w-full border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-red-500 text-sm mt-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              {t("enterPhone")}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder={t("enterPhone")}
              className={`w-full border ${
                errors.phone ? "border-red-500" : "border-gray-300"
              } rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors`}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="text-red-500 text-sm mt-1">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="mb-6">
            <fieldset>
              <legend className="mb-2 font-medium text-sm">
                {t("selectGender")}
              </legend>
              <div className="flex items-center gap-4 flex-wrap">
                {["male", "female", "others"].map((genderKey) => (
                  <label
                    key={genderKey}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={t(genderKey)}
                      checked={form.gender === t(genderKey)}
                      onChange={handleChange}
                      className="focus:ring-2 focus:ring-orange-400"
                      aria-checked={form.gender === t(genderKey)}
                    />
                    <span className="text-sm">{t(genderKey)}</span>
                  </label>
                ))}
              </div>
              {errors.gender && (
                <p id="gender-error" className="text-red-500 text-sm mt-1">
                  {errors.gender}
                </p>
              )}
            </fieldset>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 md:flex-row md:justify-between">
            <PrimaryButton
              className="w-full md:w-1/2 justify-center"
              onClick={handleProceed}
            >
              {t("proceed")}
            </PrimaryButton>
            <button
              type="button"
              onClick={handleClear}
              className="w-full md:w-1/2 bg-gray-200 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-300 transition-colors"
            >
              {t("clearForm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailsWrapper() {
  return (
    <KeyboardWrapper>
      <CustomerDetails />
    </KeyboardWrapper>
  );
}