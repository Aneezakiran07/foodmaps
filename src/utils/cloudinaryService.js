// Cloudinary Upload Service
// src/utils/cloudinaryService.js

const CloudinaryService = {
  // Upload a single image
  async uploadImage(file) {
    try {
      console.log('Uploading single image:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Upload failed:', errorData);
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Upload success:', data.secure_url);
      
      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Upload multiple images
  async uploadMultipleImages(files) {
    try {
      console.log('Uploading multiple images:', files.length);
      
      const uploadPromises = Array.from(files).map(file => 
        this.uploadImage(file)
      );
      
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(result => result.success);
      const failed = results.filter(result => !result.success);
      
      console.log(`Upload results: ${successful.length} successful, ${failed.length} failed`);
      
      return {
        success: failed.length === 0,
        uploadedImages: successful.map(result => result.url),
        failedUploads: failed.length,
        totalUploads: files.length
      };
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      return {
        success: false,
        error: error.message,
        uploadedImages: [],
        failedUploads: files.length,
        totalUploads: files.length
      };
    }
  },

  // Validate a single image
  validateImage(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload only JPEG, PNG, or WebP images'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image size should be less than 5MB'
      };
    }
    
    return { valid: true };
  },

  // Validate multiple images
validateMultipleImages(files) {
    const maxImages = 5;
    
    if (files.length > maxImages) {
      return {
        valid: false,
        error: `You can upload maximum ${maxImages} images per review`
      };
    }
    
    for (let file of files) {
      const validation = this.validateImage(file);  // Note the 'this' usage
      if (!validation.valid) {
        return validation;
      }
    }
    
    return { valid: true };
  }
};

CloudinaryService.validateMultipleImages = CloudinaryService.validateMultipleImages.bind(CloudinaryService);

// Then export as normal
export default CloudinaryService;