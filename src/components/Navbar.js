import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiTrendingUp, FiSettings } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHomePage = location.pathname === '/';

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled || !isHomePage ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-2xl font-bold text-orange-500">FoodMaps</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`${
                isScrolled || !isHomePage ? 'text-gray-900' : 'text-white'
              } hover:text-orange-500 transition-colors`}
            >
              Home
            </Link>
            <Link
              to="/shops"
              className={`${
                isScrolled || !isHomePage ? 'text-gray-900' : 'text-white'
              } hover:text-orange-500 transition-colors`}
            >
              Shops
            </Link>

            <Link
              to="/whats-hot"
              className={`${
                isScrolled || !isHomePage ? 'text-gray-900' : 'text-white'
              } hover:text-orange-500 transition-colors flex items-center gap-1`}
            >
              <FiTrendingUp className="w-4 h-4" />
              What's Hot
            </Link>

            <Link
              to="/suggestions"
              className={`${
                isScrolled || !isHomePage ? 'text-gray-900' : 'text-white'
              } hover:text-orange-500 transition-colors`}
            >
              Community
            </Link>

            <Link
              to="/contact"
              className={`${
                isScrolled || !isHomePage ? 'text-gray-900' : 'text-white'
              } hover:text-orange-500 transition-colors`}
            >
              Contact
            </Link>

            {/* Admin Link - Only visible on desktop */}
            <Link
              to="/admin"
              className={`${
                isScrolled || !isHomePage ? 'text-gray-600' : 'text-gray-300'
              } hover:text-orange-500 transition-colors flex items-center gap-1 text-sm`}
              title="Admin Panel"
            >
              <FiSettings className="w-4 h-4" />
              Admin
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`${
                isScrolled || !isHomePage ? 'text-gray-900' : 'text-white'
              } hover:text-orange-500 transition-colors`}
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white"
          >
            <div className="px-4 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-900 hover:text-orange-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/shops"
                className="block px-3 py-2 text-gray-900 hover:text-orange-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Shops
              </Link>

              <Link
                to="/whats-hot"
                className="flex items-center gap-2 px-3 py-2 text-gray-900 hover:text-orange-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiTrendingUp className="w-4 h-4" />
                What's Hot
              </Link>

              <Link
                to="/suggestions"
                className="block px-3 py-2 text-gray-900 hover:text-orange-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Community
              </Link>

              <Link
                to="/contact"
                className="block px-3 py-2 text-gray-900 hover:text-orange-500 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>

              {/* Admin Link - Also in mobile menu */}
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-orange-500 transition-colors border-t border-gray-200 mt-2 pt-3"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiSettings className="w-4 h-4" />
                Admin Panel
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;