import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import QuackingDuck, { type QuackingDuckHandle } from './QuackingDuckIcon';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  quack?: 'hover-wobble' | 'hover' | 'click' | false;
  className?: string;
  style?: React.CSSProperties;
  to?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  quack = 'hover',
  className = '',
  style = {},
  to = '/',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const duckRef = useRef<QuackingDuckHandle>(null);

  const sizeConfig = {
    sm: { icon: 32, fontSize: '24px' },
    md: { icon: 44, fontSize: '32px' },
    lg: { icon: 64, fontSize: '48px' },
  };

  const config = sizeConfig[size];
  const wobbleOnHover = quack === 'hover-wobble';

  return (
    <Link
      to={to}
      className={`logo ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
        fontSize: config.fontSize,
        ...style,
      }}
      onMouseEnter={() => {
        if (wobbleOnHover) setIsHovered(true);
        else if (quack === 'hover') duckRef.current?.quack();
      }}
      onMouseLeave={wobbleOnHover ? () => setIsHovered(false) : undefined}
    >
      <QuackingDuck
        ref={duckRef}
        size={config.icon}
        wobble={wobbleOnHover && isHovered}
        autoQuack={wobbleOnHover && isHovered}
        className="logo-icon"
      />
      <span className="logo-text">ducky</span>
    </Link>
  );
};

export default Logo;
