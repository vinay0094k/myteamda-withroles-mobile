
import React from 'react';

interface WelcomeSectionProps {
  userName: string;
}

const WelcomeSection = ({ userName }: WelcomeSectionProps) => {
  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-r from-purple-50 to-pink-50">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
        Welcome back, {userName}
      </h2>
      <p className="text-gray-600 sm:text-lg">Have a productive day ahead!</p>
    </div>
  );
};

export default WelcomeSection;
