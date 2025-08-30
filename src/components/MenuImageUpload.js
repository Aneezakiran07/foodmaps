import React, { useState, useEffect } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';
import { supabase } from '../utils/supabaseClient';
import CloudinaryService from '../utils/cloudinaryService';

const MenuImageUpload = ({ restaurantId, restaurantName }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [menuNames, setMenuNames] = useState({});
  const [userIP, setUserIP] = useState('anonymous');
  const [currentMenuImages, setCurrentMenuImages] = useState([]);

  // Input sanitization function
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.trim().slice(0, 100)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  // Get user's IP
  useEffect(() => {
    const fetchUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(sanitizeInput(data.ip));
      } catch (error) {
        console.log("Could not fetch IP, using 'anonymous'");
      }
    };

    fetchUserIP();
  }, []);

  // Load current menu images
  useEffect(() => {
    const loadCurrentImages = async () => {
      try {
        const { data: restaurant, error } = await supabase
          .from('restaurants')
          .select('menu_images')
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.error('Error loading current menu images:', error);
        } else if (restaurant && restaurant.menu_images) {
          setCurrentMenuImages(restaurant.menu_images);
        }
      } catch (error) {
        console.error('Error loading menu images:', error);
      }
    };

    if (restaurantId) {
      loadCurrentImages();
    }
  }, [restaurantId]);

  // Check rate limit
  const checkRateLimit = async (ip, action) => {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_ip', ip)
        .eq('action', action)
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Rate limit check error:', error);
        return false;
      }

      return !data;
    } catch (error) {
      console.error('Rate limit error:', error);
      return false;
    }
  };

  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  const handleMenuNameChange = (fileId, name) => {
    const cleanName = sanitizeInput(name);
    setMenuNames(prev => ({
      ...prev,
      [fileId]: cleanName
    }));
  };

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Check rate limit
      const canProceed = await checkRateLimit(userIP, 'menu_upload');
      if (!canProceed) {
        setError('Please wait 5 minutes before uploading more menu images.');
        setUploading(false);
        return;
      }

      // Log rate limit entry
      await supabase.from('rate_limits').insert({
        user_ip: userIP,
        action: 'menu_upload',
        restaurant_id: restaurantId
      });

      // Validate files
      const filesArray = Array.from(files);
      if (!CloudinaryService || typeof CloudinaryService.validateMultipleImages !== 'function') {
        setError('Image service not available. Please refresh the page.');
        setUploading(false);
        return;
      }

      const validation = CloudinaryService.validateMultipleImages(filesArray);
      if (!validation.valid) {
        setError(validation.error);
        setUploading(false);
        return;
      }

      // Check total image limit (max 10 menu images per restaurant)
      if (currentMenuImages.length + filesArray.length > 10) {
        setError(`Cannot upload ${filesArray.length} images. Maximum 10 menu images allowed (currently have ${currentMenuImages.length}).`);
        setUploading(false);
        return;
      }

      setProgress(25);

      // Upload images to Cloudinary
      const uploadResult = await CloudinaryService.uploadMultipleImages(filesArray);
      
      if (!uploadResult.success) {
        setError(`Failed to upload images: ${uploadResult.error}`);
        setUploading(false);
        return;
      }

      setProgress(75);

      // Create menu image objects with metadata
      const menuImageObjects = uploadResult.uploadedImages.map((imageUrl, index) => {
        const file = filesArray[index];
        const menuName = menuNames[file.name] || 'menu';
        const uniqueId = generateUniqueId();
        
        return {
          url: imageUrl,
          filename: `${sanitizeInput(menuName)}_${uniqueId}`,
          uploadedAt: Date.now(),
          restaurantName: sanitizeInput(restaurantName),
          restaurantId: restaurantId,
          menuName: sanitizeInput(menuName),
          uniqueId: uniqueId,
          uploadedBy: userIP,
          textExtracted: false,
          textExtractionDate: null,
          menuItems: []
        };
      });

      // Update restaurant with new menu images
      const updatedMenuImages = [...currentMenuImages, ...menuImageObjects];
      
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          menu_images: updatedMenuImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId);

      if (updateError) {
        console.error('Error updating restaurant menu images:', updateError);
        setError('Failed to save menu images to database: ' + updateError.message);
        setUploading(false);
        return;
      }

      // Log audit trail
      await supabase.from('audit_logs').insert({
        action: 'menu_images_uploaded',
        table_name: 'restaurants',
        record_id: restaurantId.toString(),
        user_ip: userIP,
        metadata: { 
          restaurant_id: restaurantId,
          images_count: menuImageObjects.length,
          restaurant_name: sanitizeInput(restaurantName),
          menu_names: menuImageObjects.map(img => img.menuName)
        }
      });

      setProgress(100);
      setCurrentMenuImages(updatedMenuImages);
      setMenuNames({});
      
      // Success message
      setTimeout(() => {
        setProgress(0);
      }, 2000);

    } catch (err) {
      console.error('Error uploading menu images:', err);
      setError('Error uploading images: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMenuImage = async (imageIndex) => {
    if (window.confirm('Are you sure you want to remove this menu image?')) {
      try {
        const updatedImages = currentMenuImages.filter((_, index) => index !== imageIndex);
        
        const { error } = await supabase
          .from('restaurants')
          .update({
            menu_images: updatedImages,
            updated_at: new Date().toISOString()
          })
          .eq('id', restaurantId);

        if (error) {
          console.error('Error removing menu image:', error);
          setError('Failed to remove menu image: ' + error.message);
        } else {
          setCurrentMenuImages(updatedImages);
          
          // Log audit trail
          await supabase.from('audit_logs').insert({
            action: 'menu_image_removed',
            table_name: 'restaurants',
            record_id: restaurantId.toString(),
            user_ip: userIP,
            metadata: { 
              restaurant_id: restaurantId,
              restaurant_name: sanitizeInput(restaurantName)
            }
          });
        }
      } catch (err) {
        console.error('Error removing menu image:', err);
        setError('Error removing image: ' + err.message);
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">
        Upload Menu Images ({currentMenuImages.length}/10)
      </h3>
      
      {/* Current Menu Images */}
      {currentMenuImages.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3 text-gray-700">Current Menu Images:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentMenuImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image.url}
                  alt={`Menu ${image.menuName || 'Image'}`}
                  className="w-full h-24 object-cover rounded-lg shadow-sm"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => removeMenuImage(index)}
                    className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b-lg truncate">
                  {image.menuName || 'Menu'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Menu Images (Max {10 - currentMenuImages.length} more)
        </label>
        <div className="flex items-center space-x-4">
          <label className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <FiUpload className="mr-2" />
            Choose Files
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading || currentMenuImages.length >= 10}
            />
          </label>
          {uploading && (
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mt-1">{progress}% complete</div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Name Inputs */}
      {Object.keys(menuNames).length > 0 && (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name your menu images:
          </label>
          {Object.keys(menuNames).map(fileName => (
            <div key={fileName} className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 w-32 truncate">{fileName}:</span>
              <input
                type="text"
                value={menuNames[fileName]}
                onChange={(e) => handleMenuNameChange(fileName, e.target.value)}
                placeholder="Enter menu name (e.g., Breakfast Menu)"
                maxLength={50}
                className="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <FiX className="inline mr-1" />
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-500 mt-4 space-y-1 bg-gray-50 p-3 rounded-lg">
        <p><strong>Instructions:</strong></p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>Upload clear, high-quality images of your menus</li>
          <li>Supported formats: JPG, PNG, GIF (max 5MB each)</li>
          <li>Maximum 10 menu images per restaurant</li>
          <li>Give descriptive names to help customers understand each menu</li>
        </ul>
        <p className="mt-2"><strong>Example menu names:</strong></p>
        <ul className="list-disc list-inside ml-2">
          <li>Breakfast Menu, Lunch Specials, Dinner Menu</li>
          <li>Weekend Brunch, Happy Hour Menu, Kids Menu</li>
          <li>Beverages, Desserts, Appetizers</li>
        </ul>
      </div>

      {/* Environment Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 rounded">
          <strong>Debug:</strong> Cloud: {process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'Not set'} | 
          Preset: {process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'Not set'}
        </div>
      )}
    </div>
  );
};

export default MenuImageUpload;