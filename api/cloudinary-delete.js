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
    const { publicId, url } = req.body;
    
    // Validate input
    if (!publicId && !url) {
      return res.status(400).json({
        success: false,
        error: 'Either publicId or url must be provided'
      });
    }
    
    let imagePublicId = publicId;
    
    // Extract public ID from URL if needed
    if (!imagePublicId && url) {
      imagePublicId = extractPublicId(url);
      if (!imagePublicId) {
        return res.status(400).json({
          success: false,
          error: 'Could not extract public ID from URL'
        });
      }
    }
    
    console.log('Attempting to delete image:', imagePublicId);
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(imagePublicId);
    
    console.log('Cloudinary delete result:', result);
    
    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        publicId: imagePublicId,
        result: result.result
      });
    } else if (result.result === 'not found') {
      res.status(404).json({
        success: false,
        error: 'Image not found in Cloudinary',
        publicId: imagePublicId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to delete image',
        result: result.result,
        publicId: imagePublicId
      });
    }
  } catch (error) {
    console.error('Error in delete function:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}