import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FiImage, FiStar, FiMapPin, FiClock, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import RatingComponent from "./RatingComponent";
import ReviewComponent from './ReviewComponent';
import { publicHelpers } from '../utils/supabaseClient';

export default function ShopDetail() {
  const { shopId } = useParams();
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRestaurant();
  }, [shopId]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await publicHelpers.fetchRestaurantDetail(parseInt(shopId));
      setRestaurant(data);
      
    } catch (error) {
      console.error('Error loading restaurant:', error);
      setError('Failed to load restaurant details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Debug log
  useEffect(() => {
    console.log('Restaurant data:', restaurant);
    console.log('Menu images:', restaurant?.menu_images);
  }, [restaurant]);

  const handleImageClick = (index) => {
    console.log('Image clicked:', index);
    setSelectedImageIndex(index);
  };

  const closeModal = () => {
    console.log('Closing modal');
    setSelectedImageIndex(null);
  };

  const goToPrevImage = () => {
    if (restaurant?.menu_images && selectedImageIndex !== null) {
      const newIndex = selectedImageIndex === 0 
        ? restaurant.menu_images.length - 1 
        : selectedImageIndex - 1;
      setSelectedImageIndex(newIndex);
    }
  };

  const goToNextImage = () => {
    if (restaurant?.menu_images && selectedImageIndex !== null) {
      const newIndex = selectedImageIndex === restaurant.menu_images.length - 1 
        ? 0 
        : selectedImageIndex + 1;
      setSelectedImageIndex(newIndex);
    }
  };

  // Keyboard navigation and touch handling
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (selectedImageIndex !== null) {
        if (e.key === 'ArrowLeft') {
          goToPrevImage();
        } else if (e.key === 'ArrowRight') {
          goToNextImage();
        } else if (e.key === 'Escape') {
          closeModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedImageIndex, restaurant?.menu_images]);

  // Touch/swipe handling for mobile
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && restaurant?.menu_images && selectedImageIndex !== null) {
      goToNextImage();
    }
    if (isRightSwipe && restaurant?.menu_images && selectedImageIndex !== null) {
      goToPrevImage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <p className="mt-2 text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Restaurant</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadRestaurant}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Get cuisine names from the new schema structure
  const cuisineNames = restaurant.cuisines?.map(c => c.name).join(', ') || 'Restaurant';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <img
          src={restaurant.image_url}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwSDI1MFYyMDBIMTUwVjEwMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">{restaurant.name}</h1>
            <p className="text-xl md:text-2xl">{cuisineNames}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Rating Component with compact styling */}
            <div className="bg-white rounded-lg shadow-sm border p-4 text-xs">
              <RatingComponent restaurantId={restaurant.id} restaurantName={restaurant.name} />
            </div>

            {/* Menu Images */}
            <div className="bg-white rounded-xl shadow-lg border p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
              {restaurant.menu_images && restaurant.menu_images.length > 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">Click on any image to view it larger</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {restaurant.menu_images.map((image, index) => (
                      <div 
                        key={index} 
                        className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105"
                        onClick={() => handleImageClick(index)}
                      >
                        <img
                          src={image}
                          alt={`${restaurant.name} menu ${index + 1}`}
                          className="w-full h-64 object-cover rounded-lg shadow-md"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwSDI1MFYyMDBIMTUwVjEwMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center">
                            <FiImage className="text-3xl mb-2" />
                            <span className="text-sm font-medium">Click to enlarge</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">No menu images available.</p>
              )}
            </div>

            {/* Review Component */}
            <ReviewComponent 
              restaurantId={restaurant.id} 
              restaurantName={restaurant.name} 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Restaurant Info */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Restaurant Info</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FiStar className="text-orange-500 w-5 h-5" />
                  <span className="text-gray-700">Cuisine: {cuisineNames}</span>
                </div>
                
                {restaurant.address && (
                  <div className="flex items-start space-x-3">
                    <FiMapPin className="text-orange-500 w-5 h-5 mt-0.5" />
                    <span className="text-gray-700">{restaurant.address}</span>
                  </div>
                )}
                
                {restaurant.phone && (
                  <div className="flex items-center space-x-3">
                    <FiClock className="text-orange-500 w-5 h-5" />
                    <a 
                      href={`tel:${restaurant.phone}`}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                )}
                
                {restaurant.description && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {restaurant.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Image Modal with Navigation */}
      {selectedImageIndex !== null && restaurant?.menu_images && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative max-w-6xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={restaurant.menu_images[selectedImageIndex]}
              alt={`Menu ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute -top-4 -right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 transition-colors duration-200 shadow-lg"
              title="Close"
            >
              <FiX className="w-6 h-6" />
            </button>

            {/* Navigation Arrows - Only show if more than 1 image */}
            {restaurant.menu_images.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevImage();
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded p-1 transition-all duration-200"
                  title="Previous image"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>

                {/* Next Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded p-1 transition-all duration-200"
                  title="Next image"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImageIndex + 1} / {restaurant.menu_images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}