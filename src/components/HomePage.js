
import React from 'react';
import HeroSection from './HeroSection';
import TopRestaurants from './TopRestaurants';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <HeroSection />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TopRestaurants />
        </div>
      </main>
    </div>
  );
};

export default HomePage;