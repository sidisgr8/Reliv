import React, { useState, useCallback } from 'react';
import VirtualKeyboard from './VirtualKeyboard';

export const KeyboardWrapper = ({ children }) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputs, setInputs] = useState({});

  const handleInputFocus = (event) => {
    if (['radio', 'file', 'checkbox'].includes(event.target.type)) {
      return;
    }
    setKeyboardVisible(true);
    setInputName(event.target.name);
  };

  const handleInputChange = useCallback((name, value) => {
    setInputs((prevInputs) => ({
      ...prevInputs,
      [name]: value,
    }));
  }, []);

  const hideKeyboard = () => {
    setKeyboardVisible(false);
  };

  return (
    <div onFocusCapture={handleInputFocus}>
      {React.cloneElement(children, {
        inputs,
        onInputChange: handleInputChange,
      })}
      {keyboardVisible && (
        <VirtualKeyboard
          inputName={inputName}
          inputs={inputs}
          onChange={handleInputChange}
          onClose={hideKeyboard}
        />
      )}
    </div>
  );
};