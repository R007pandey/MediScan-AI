
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-8 h-8" }) => (
  <div className={`bg-[#FF4D00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 text-white ${className}`}>
    <svg className="w-3/5 h-3/5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 11v4m-2-2h4" />
    </svg>
  </div>
);

export default Logo;
