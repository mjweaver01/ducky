import React, { useState, useEffect } from 'react';
import QuackingDuck from './QuackingDuckIcon';
import './FadeOutLoader.css';

interface FadeOutLoaderProps {
  isLoading: boolean;
  size?: number;
  fadeDuration?: number;
  children: React.ReactNode;
}

const FadeOutLoader: React.FC<FadeOutLoaderProps> = ({
  isLoading,
  size = 75,
  fadeDuration = 100,
  children,
}) => {
  const [showLoader, setShowLoader] = useState(isLoading);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isLoading && showLoader) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setShowLoader(false);
        setFadeOut(false);
      }, fadeDuration);
      return () => clearTimeout(timer);
    } else if (isLoading && !showLoader) {
      setShowLoader(true);
    }
  }, [isLoading, showLoader, fadeDuration]);

  return (
    <>
      {children}
      {showLoader && (
        <div
          className={`fade-out-loader-overlay${fadeOut ? ' fade-out-loader-fade' : ''}`}
          style={{ transitionDuration: `${fadeDuration}ms` }}
        >
          <QuackingDuck size={size} wobble autoQuack />
        </div>
      )}
    </>
  );
};

export default FadeOutLoader;
