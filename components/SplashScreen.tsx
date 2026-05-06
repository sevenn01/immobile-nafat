import React from 'react';

interface SplashScreenProps {
  isExiting: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isExiting }) => {
  const containerClasses = `
    flex items-center justify-center min-h-screen bg-green-600 overflow-hidden fixed inset-0 z-50
    ${isExiting ? 'animate-slide-up-and-out' : ''}
  `;

  return (
    <div className={containerClasses}>
        {/* The final background that slides up from the bottom */}
        <div className="absolute inset-0 bg-slate-50 animate-slide-up-reveal z-0"></div>

        {/* Text container (the mask) */}
        <div className="relative overflow-hidden z-10">
            {/* The text that slides down from the top of the mask */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 animate-slide-down-text will-change-transform opacity-0 text-center px-4">
                Nafat Immobilier
            </h1>
        </div>
    </div>
  );
};

export default SplashScreen;