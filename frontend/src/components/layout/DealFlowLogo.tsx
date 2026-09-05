import React from 'react';

interface DealFlowLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function DealFlowLogo({ className = '', size = 32, showText = true }: DealFlowLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        {/* Background Shield/Diamond */}
        <path
          d="M50 5L90 25V60L50 95L10 60V25L50 5Z"
          fill="url(#paint0_linear)"
          className="animate-pulse-slow"
        />
        
        {/* 360 Flow cycle */}
        <path
          d="M50 20C33.4315 20 20 33.4315 20 50C20 66.5685 33.4315 80 50 80"
          stroke="#00A09D"
          strokeWidth="8"
          strokeLinecap="round"
          className="drop-shadow-sm"
        />
        <path
          d="M50 80C66.5685 80 80 66.5685 80 50C80 33.4315 66.5685 20 50 20"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="4 8"
          className="opacity-80"
        />
        
        {/* Inner Diamond / Core */}
        <path
          d="M50 35L65 50L50 65L35 50L50 35Z"
          fill="#00A09D"
        />

        <defs>
          <linearGradient
            id="paint0_linear"
            x1="10"
            y1="5"
            x2="90"
            y2="95"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#714B67" />
            <stop offset="1" stopColor="#4A3143" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#714B67] to-[#00A09D] tracking-tight">
          DealFlow<span className="font-black text-slate-800 dark:text-white">360</span>
        </span>
      )}
    </div>
  );
}
