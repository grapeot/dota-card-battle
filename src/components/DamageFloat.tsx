import React, { useState, useEffect } from 'react';

interface DamageFloatProps {
  text: string;
  type: string; // 'damage' | 'armor' | 'heal' | 'sacrifice'
  onComplete?: () => void;
}

export const DamageFloat: React.FC<DamageFloatProps> = ({ text, type, onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1100); // matches CSS animation duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className={`damage-float damage-float-${type}`}>
      {text}
    </div>
  );
};
