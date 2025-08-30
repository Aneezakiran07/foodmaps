// Enhanced Cloudinary Upload Service with Vercel Serverless Functions
// src/utils/cloudinaryService.js

const CloudinaryService = {
  // Security configurations
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_UPLOAD: 5,
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  // Get API base URL
  getApiBaseUrl() {
    return process.env.REACT_APP_API_BASE_URL || 
           (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  },

  // Validate environment variables
  validateConfig() {
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      console.error('Missing Cloudinary configuration:', {
        cloudName: !!cloudName,
        uploadPreset: !!uploadPreset
      });
      throw new Error('Cloudinary configuration is incomplete. Please check your environment variables.');
    }
    
    return { cloudName, uploadPreset };
  },

  // Enhanced file validation
  validateFile(file) {
    if (!file) {
      return {
        valid: false,
        error: 'No file provided'
      };
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Only ${this.ALLOWED_FORMATS.join(', ').toUpperCase()} images are allowed`
      };
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `File size too large. Maximum size is ${maxSizeMB}MB`
      };
    }

    const fileName = file.name.toLowerCase();
    const suspiciousExtensions = ['.php', '.js', '.html', '.exe', '.bat'];
    if (suspiciousExtensions.some(ext => fileName.includes(ext))) {
      return {
        valid: false,
        error: 'Invalid file name or extension'
      };
    }
    
    return this.validateFileSignature(file);
  },

  // Validate file signature for security
  async validateFileSignature(file) {
    try {
      const buffer = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const imageSignatures = {
        'ffd8ffe0': 'jpeg',
        'ffd8ffe1': 'jpeg',
        'ffd8ffe2': 'jpeg',
        'ffd8ffe3': 'jpeg',
        'ffd8ffe8': 'jpeg',
        '89504e47': 'png',
        '52494646': 'webp'
      };
      
      let detectedType = null;
      for (const [signature, type] of Object.entries(imageSignatures)) {
        if (hex.startsWith(signature)) {
          detectedType = type;
          break;
        }
      }
      
      if (!detectedType) {
        return {
          valid: false,
          error: 'Invalid image file format or corrupted file'
        };
      }
      
      if (!['jpeg', 'png', 'webp'].includes(detectedType)) {
        return {
          valid: false,
          error: `${detectedType.toUpperCase()} format is not supported. Please use JPG, PNG, or WebP`
        };
      }
      
      const expectedMimeTypes = {
        'jpeg': ['image/jpeg', 'image/jpg'],
        'png': ['image/png'],
        'webp': ['image/webp']
      };
      
      if (!expectedMimeTypes[detectedType]?.includes(file.type)) {
        return {
          valid: false,
          error: 'File type mismatch. File may be corrupted or renamed'
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('File signature validation failed:', error);
      return {
        valid: false,
        error: 'Unable to validate file integrity'
      };
    }
  },

  // Validate multiple files
  async validateMultipleFiles(files) {
    if (!Array.isArray(files) && !FileList.prototype.isPrototypeOf(files)) {
      files = Array.from(files || []);
    }

    if (files.length === 0) {
      return {
        valid: false,
        error: 'No files selected'
      };
    }

    if (files.length > this.MAX_FILES_PER_UPLOAD) {
      return {
        valid: false,
        error: `Maximum ${this.MAX_FILES_PER_UPLOAD} files allowed per upload`
      };
    }
    
    for (let i = 0; i < files.length; i++) {
      const validation = await this.validateFile(files[i]);
      if (!validation.valid) {
        return {
          valid: false,
          error: `File ${i + 1} (${files[i].name}): ${validation.error}`
        };
      }
    }
    
    return { valid: true };
  },

  // Add compression transformations to URL
  addCompressionToUrl(url) {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }
    
    if (url.includes('f_auto') && url.includes('q_auto')) {
      return url;
    }
    
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  },

  // Extract public ID from URL (for deletions)
  extractPublicId(url) {
    try {
      if (!url || !url.includes('cloudinary.com')) {
        return null;
      }
      
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      
      if (uploadIndex === -1) {
        return null;
      }
      
      let pathAfterUpload = urlParts.slice(uploadIndex + 1);
      
      const transformationPattern = /^[a-z]_/;
      while (pathAfterUpload.length > 0 && transformationPattern.test(pathAfterUpload[0])) {
        pathAfterUpload.shift();
      }
      
      if (pathAfterUpload.length === 0) {
        return null;
      }
      
      const publicIdWithExtension = pathAfterUpload.join('/');
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
      
      return publicId;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  },

  // Upload a single image with auto-compression
  async uploadImage(file, folder = 'reviews') {
    try {
      console.log('Starting upload for:', file.name, 'Size:', file.size);
      
      const config = this.validateConfig();
      
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.uploadPreset);
      formData.append('cloud_name', config.cloudName);
      
      if (folder) {
        formData.append('folder', folder);
      }
      
      formData.append('resource_type', 'image');
      formData.append('allowed_formats', this.ALLOWED_FORMATS.join(','));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload failed with status:', response.status, errorData);
        
        if (response.status === 400) {
          throw new Error(errorData.error?.message || 'Invalid image format or corrupted file');
        } else if (response.status === 413) {
          throw new Error('File too large');
        } else if (response.status === 420) {
          throw new Error('Rate limit exceeded. Please try again later');
        } else {
          throw new Error(errorData.error?.message || `Upload failed: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (!data.secure_url || !data.public_id) {
        throw new Error('Invalid response from upload service');
      }
      
      if (!data.secure_url.startsWith('https://')) {
        throw new Error('Insecure URL returned from upload service');
      }
      
      const optimizedUrl = this.addCompressionToUrl(data.secure_url);
      
      console.log('Upload successful:', optimizedUrl);
      
      return {
        success: true,
        url: optimizedUrl,
        originalUrl: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        size: data.bytes,
        width: data.width,
        height: data.height
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Upload timeout. Please try again with a smaller file.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Upload failed due to an unexpected error'
      };
    }
  },

  // Upload multiple images with progress tracking
  async uploadMultipleImages(files, folder = 'reviews', onProgress = null) {
    try {
      console.log('Starting bulk upload for', files.length, 'files');
      
      const validation = await this.validateMultipleFiles(files);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      const fileArray = Array.from(files);
      
      const BATCH_SIZE = 2;
      const results = [];
      let completed = 0;
      
      for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (file) => {
          try {
            const result = await this.uploadImage(file, folder);
            completed++;
            if (onProgress) {
              onProgress({
                completed,
                total: fileArray.length,
                percentage: Math.round((completed / fileArray.length) * 100),
                currentFile: file.name
              });
            }
            return result;
          } catch (error) {
            completed++;
            if (onProgress) {
              onProgress({
                completed,
                total: fileArray.length,
                percentage: Math.round((completed / fileArray.length) * 100),
                currentFile: file.name,
                error: error.message
              });
            }
            return { success: false, error: error.message, fileName: file.name };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        if (i + BATCH_SIZE < fileArray.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const successful = results.filter(result => result.success);
      const failed = results.filter(result => !result.success);
      
      console.log(`Bulk upload completed: ${successful.length} successful, ${failed.length} failed`);
      
      return {
        success: failed.length === 0,
        uploadedImages: successful.map(result => result.url),
        failedUploads: failed.length,
        totalUploads: files.length,
        results: results,
        failedFiles: failed.map(f => ({ name: f.fileName, error: f.error }))
      };
    } catch (error) {
      console.error('Error in bulk upload:', error);
      return {
        success: false,
        error: error.message,
        uploadedImages: [],
        failedUploads: files.length,
        totalUploads: files.length
      };
    }
  },

  // Delete single image via Vercel function
  async deleteImage(urlOrPublicId) {
    try {
      let publicId;
      if (urlOrPublicId.includes('cloudinary.com')) {
        publicId = this.extractPublicId(urlOrPublicId);
      } else {
        publicId = urlOrPublicId;
      }
      
      if (!publicId) {
        throw new Error('Invalid URL or public ID provided');
      }
      
      console.log('Deleting image with public ID:', publicId);
      
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/cloudinary-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId, url: urlOrPublicId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Delete failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('Image deleted successfully:', publicId);
      return {
        success: true,
        publicId,
        result: result.result
      };
    } catch (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete multiple images via Vercel function
  async deleteMultipleImages(urlsOrPublicIds) {
    try {
      if (!Array.isArray(urlsOrPublicIds) || urlsOrPublicIds.length === 0) {
        throw new Error('No images provided for deletion');
      }
      
      console.log(`Deleting ${urlsOrPublicIds.length} images from Cloudinary...`);
      
      const urls = urlsOrPublicIds.filter(item => item.includes('cloudinary.com'));
      const publicIds = urlsOrPublicIds.filter(item => !item.includes('cloudinary.com'));
      
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/cloudinary-delete-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls, publicIds })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Delete failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: result.success,
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
        totalRequested: result.totalRequested,
        results: result.results
      };
    } catch (error) {
      console.error('Error in bulk delete:', error);
      return {
        success: false,
        error: error.message,
        deletedCount: 0,
        failedCount: urlsOrPublicIds.length,
        totalRequested: urlsOrPublicIds.length
      };
    }
  },

  // Legacy method names for backward compatibility
  validateImage(file) {
    return this.validateFile(file);
  },

  async validateMultipleImages(files) {
    return await this.validateMultipleFiles(files);
  },

  // Enhanced utility method to get optimized image URL
  getOptimizedUrl(url, options = {}) {
    try {
      if (!url || !url.includes('cloudinary.com')) {
        return url;
      }
      
      const {
        width = null,
        height = null,
        quality = 'auto',
        format = 'auto',
        crop = null
      } = options;
      
      let transformations = [`f_${format}`, `q_${quality}`];
      
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      if (crop) transformations.push(`c_${crop}`);
      
      const transformString = transformations.join(',');
      
      return url.replace(/\/upload\/[^/]*\//, `/upload/${transformString}/`)
                .replace('/upload/', `/upload/${transformString}/`);
    } catch (error) {
      console.error('Error optimizing URL:', error);
      return url;
    }
  }
};

export default CloudinaryService;