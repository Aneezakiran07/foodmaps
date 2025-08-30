// File: src/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { supabase, adminHelpers, supabaseHelpers } from './utils/supabaseClient';
import { 
  LogIn, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search,
  Star,
  Users,
  MessageSquare,
  Settings,
  RefreshCw
} from 'lucide-react';

const AdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurants');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  // Data states
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalRatings: 0,
    averageRating: 0
  });

  // Form states
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    image_url: '',
    description: '',
    phone: '',
    address: '',
    is_active: true
  });

  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Check login status on mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadAllData();
    }
  }, [isLoggedIn]);

  // Check if user is already logged in
  const checkLoginStatus = () => {
    const adminData = localStorage.getItem('admin_data');
    const adminExpires = localStorage.getItem('admin_expires');
    
    if (adminData && adminExpires) {
      const expiresAt = new Date(adminExpires);
      const now = new Date();
      
      if (now < expiresAt) {
        setIsLoggedIn(true);
      } else {
        // Clear expired session
        localStorage.removeItem('admin_data');
        localStorage.removeItem('admin_expires');
      }
    }
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await adminHelpers.adminLogin(loginData.username, loginData.password);

      if (result.success) {
        // Store the JWT payload info for creating the actual JWT
        localStorage.setItem('admin_data', JSON.stringify(result.jwt_payload));
        localStorage.setItem('admin_expires', result.expires_at);
        
        setIsLoggedIn(true);
        setLoginData({ username: '', password: '' });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all data function
  const loadAllData = async () => {
    setDataLoading(true);
    setError(null);
    
    try {
      // Load stats
      const statsData = await adminHelpers.getAdminStats();
      setStats(statsData);

      // Load restaurants
      const restaurantsData = await adminHelpers.fetchAllRestaurants();
      setRestaurants(restaurantsData);

      // Load cuisines
      const cuisinesData = await adminHelpers.fetchAllCuisines();
      setCuisines(cuisinesData);

      // Load ratings
      const ratingsData = await adminHelpers.fetchAllRatings();
      setRatings(ratingsData);

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setDataLoading(false);
    }
  };

  // CRUD functions for restaurants
  const handleRestaurantSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (editingId) {
        // Update restaurant
        const updatedRestaurant = await adminHelpers.updateRestaurant(editingId, restaurantForm);
        setRestaurants(restaurants.map(r => 
          r.id === editingId ? updatedRestaurant : r
        ));
      } else {
        // Add new restaurant
        const newRestaurant = await adminHelpers.createRestaurant(restaurantForm);
        setRestaurants([newRestaurant, ...restaurants]);
      }
      
      // Reset form
      setRestaurantForm({
        name: '',
        image_url: '',
        description: '',
        phone: '',
        address: '',
        is_active: true
      });
      setEditingId(null);
      
      // Refresh stats
      const statsData = await adminHelpers.getAdminStats();
      setStats(statsData);
      
    } catch (error) {
      console.error('Error saving restaurant:', error);
      setError('Error saving restaurant: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const editRestaurant = (restaurant) => {
    setRestaurantForm({
      name: restaurant.name,
      image_url: restaurant.image_url,
      description: restaurant.description,
      phone: restaurant.phone,
      address: restaurant.address,
      is_active: restaurant.is_active
    });
    setEditingId(restaurant.id);
  };

  const deleteRestaurant = async (id) => {
    if (window.confirm('Are you sure you want to delete this restaurant?')) {
      setLoading(true);
      setError(null);
      
      try {
        await adminHelpers.deleteRestaurant(id);
        setRestaurants(restaurants.filter(r => r.id !== id));
        
        // Refresh stats
        const statsData = await adminHelpers.getAdminStats();
        setStats(statsData);
        
      } catch (error) {
        console.error('Error deleting restaurant:', error);
        setError('Error deleting restaurant: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteRating = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this rating?')) {
      setLoading(true);
      setError(null);
      
      try {
        await adminHelpers.deleteRating(reviewId);
        setRatings(ratings.filter(r => r.review_id !== reviewId));
        
        // Refresh stats
        const statsData = await adminHelpers.getAdminStats();
        setStats(statsData);
        
      } catch (error) {
        console.error('Error deleting rating:', error);
        setError('Error deleting rating: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter functions
  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem('admin_data');
    localStorage.removeItem('admin_expires');
    setIsLoggedIn(false);
    setRestaurants([]);
    setCuisines([]);
    setRatings([]);
    setStats({
      totalRestaurants: 0,
      totalRatings: 0,
      averageRating: 0
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Restaurant Management System</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 pr-12"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Demo credentials: admin / your_secure_password
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Restaurant Admin</h1>
              {dataLoading && (
                <RefreshCw className="w-5 h-5 ml-3 text-blue-500 animate-spin" />
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={loadAllData}
                disabled={dataLoading}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="text-sm text-gray-600">
                Welcome, Admin
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 rounded-lg p-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Restaurants</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRestaurants}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-green-500 rounded-lg p-3">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Ratings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRatings}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="bg-yellow-500 rounded-lg p-3">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'restaurants', label: 'Restaurants' },
                { id: 'cuisines', label: 'Cuisines' },
                { id: 'ratings', label: 'Ratings' },
                { id: 'settings', label: 'Settings' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'restaurants' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Restaurants</h2>
                  <button
                    onClick={() => {
                      setRestaurantForm({
                        name: '',
                        image_url: '',
                        description: '',
                        phone: '',
                        address: '',
                        is_active: true
                      });
                      setEditingId(null);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Restaurant
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Restaurant Form */}
                <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingId ? 'Edit Restaurant' : 'Add New Restaurant'}
                  </h3>
                  <form onSubmit={handleRestaurantSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Restaurant Name"
                        value={restaurantForm.name}
                        onChange={(e) => setRestaurantForm({...restaurantForm, name: e.target.value})}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <input
                        type="url"
                        placeholder="Image URL"
                        value={restaurantForm.image_url}
                        onChange={(e) => setRestaurantForm({...restaurantForm, image_url: e.target.value})}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={restaurantForm.phone}
                        onChange={(e) => setRestaurantForm({...restaurantForm, phone: e.target.value})}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({...restaurantForm, address: e.target.value})}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <textarea
                        placeholder="Description"
                        value={restaurantForm.description}
                        onChange={(e) => setRestaurantForm({...restaurantForm, description: e.target.value})}
                        className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                      />
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={restaurantForm.is_active}
                          onChange={(e) => setRestaurantForm({...restaurantForm, is_active: e.target.checked})}
                          className="mr-2 rounded"
                        />
                        Active
                      </label>
                    </div>
                    <div className="flex space-x-4 mt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 flex items-center"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : null}
                        {editingId ? 'Update' : 'Add'} Restaurant
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setRestaurantForm({
                              name: '',
                              image_url: '',
                              description: '',
                              phone: '',
                              address: '',
                              is_active: true
                            });
                          }}
                          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition duration-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Restaurants List */}
                <div className="space-y-4">
                  {filteredRestaurants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No restaurants match your search.' : 'No restaurants found.'}
                    </div>
                  ) : (
                    filteredRestaurants.map((restaurant) => (
                      <div key={restaurant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <img
                            src={restaurant.image_url}
                            alt={restaurant.name}
                            className="w-16 h-16 rounded-lg object-cover mr-4"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                            }}
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                            <p className="text-sm text-gray-600">{restaurant.description}</p>
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                restaurant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {restaurant.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="ml-2">{restaurant.phone}</span>
                              <span className="ml-2">•</span>
                              <span className="ml-2">{supabaseHelpers.formatRelativeTime(restaurant.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => editRestaurant(restaurant)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition duration-200"
                            title="Edit restaurant"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRestaurant(restaurant.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition duration-200"
                            title="Delete restaurant"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cuisines' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Cuisines</h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Cuisine
                  </button>
                </div>
                
                <div className="space-y-4">
                  {cuisines.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No cuisines found.
                    </div>
                  ) : (
                    cuisines.map((cuisine) => (
                      <div key={cuisine.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-semibold text-gray-900">{cuisine.name}</h3>
                          <p className="text-sm text-gray-600">{cuisine.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition duration-200">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition duration-200">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ratings' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Ratings & Reviews</h2>
                <div className="space-y-4">
                  {ratings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No ratings found.
                    </div>
                  ) : (
                    ratings.map((rating) => (
                      <div key={rating.review_id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <h3 className="font-semibold text-gray-900 mr-3">{rating.reviewer_name}</h3>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < rating.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-gray-600">({rating.rating}/5)</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteRating(rating.review_id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition duration-200"
                            title="Delete rating"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {rating.restaurants && (
                          <p className="text-sm text-blue-600 mb-2">
                            Restaurant: {rating.restaurants.name}
                          </p>
                        )}
                        <p className="text-gray-600 mb-2">{rating.comment}</p>
                        <p className="text-xs text-gray-500">
                          {supabaseHelpers.formatTimestamp(rating.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Database Connection</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Status: <span className="text-green-600">Connected</span></p>
                      <p>Total Tables: Restaurants, Cuisines, Ratings</p>
                      <p>Last Sync: {new Date().toLocaleString()}</p>
                    </div>
                    <button
                      onClick={loadAllData}
                      disabled={dataLoading}
                      className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 flex items-center"
                    >
                      {dataLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Sync Data
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Session Information</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Login Time: {new Date().toLocaleString()}</p>
                      <p>Session Status: Active</p>
                      <p>Actions Today: {restaurants.length + ratings.length}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800 mb-2">Admin Functions</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Use these functions carefully as they affect the live database.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={loadAllData}
                        disabled={dataLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 text-sm"
                      >
                        Reload All Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;