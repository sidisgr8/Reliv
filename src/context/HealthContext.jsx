import React, { createContext, useContext, useEffect, useState } from "react";

const defaultData = {
  patient: {
    name: "",
    age: "",
    email: "",
    phone: "",
    gender: "",
  },
  vitals: {
    systolic: "",    // BP systolic
    diastolic: "",   // BP diastolic
    spo2: "",        // Oxygen %
    pulse: "",       // BPM
    tempF: "",       // Temperature in °F
    leftEye: "",     // Eye chart smallest line read (1-9)
    rightEye: "",
  },
};

const HealthContext = createContext();

export function HealthProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const saved = sessionStorage.getItem("reliv-health");
      return saved ? JSON.parse(saved) : defaultData;
    } catch {
      return defaultData;
    }
  });

  useEffect(() => {
    sessionStorage.setItem("reliv-health", JSON.stringify(data));
  }, [data]);

  // shallow + nested merge helper
  const update = (patch) =>
    setData((prev) => ({
      ...prev,
      ...(patch || {}),
      patient: { ...prev.patient, ...(patch?.patient || {}) },
      vitals: { ...prev.vitals, ...(patch?.vitals || {}) },
    }));

  const reset = () => setData(defaultData);

  return (
    <HealthContext.Provider value={{ data, update, reset }}>
      {children}
    </HealthContext.Provider>
  );
}

export const useHealth = () => useContext(HealthContext);
