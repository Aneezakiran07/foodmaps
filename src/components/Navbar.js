import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX } from 'react-icons/fi';
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;