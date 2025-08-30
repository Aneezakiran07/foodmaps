const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (secrets are safe on server)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to extract public ID from URL
const extractPublicId = (url) => {
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
    
    // Remove transformation parameters
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
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { publicIds, urls } = req.body;
    
    if (!publicIds && !urls) {
      return res.status(400).json({
        success: false,
        error: 'Either publicIds or urls array must be provided'
      });
    }
    
    let imagePublicIds = publicIds || [];
    
    // Extract public IDs from URLs if needed
    if (!imagePublicIds.length && urls && urls.length) {
      imagePublicIds = urls.map(url => extractPublicId(url)).filter(id => id !== null);
      
      if (imagePublicIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Could not extract any valid public IDs from URLs'
        });
      }
    }
    
    if (imagePublicIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid public IDs provided'
      });
    }
    
    console.log('Attempting to delete images:', imagePublicIds);
    
    // Delete from Cloudinary (batch operation)
    const result = await cloudinary.api.delete_resources(imagePublicIds);
    
    console.log('Cloudinary bulk delete result:', result);
    
    // Count successful and failed deletions
    const deleted = result.deleted || {};
    const deletedCount = Object.keys(deleted).filter(key => deleted[key] === 'deleted').length;
    const notFoundCount = Object.keys(deleted).filter(key => deleted[key] === 'not_found').length;
    const failedCount = imagePublicIds.length - deletedCount - notFoundCount;
    
    res.status(200).json({
      success: failedCount === 0,
      totalRequested: imagePublicIds.length,
      deletedCount,
      notFoundCount,
      failedCount,
      results: result.deleted,
      partial: failedCount > 0 && deletedCount > 0
    });
  } catch (error) {
    console.error('Error in bulk delete function:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}