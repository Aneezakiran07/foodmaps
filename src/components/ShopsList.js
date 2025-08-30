import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiStar, FiFilter, FiChevronDown, FiChevronUp, FiX, FiSearch } from 'react-icons/fi';
import { publicHelpers, adminHelpers } from '../utils/supabaseClient';

const ShopsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurantsWithRatings, setRestaurantsWithRatings] = useState([]);
  const [sortedRestaurants, setSortedRestaurants] = useState([]);
  const [availableCuisines, setAvailableCuisines] = useState([]);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('default');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCuisineFilter, setShowCuisineFilter] = useState(false);

  // Sanitize input to prevent XSS
  const sanitizeInput = (input) => {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/[<>]/g, '');
  };

  useEffect(() => {
    loadRestaurantsWithRatings();
    loadAvailableCuisines();
  }, []);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [restaurantsWithRatings, sortOption, selectedCuisines, searchQuery]);

  // Update URL when search query changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  }, [searchQuery, setSearchParams]);

  const loadAvailableCuisines = async () => {
    try {
      console.log('🍽️ Loading available cuisines...');
      
      // Use the adminHelpers function which has the correct implementation
      const cuisines = await adminHelpers.fetchAllCuisines();
      
      console.log('✅ Available cuisines loaded:', cuisines);
      setAvailableCuisines(cuisines || []);
    } catch (error) {
      console.error('❌ Error loading cuisines:', error);
      // Don't set error state for cuisines - just log it and continue
      setAvailableCuisines([]);
    }
  };

  const loadRestaurantsWithRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏪 Loading restaurants with ratings...');
      
      // First fetch all restaurants using the correct helper
      const restaurants = await publicHelpers.fetchRestaurants();
      console.log('📊 Fetched restaurants:', restaurants.length);
      
      // Then fetch detailed ratings for each restaurant individually
      const restaurantsWithDetailedRatings = await Promise.all(
        restaurants.map(async (restaurant) => {
          try {
            // Fetch detailed restaurant data (same as Shop Detail Page)
            const detailedData = await publicHelpers.fetchRestaurantDetail(restaurant.id);
            
            // Calculate average rating from the detailed data structure
            const ratings = detailedData.ratings || [];
            const validRatings = ratings.filter(r => r.rating && r.rating > 0);
            const averageRating = validRatings.length > 0 
              ? (validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length)
              : 0;
            
            const totalRatings = validRatings.length || 0;
            
            return {
              ...restaurant,
              id: restaurant.id,
              name: restaurant.name,
              image: restaurant.image_url,
              cuisine: restaurant.cuisines?.map(c => c.name).join(', ') || 'Restaurant',
              location: restaurant.address,
              priceRange: null,
              averageRating: averageRating,
              totalRatings: totalRatings,
              image_url: restaurant.image_url,
              cuisines: restaurant.cuisines, // This already has the correct structure from fetchRestaurants
              address: restaurant.address,
              phone: restaurant.phone,
              description: restaurant.description,
              created_at: restaurant.created_at
            };
          } catch (error) {
            console.error(`❌ Error loading details for restaurant ${restaurant.id}:`, error);
            // Return basic restaurant data if detailed fetch fails
            return {
              ...restaurant,
              image: restaurant.image_url,
              cuisine: restaurant.cuisines?.map(c => c.name).join(', ') || 'Restaurant',
              location: restaurant.address,
              priceRange: null,
              averageRating: 0,
              totalRatings: 0
            };
          }
        })
      );
      
      console.log('✅ Loaded restaurants with detailed ratings:', restaurantsWithDetailedRatings.length);
      setRestaurantsWithRatings(restaurantsWithDetailedRatings);
      
    } catch (error) {
      console.error('❌ Error loading restaurant ratings:', error);
      setError('Failed to load restaurants: ' + error.message);
      setRestaurantsWithRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSorting = () => {
    let filtered = [...restaurantsWithRatings];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const sanitizedQuery = sanitizeInput(searchQuery.toLowerCase());
      filtered = filtered.filter(shop => {
        // Ensure all fields are strings before searching
        const name = shop.name?.toLowerCase() || '';
        const cuisine = typeof shop.cuisine === 'string' ? shop.cuisine.toLowerCase() : '';
        const location = shop.location?.toLowerCase() || '';
        const description = shop.description?.toLowerCase() || '';
        
        return name.includes(sanitizedQuery) ||
               cuisine.includes(sanitizedQuery) ||
               location.includes(sanitizedQuery) ||
               description.includes(sanitizedQuery);
      });
    }
    
    // Apply cuisine filter
    if (selectedCuisines.length > 0) {
      console.log('🔍 Applying cuisine filter:', selectedCuisines);
      filtered = filtered.filter(restaurant => {
        // Check if restaurant has any of the selected cuisines
        const hasSelectedCuisine = restaurant.cuisines?.some(cuisine => 
          selectedCuisines.includes(cuisine.id)
        );
        console.log(`Restaurant ${restaurant.name} cuisines:`, restaurant.cuisines?.map(c => c.name), 'Has selected:', hasSelectedCuisine);
        return hasSelectedCuisine;
      });
      console.log('✅ Filtered restaurants:', filtered.length);
    }
    
    // Apply sorting
    switch (sortOption) {
      case 'rating-desc':
        filtered.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'rating-asc':
        filtered.sort((a, b) => a.averageRating - b.averageRating);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'default':
      default:
        // Keep original order (likely by creation date or ID)
        break;
    }
    
    setSortedRestaurants(filtered);
  };

  const handleSearchChange = (e) => {
    const value = sanitizeInput(e.target.value);
    setSearchQuery(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleSortChange = (value) => {
    setSortOption(value);
    setShowSortDropdown(false);
  };

  const handleCuisineToggle = (cuisineId) => {
    setSelectedCuisines(prev => {
      if (prev.includes(cuisineId)) {
        return prev.filter(id => id !== cuisineId);
      } else {
        return [...prev, cuisineId];
      }
    });
  };

  const clearCuisineFilters = () => {
    setSelectedCuisines([]);
  };

  const getSelectedCuisineNames = () => {
    return availableCuisines
      .filter(cuisine => selectedCuisines.includes(cuisine.id))
      .map(cuisine => cuisine.name);
  };

  const sortOptions = [
    { value: 'default', label: 'Default Order' },
    { value: 'rating-desc', label: 'Rating: High to Low' },
    { value: 'rating-asc', label: 'Rating: Low to High' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' }
  ];

  const getCurrentSortLabel = () => {
    const option = sortOptions.find(opt => opt.value === sortOption);
    return option ? option.label : 'Default Order';
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FiStar key={i} className="fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FiStar key={i} className="fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<FiStar key={i} className="text-gray-300" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-600">Loading restaurants...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Restaurants</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={loadRestaurantsWithRatings}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">All Restaurants</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by restaurant name or cuisine type"
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              maxLength={100}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <FiX className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex space-x-4">
            {/* Cuisine Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCuisineFilter(!showCuisineFilter)}
                className={`flex items-center space-x-2 border rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  selectedCuisines.length > 0 
                    ? 'bg-orange-100 border-orange-300 text-orange-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FiFilter className="w-4 h-4" />
                <span>
                  Cuisine {selectedCuisines.length > 0 && `(${selectedCuisines.length})`}
                </span>
                {showCuisineFilter ? (
                  <FiChevronUp className="w-4 h-4" />
                ) : (
                  <FiChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showCuisineFilter && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Filter by Cuisine</h3>
                      {selectedCuisines.length > 0 && (
                        <button
                          onClick={clearCuisineFilters}
                          className="text-sm text-orange-600 hover:text-orange-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {availableCuisines.map((cuisine) => (
                        <label
                          key={cuisine.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCuisines.includes(cuisine.id)}
                            onChange={() => handleCuisineToggle(cuisine.id)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700">{cuisine.name}</span>
                        </label>
                      ))}
                    </div>
                    
                    {availableCuisines.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">No cuisines available</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <FiFilter className="w-4 h-4" />
                <span>Sort by: {getCurrentSortLabel()}</span>
                {showSortDropdown ? (
                  <FiChevronUp className="w-4 h-4" />
                ) : (
                  <FiChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showSortDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          sortOption === option.value
                            ? 'bg-orange-100 text-orange-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedCuisines.length > 0 || searchQuery.trim()) && (
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              
              {/* Search Query Filter */}
              {searchQuery.trim() && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchQuery}"
                  <button
                    onClick={clearSearch}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {/* Cuisine Filters */}
              {getSelectedCuisineNames().map((cuisineName, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                >
                  {cuisineName}
                  <button
                    onClick={() => {
                      const cuisine = availableCuisines.find(c => c.name === cuisineName);
                      if (cuisine) handleCuisineToggle(cuisine.id);
                    }}
                    className="ml-2 hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-gray-600">
            {searchQuery.trim() ? (
              `Found ${sortedRestaurants.length} results for: "${searchQuery}"`
            ) : (
              `Showing ${sortedRestaurants.length} restaurants`
            )}
            {selectedCuisines.length > 0 && ` (filtered by cuisine)`}
            {sortOption !== 'default' && ` (sorted by ${getCurrentSortLabel().toLowerCase()})`}
          </p>
        </div>

        {sortedRestaurants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            {searchQuery.trim() ? (
              <div>
                <p className="text-gray-500 text-lg mb-2">No restaurants found for "{searchQuery}"</p>
                <p className="text-gray-400 mb-4">Try searching with different keywords</p>
                <button
                  onClick={clearSearch}
                  className="text-orange-600 hover:text-orange-700 underline"
                >
                  Clear search
                </button>
              </div>
            ) : selectedCuisines.length > 0 ? (
              <div>
                <p className="text-gray-500 text-lg mb-2">No restaurants found for selected cuisines</p>
                <button
                  onClick={clearCuisineFilters}
                  className="text-orange-600 hover:text-orange-700 underline"
                >
                  Clear filters to see all restaurants
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-lg">No restaurants available</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedRestaurants.map(shop => (
              <Link
                to={`/shops/${shop.id}`}
                key={shop.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* Restaurant Image */}
                {shop.image && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={shop.image}
                      alt={`${shop.name}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwSDI1MFYyMDBIMTUwVjEwMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                      }}
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2 text-gray-800">{shop.name}</h3>
                  
                  {/* Cuisine Type */}
                  {shop.cuisine && (
                    <p className="text-sm text-gray-500 mb-2">{shop.cuisine}</p>
                  )}
                  
                  {/* Rating Display */}
                  <div className="flex items-center mb-2">
                    {shop.averageRating > 0 ? (
                      <>
                        <div className="flex items-center mr-2">
                          {renderStars(shop.averageRating)}
                        </div>
                        <span className="text-sm text-gray-600">
                          {shop.averageRating.toFixed(1)} ({shop.totalRatings} {shop.totalRatings === 1 ? 'rating' : 'ratings'})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">No ratings yet</span>
                    )}
                  </div>
                  
                  {/* Location */}
                  {shop.location && (
                    <p className="text-sm text-gray-500 mb-2">📍 {shop.location}</p>
                  )}
                  
                  {/* Price Range - keeping for backward compatibility even if null */}
                  {shop.priceRange && (
                    <p className="text-sm text-gray-600">💰 {shop.priceRange}</p>
                  )}
                  
                  {/* Description preview */}
                  {shop.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                      {shop.description}
                    </p>
                  )}
                  
                  {/* Phone number if available */}
                  {shop.phone && (
                    <p className="text-sm text-gray-500 mt-2">📞 {shop.phone}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopsList;