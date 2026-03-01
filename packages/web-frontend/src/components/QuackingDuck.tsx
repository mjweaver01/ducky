import React, { useState, useEffect, useRef, useCallback } from 'react';
import DuckIcon from './DuckIcon';
import './QuackingDuck.css';

interface QuackingDuckProps {
  size?: number;
  wobble?: boolean;
  autoQuack?: boolean;
  initialDelay?: number;
  interval?: number;
  className?: string;
}

const QuackingDuck: React.FC<QuackingDuckProps> = ({
  size = 64,
  wobble = false,
  autoQuack = false,
  initialDelay = 1500,
  interval = 2000,
  className = '',
}) => {
  const [isQuacking, setIsQuacking] = useState(false);
  const isQuackingRef = useRef(false);

  const triggerQuack = useCallback(() => {
    if (isQuackingRef.current) return;
    isQuackingRef.current = true;
    setIsQuacking(true);
    setTimeout(() => {
      setIsQuacking(false);
      isQuackingRef.current = false;
    }, 650);
  }, []);

  useEffect(() => {
    if (!autoQuack) return;
    const initial = setTimeout(triggerQuack, initialDelay);
    const timer = setInterval(triggerQuack, interval);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [autoQuack, initialDelay, interval, triggerQuack]);

  const containerClass = [
    'quacking-duck',
    wobble ? 'quacking-duck--wobble' : '',
    isQuacking ? 'quacking-duck--quacking' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass} onClick={triggerQuack}>
      <DuckIcon size={size} />
    </div>
  );
};

export default QuackingDuck;
