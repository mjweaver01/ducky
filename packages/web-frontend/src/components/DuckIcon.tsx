import React from 'react';

interface DuckIconProps {
  size?: number;
  className?: string;
  onClick?: React.MouseEventHandler<SVGSVGElement>;
}

const DuckIcon: React.FC<DuckIconProps> = ({ size = 24, className = '', onClick }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      fill="none"
      width={size}
      height={size}
      className={className}
      onClick={onClick}
    >
      {/* Body */}
      <ellipse cx="50" cy="60" rx="28" ry="22" fill="currentColor"/>
      
      {/* Head */}
      <circle cx="45" cy="35" r="18" fill="currentColor"/>
      
      {/* Upper jaw */}
      <path className="upper-jaw" d="M 28 35 Q 18 35 18 38 L 28 38 Z" fill="currentColor" opacity="0.8"/>

      {/* Lower jaw */}
      <path className="lower-jaw" d="M 28 38 L 18 38 Q 18 41 28 41 Z" fill="currentColor" opacity="0.8"/>
      
      {/* Eye */}
      <circle cx="42" cy="32" r="3" fill="#0f172a"/>
      <circle cx="43" cy="31" r="1.2" fill="#ffffff"/>
      
      {/* Wing */}
      <path d="M 55 55 Q 70 50 75 60 Q 70 68 60 65 Z" fill="currentColor" opacity="0.7"/>
      
      {/* Tail feathers */}
      <path d="M 75 56 Q 85 50 88 58 Q 84 64 75 61 Z" fill="currentColor" opacity="0.8"/>
      <path d="M 76 62 Q 84 59 86 67 Q 81 73 75 68 Z" fill="currentColor" opacity="0.7"/>
      
      {/* Feet */}
      <g transform="translate(38, 78)">
        <path d="M 0 0 L -2 4 M 0 0 L 0 5 M 0 0 L 2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      </g>
      <g transform="translate(52, 80)">
        <path d="M 0 0 L -2 4 M 0 0 L 0 5 M 0 0 L 2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      </g>
    </svg>
  );
};

export default DuckIcon;
