// src/components/About.js
import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">About Us</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">
            Welcome to Food App, your ultimate destination for discovering the best local restaurants and food experiences.
          </p>
          <p className="text-gray-600 mb-4">
            Our mission is to connect food lovers with amazing dining experiences, making it easier than ever to find and enjoy great food in your area.
          </p>
          <p className="text-gray-600">
            Whether you're looking for a quick bite or a fine dining experience, we've got you covered with our comprehensive listings and detailed information about each restaurant.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
