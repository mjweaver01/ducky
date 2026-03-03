import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import QuackingDuck, { type QuackingDuckHandle } from './QuackingDuckIcon';

interface LogoProps {
  size?: 'small' | 'big';
  quack?: 'hover-wobble' | 'hover' | 'click' | false;
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 'big', quack = 'hover', className = '', style = {} }) => {
  const [isHovered, setIsHovered] = useState(false);
  const duckRef = useRef<QuackingDuckHandle>(null);

  const sizeConfig = {
    small: { icon: 32, fontSize: '24px' },
    big: { icon: 44, fontSize: '32px' },
  };

  const config = sizeConfig[size];
  const wobbleOnHover = quack === 'hover-wobble';

  return (
    <Link
      to="/"
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
