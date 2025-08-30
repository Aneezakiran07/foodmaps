import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { getTopRatedRestaurants } from '../utils/supabaseRestaurantService';

const TopRestaurants = () => {
  const scrollContainerRef = useRef(null);
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTopRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get top rated restaurants using your existing service
        const restaurants = await getTopRatedRestaurants(10);

        const transformedRestaurants = restaurants.map(restaurant => {
          // Handle cuisine data properly based on your new schema
          let cuisineString = 'Not specified';
          if (restaurant.cuisines) {
            if (Array.isArray(restaurant.cuisines)) {
              // New schema: array of cuisine objects
              cuisineString = restaurant.cuisines.map(c => c.name).join(', ') || 'Not specified';
            } else if (typeof restaurant.cuisines === 'string') {
              // Fallback: string format
              cuisineString = restaurant.cuisines;
            }
          } else if (restaurant.cuisine) {
            cuisineString = restaurant.cuisine;
          }

          return {
            id: restaurant.id,
            name: restaurant.name,
            image: restaurant.image_url || restaurant.image,
            description: restaurant.description,
            phone: restaurant.phone,
            location: restaurant.address || restaurant.location,
            cuisine: cuisineString,
            averageRating: restaurant.averageRating || restaurant.avg_rating || 0,
            totalRatings: restaurant.totalRatings || restaurant.total_reviews || 0,
            isActive: restaurant.is_active !== false
          };
        });

        setTopRestaurants(transformedRestaurants.slice(0, 10));
      } catch (error) {
        console.error('Error loading restaurant ratings:', error);
        setError(error.message);
        // Don't set fallback restaurants, just show error state
        setTopRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    loadTopRestaurants();
  }, []);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 300;
      current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (error) {
    return (
      <section className="py-8 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <p className="text-red-600">Error loading top restaurants: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-2xl font-bold text-center">Popular Places</h2>
          <p className="text-sm text-gray-600 text-center mt-2">Top 10 highest rated restaurants</p>
          <div className="hidden md:flex space-x-2 mt-4">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              <FiChevronLeft className="text-gray-600" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              <FiChevronRight className="text-gray-600" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-600">Loading top restaurants...</p>
          </div>
        ) : topRestaurants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No restaurants found.</p>
          </div>
        ) : (
          <>
            {/* Mobile Scrollable View */}
            <div className="md:hidden relative">
              <div
                ref={scrollContainerRef}
                className="flex space-x-4 overflow-x-auto scrollbar-hide py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {topRestaurants.map((restaurant) => (
                  <Link
                    to={`/shops/${restaurant.id}`}
                    key={restaurant.id}
                    className="flex-none w-[280px]"
                  >
                    <motion.div
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={restaurant.image || 'https://via.placeholder.com/300x200?text=No+Image'}
                          alt={restaurant.name}
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                          }}
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold mb-2">{restaurant.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{restaurant.cuisine}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FiStar className="text-yellow-400 w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                              {restaurant.averageRating ? restaurant.averageRating.toFixed(1) : '0.0'}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              ({restaurant.totalRatings || 0})
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop Grid View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRestaurants.map((restaurant) => (
                <Link
                  to={`/shops/${restaurant.id}`}
                  key={restaurant.id}
                >
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
                  >
                    <div className="relative">
                      <img
                        src={restaurant.image || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={restaurant.name}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold mb-2">{restaurant.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{restaurant.cuisine}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FiStar className="text-yellow-400 w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">
                            {restaurant.averageRating ? restaurant.averageRating.toFixed(1) : '0.0'}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({restaurant.totalRatings || 0})
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default TopRestaurants;