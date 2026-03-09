import React, { useState, useEffect } from 'react';
import QuackingDuck from './QuackingDuckIcon';
import './FadeOutLoader.css';

interface SuspenseFallbackProps {
  size?: number;
  fadeDuration?: number;
}

const SuspenseFallback: React.FC<SuspenseFallbackProps> = ({ size = 100, fadeDuration = 400 }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger mount animation
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fade-out-loader-overlay${!mounted ? ' fade-out-loader-fade' : ''}`}
      style={{
        transitionDuration: `${fadeDuration}ms`,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--dark)',
        zIndex: 9999,
      }}
    >
      <QuackingDuck size={size} wobble autoQuack />
    </div>
  );
};

export default SuspenseFallback;
