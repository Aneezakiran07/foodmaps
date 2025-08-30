import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiShoppingBag, FiUsers, FiMail } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col items-center">
          {/* Explore Section - Responsive Grid */}
          <div className="text-center mb-6 sm:mb-8 w-full">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Explore</h3>
            
            {/* Mobile: 2x2 Grid, Tablet+: Single Row */}
            <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-center sm:space-x-6 lg:space-x-8 max-w-md sm:max-w-none mx-auto">
              <Link 
                to="/" 
                className="flex items-center justify-center sm:justify-start space-x-2 p-3 sm:p-0 rounded-lg hover:bg-gray-800 sm:hover:bg-transparent hover:text-orange-500 transition-colors"
              >
                <FiHome className="w-5 h-5" />
                <span className="text-sm sm:text-base">Home</span>
              </Link>
              
              <Link 
                to="/shops" 
                className="flex items-center justify-center sm:justify-start space-x-2 p-3 sm:p-0 rounded-lg hover:bg-gray-800 sm:hover:bg-transparent hover:text-orange-500 transition-colors"
              >
                <FiShoppingBag className="w-5 h-5" />
                <span className="text-sm sm:text-base">Shops</span>
              </Link>
              
              <Link 
                to="/suggestions" 
                className="flex items-center justify-center sm:justify-start space-x-2 p-3 sm:p-0 rounded-lg hover:bg-gray-800 sm:hover:bg-transparent hover:text-orange-500 transition-colors"
              >
                <FiUsers className="w-5 h-5" />
                <span className="text-sm sm:text-base">Community</span>
              </Link>
              
              <Link 
                to="/contact" 
                className="flex items-center justify-center sm:justify-start space-x-2 p-3 sm:p-0 rounded-lg hover:bg-gray-800 sm:hover:bg-transparent hover:text-orange-500 transition-colors"
              >
                <FiMail className="w-5 h-5" />
                <span className="text-sm sm:text-base">Contact</span>
              </Link>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="text-center text-gray-400 border-t border-gray-800 pt-6 w-full">
            <p className="text-xs sm:text-sm">
              © 2025 FoodMaps. Contact us at:{' '}
              <a 
                href="mailto:aneezakiran07@gmail.com" 
                className="text-orange-500 hover:text-orange-400 transition-colors break-all sm:break-normal"
              >
                aneezakiran07@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;