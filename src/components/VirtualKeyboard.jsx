import React, { useRef, useEffect, useState } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

const VirtualKeyboard = ({ inputName, inputs, onChange, onClose }) => {
  const keyboard = useRef();
  const [layoutName, setLayoutName] = useState('default');

  useEffect(() => {
    if (keyboard.current) {
      keyboard.current.setInput(inputs[inputName] || '');
    }
  }, [inputName, inputs]);

  const handleKeyboardChange = (input) => {
    onChange(inputName, input);
  };

  const onKeyPress = (button) => {
    if (button === '{shift}' || button === '{lock}') {
      handleShift();
    }
    if (button === '{close}') {
      onClose();
    }
  };

  const handleShift = () => {
    const newLayoutName = layoutName === 'default' ? 'shift' : 'default';
    setLayoutName(newLayoutName);
  };

  return (
    <div className="virtual-keyboard">
      <Keyboard
        keyboardRef={(r) => (keyboard.current = r)}
        inputName={inputName}
        layoutName={layoutName}
        onChange={handleKeyboardChange}
        onKeyPress={onKeyPress}
        layout={{
          default: [
            '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
            '{tab} q w e r t y u i o p [ ] \\',
            "{lock} a s d f g h j k l ; ' {enter}",
            '{shift} z x c v b n m , . / {shift}',
            '.com @ {space} {close}',
          ],
          shift: [
            '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
            '{tab} Q W E R T Y U I O P { } |',
            '{lock} A S D F G H J K L : " {enter}',
            '{shift} Z X C V B N M < > ? {shift}',
            '.com @ {space} {close}',
          ],
        }}
        display={{
          '{close}': 'Hide Keyboard',
          '{bksp}': 'Backspace',
          '{enter}': 'Enter',
          '{shift}': 'Shift',
          '{lock}': 'Caps Lock',
          '{tab}': 'Tab',
          '{space}': ' '
        }}
      />
    </div>
  );
};

export default VirtualKeyboard;