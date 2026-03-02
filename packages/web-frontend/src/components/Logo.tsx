import React from 'react';
import { Link } from 'react-router-dom';
import DuckIcon from './DuckIcon';

interface LogoProps {
  size?: 'small' | 'big';
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 'big', className = '', style = {} }) => {
  const sizeConfig = {
    small: { icon: 32, fontSize: '24px' },
    big: { icon: 44, fontSize: '32px' },
  };

  const config = sizeConfig[size];

  return (
    <>
      <style>
        {`
          .logo:hover .upper-jaw {
            transform: rotate(22deg);
          }
          .logo:hover .lower-jaw {
            transform: rotate(-22deg);
          }
        `}
      </style>
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
      >
        <DuckIcon size={config.icon} className="logo-icon" />
        <span className="logo-text">ducky</span>
      </Link>
    </>
  );
};

export default Logo;
