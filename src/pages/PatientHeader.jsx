// src/components/PatientHeader.jsx
import React from 'react';
import { useHealth } from '../context/HealthContext';

const PatientHeader = () => {
  const { data } = useHealth();
  const { patient } = data;

  return (
    <div className="w-full max-w-md mx-auto bg-white p-3 rounded-lg shadow-md border border-gray-200 mb-4">
      <div className="flex justify-between text-sm text-gray-700">
        <span>
          <strong>Name:</strong> {patient.name || 'N/A'}
        </span>
        <span>
          <strong>Age:</strong> {patient.age || 'N/A'}
        </span>
        <span>
          <strong>Gender:</strong> {patient.gender || 'N/A'}
        </span>
      </div>
    </div>
  );
};

export default PatientHeader;