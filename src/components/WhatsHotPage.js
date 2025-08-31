import React, { useState, useEffect } from 'react';
import { FiClock, FiTag, FiTrendingUp, FiZap, FiGift, FiCalendar } from 'react-icons/fi';
import { SupabaseWhatsHot } from '../utils/supabaseWhatsHot';

// Image Zoom Modal Component (same as your other components)
const ImageZoomModal = ({ src, alt, isOpen, onClose }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen && src) {
      setImageLoaded(false);
      setImageDimensions({ width: 0, height: 0 });
    }
  }, [isOpen, src]);

  const handleImageLoad = (e) => {
    const img = e.target;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    
    let { naturalWidth, naturalHeight } = img;
    
    const scaleWidth = maxWidth / naturalWidth;
    const scaleHeight = maxHeight / naturalHeight;
    const scale = Math.min(scaleWidth, scaleHeight, 1);
    
    setImageDimensions({
      width: naturalWidth * scale,
      height: naturalHeight * scale
    });
    setImageLoaded(true);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom view"
    >
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close image"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!imageLoaded && (
          <div className="flex items-center justify-center w-64 h-64" role="status" aria-label="Loading image">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        <img
          src={src}
          alt={alt || "Zoomed image"}
          className={`rounded-lg shadow-2xl transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: imageDimensions.width ? `${imageDimensions.width}px` : 'auto',
            height: imageDimensions.height ? `${imageDimensions.height}px` : 'auto',
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain'
          }}
          onLoad={handleImageLoad}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

const WhatsHotPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [postCounts, setPostCounts] = useState({
    all: 0,
    deal: 0,
    new_opening: 0,
    discount: 0,
    event: 0
  });

  useEffect(() => {
    loadPosts();
    loadPostCounts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      const postsData = await SupabaseWhatsHot.getAllPosts();
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading posts:', error);
      setErrorMessage('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadPostCounts = async () => {
    try {
      const counts = await SupabaseWhatsHot.getPostsCountByType();
      setPostCounts(counts);
    } catch (error) {
      console.error('Error loading post counts:', error);
    }
  };

  // Filter posts by type
  const filteredPosts = selectedFilter === 'all' 
    ? posts 
    : posts.filter(post => post.type === selectedFilter);

  // Get type icon and styling (consistent with your app's orange theme)
  const getTypeConfig = (type) => {
    const configs = {
      deal: {
        icon: FiGift,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        label: 'Deal',
        badgeColor: 'bg-green-500'
      },
      new_opening: {
        icon: FiZap,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        label: 'New Opening',
        badgeColor: 'bg-blue-500'
      },
      discount: {
        icon: FiTag,
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        label: 'Discount',
        badgeColor: 'bg-purple-500'
      },
      event: {
        icon: FiCalendar,
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        label: 'Event',
        badgeColor: 'bg-orange-500'
      }
    };
    return configs[type] || configs.deal;
  };

  const handleImageClick = (imageUrl, altText) => {
    setSelectedImage({ src: imageUrl, alt: altText });
    setIsZoomModalOpen(true);
  };

  const closeZoomModal = () => {
    setIsZoomModalOpen(false);
    setSelectedImage(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleFilterChange = async (filterType) => {
    setSelectedFilter(filterType);
    setLoading(true);
    
    try {
      let filteredData;
      if (filterType === 'all') {
        filteredData = await SupabaseWhatsHot.getAllPosts();
      } else {
        filteredData = await SupabaseWhatsHot.getPostsByType(filterType);
      }
      setPosts(filteredData);
    } catch (error) {
      console.error('Error filtering posts:', error);
      setErrorMessage('Failed to load filtered posts.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border" role="status" aria-label="Loading posts">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading what's hot...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 text-white rounded-full p-2">
                <FiTrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">What's Hot</h1>
                <p className="text-gray-600 text-sm">Latest deals, openings & events</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4" role="alert">
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            {[
              { key: 'all', label: 'All', icon: FiTrendingUp },
              { key: 'deal', label: 'Deals', icon: FiGift },
              { key: 'new_opening', label: 'New Openings', icon: FiZap },
              { key: 'discount', label: 'Discounts', icon: FiTag },
              { key: 'event', label: 'Events', icon: FiCalendar }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  selectedFilter === key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {postCounts[key] > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedFilter === key 
                      ? 'bg-white bg-opacity-20 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {postCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Posts List */}
          <div className="space-y-6">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <FiTrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
                <p>
                  {selectedFilter === 'all' 
                    ? 'Check back later for the latest updates!' 
                    : `No ${selectedFilter.replace('_', ' ')} posts available right now.`
                  }
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const typeConfig = getTypeConfig(post.type);
                const TypeIcon = typeConfig.icon;
                
                return (
                  <div
                    key={post.id}
                    className="border-b border-gray-200 pb-6 last:border-b-0"
                  >
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`${typeConfig.bgColor} ${typeConfig.textColor} rounded-full p-2`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.textColor}`}>
                              {typeConfig.label}
                            </span>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <FiClock className="w-3 h-3" />
                              {formatDate(post.created_at)}
                            </div>
                          </div>
                          <h2 className="text-lg font-bold text-gray-900">
                            {post.title}
                          </h2>
                        </div>
                      </div>
                    </div>
                    
                    {/* Post Description */}
                    <div className="ml-11 mb-4">
                      <p className="text-gray-700 leading-relaxed">
                        {post.description}
                      </p>
                    </div>

                    {/* Post Images */}
                    {post.images && post.images.length > 0 && (
                      <div className="ml-11">
                        <div className={`grid gap-3 ${
                          post.images.length === 1 
                            ? 'grid-cols-1 max-w-md' 
                            : 'grid-cols-2 md:grid-cols-3'
                        }`}>
                          {post.images.map((imageUrl, index) => (
                            <div
                              key={index}
                              className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105"
                              onClick={() => handleImageClick(imageUrl, `${post.title} - Image ${index + 1}`)}
                            >
                              <img
                                src={imageUrl}
                                alt={`${post.title} - Image ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                                loading="lazy"
                              />
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                                <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                </div>
                              </div>
                              
                              {/* Image Counter */}
                              {post.images.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                                  {index + 1}/{post.images.length}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Refresh Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                loadPosts();
                loadPostCounts();
              }}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition flex items-center gap-2"
            >
              <FiTrendingUp className="w-4 h-4" />
              Refresh Posts
            </button>
          </div>
        </div>

        {/* Image Zoom Modal */}
        <ImageZoomModal
          src={selectedImage?.src}
          alt={selectedImage?.alt}
          isOpen={isZoomModalOpen}
          onClose={closeZoomModal}
        />
      </div>
    </div>
  );
};

export default WhatsHotPage;