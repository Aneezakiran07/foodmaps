import React, { useState, useEffect } from 'react';
// Update imports to match your actual service files
import { getRestaurantReviews, addReview } from '../utils/supabaseReviews';
import { getRestaurantRatings, addRating } from '../utils/supabaseRatings';
import { getAllRestaurants, getRestaurantById } from '../utils/supabaseRestaurantService';

const TestSupabaseComponent = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addTestResult = (message, success = true) => {
    setTestResults(prev => [...prev, { 
      message, 
      success, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addTestResult('🚀 Starting Supabase integration tests...');
      
      // Test 1: Get all restaurants
      addTestResult('Test 1: Getting all restaurants...');
      const restaurants = await getAllRestaurants();
      addTestResult(`✅ Got ${restaurants?.length || 0} restaurants`, restaurants?.length >= 0);
      
      // Use first restaurant ID for further tests, or a test ID
      const testRestaurantId = restaurants?.[0]?.id || 1;
      addTestResult(`Using restaurant ID: ${testRestaurantId} for tests`);
      
      // Test 2: Get specific restaurant details
      addTestResult('Test 2: Getting restaurant details...');
      const restaurant = await getRestaurantById(testRestaurantId);
      addTestResult(`✅ Restaurant details: ${restaurant?.name || 'Unknown'}`, restaurant?.id);
      
      // Test 3: Get restaurant reviews
      addTestResult('Test 3: Getting restaurant reviews...');
      const reviews = await getRestaurantReviews(testRestaurantId);
      addTestResult(`✅ Got ${reviews?.length || 0} reviews`, reviews !== null);
      
      // Test 4: Get restaurant ratings
      addTestResult('Test 4: Getting restaurant ratings...');
      const ratings = await getRestaurantRatings(testRestaurantId);
      addTestResult(`✅ Ratings - Avg: ${ratings?.average || 0}, Count: ${ratings?.count || 0}`, ratings !== null);
      
      // Test 5: Add a test rating (be careful with this in production)
      if (process.env.NODE_ENV === 'development') {
        addTestResult('Test 5: Adding test rating (dev only)...');
        try {
          const testIP = '127.0.0.1'; // Test IP
          const addRatingResult = await addRating(testRestaurantId, 5, testIP);
          addTestResult(`✅ Add rating result: ${addRatingResult?.success || false}`, addRatingResult?.success);
        } catch (ratingError) {
          addTestResult(`⚠️ Rating test skipped: ${ratingError.message}`, false);
        }
      } else {
        addTestResult('⏭️ Skipping rating test in production');
      }
      
      addTestResult('🎉 All tests completed successfully!');
    } catch (error) {
      addTestResult(`❌ Test failed: ${error.message}`, false);
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Supabase Integration Test</h2>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Running Tests...
            </>
          ) : (
            'Run Supabase Tests'
          )}
        </button>
        
        {testResults.length > 0 && (
          <button
            onClick={() => setTestResults([])}
            className="ml-4 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear Results
          </button>
        )}
      </div>
      
      {testResults.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Test Results:</h3>
          {testResults.map((result, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                result.success 
                  ? 'bg-green-50 text-green-800 border-green-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex-1">{result.message}</span>
                <span className="text-xs text-gray-500 ml-4 flex-shrink-0">
                  {result.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && testResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Click "Run Supabase Tests" to test your database connections</p>
          <p className="text-sm mt-2">This will test restaurants, reviews, and ratings functionality</p>
        </div>
      )}
    </div>
  );
};

export default TestSupabaseComponent;