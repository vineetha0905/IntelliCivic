const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

class UploadController {
  // Upload single image
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // Check if Cloudinary is configured
      const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

      if (isCloudinaryConfigured) {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'intellicivic/images',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
            { format: 'auto' }
          ]
        });

        // Delete local file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: 'Image uploaded successfully',
          data: {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
          }
        });
      } else {
        // Development mode: return local file info
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        
        res.json({
          success: true,
          message: 'Image uploaded successfully (development mode)',
          data: {
            url: fileUrl,
            publicId: req.file.filename,
            width: null,
            height: null,
            format: req.file.mimetype.split('/')[1],
            size: req.file.size,
            localPath: req.file.path
          }
        });
      }
    } catch (error) {
      console.error('Upload image error:', error);
      
      // Clean up local file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Server error uploading image',
        error: error.message
      });
    }
  }

  // Upload multiple images
  async uploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided'
        });
      }

      const uploadPromises = req.files.map(async (file) => {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'intellicivic/images',
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              { format: 'auto' }
            ]
          });

          // Delete local file
          fs.unlinkSync(file.path);

          return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes
          };
        } catch (error) {
          console.error('Error uploading file:', file.originalname, error);
          // Clean up local file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result !== null);

      res.json({
        success: true,
        message: `${successfulUploads.length} images uploaded successfully`,
        data: {
          images: successfulUploads,
          totalUploaded: successfulUploads.length,
          totalRequested: req.files.length
        }
      });
    } catch (error) {
      console.error('Upload images error:', error);
      
      // Clean up any remaining local files
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error uploading images',
        error: error.message
      });
    }
  }

  // Upload document
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No document file provided'
        });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'intellicivic/documents',
        resource_type: 'raw'
      });

      // Delete local file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: result.bytes
        }
      });
    } catch (error) {
      console.error('Upload document error:', error);
      
      // Clean up local file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Server error uploading document',
        error: error.message
      });
    }
  }

  // Upload mixed files (images and documents)
  async uploadMixedFiles(req, res) {
    try {
      const { images = [], documents = [] } = req.files;
      const results = {
        images: [],
        documents: []
      };

      // Upload images
      if (images && images.length > 0) {
        const imagePromises = images.map(async (file) => {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: 'intellicivic/images',
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
                { format: 'auto' }
              ]
            });

            fs.unlinkSync(file.path);

            return {
              url: result.secure_url,
              publicId: result.public_id,
              name: file.originalname,
              type: file.mimetype,
              size: result.bytes
            };
          } catch (error) {
            console.error('Error uploading image:', file.originalname, error);
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            return null;
          }
        });

        results.images = (await Promise.all(imagePromises)).filter(result => result !== null);
      }

      // Upload documents
      if (documents && documents.length > 0) {
        const documentPromises = documents.map(async (file) => {
          try {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: 'intellicivic/documents',
              resource_type: 'raw'
            });

            fs.unlinkSync(file.path);

            return {
              url: result.secure_url,
              publicId: result.public_id,
              name: file.originalname,
              type: file.mimetype,
              size: result.bytes
            };
          } catch (error) {
            console.error('Error uploading document:', file.originalname, error);
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            return null;
          }
        });

        results.documents = (await Promise.all(documentPromises)).filter(result => result !== null);
      }

      res.json({
        success: true,
        message: 'Files uploaded successfully',
        data: results
      });
    } catch (error) {
      console.error('Upload mixed files error:', error);
      
      // Clean up any remaining local files
      if (req.files) {
        const allFiles = [...(req.files.images || []), ...(req.files.documents || [])];
        allFiles.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error uploading files',
        error: error.message
      });
    }
  }

  // Delete file from Cloudinary
  async deleteFile(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'Public ID is required'
        });
      }

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        res.json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found or already deleted'
        });
      }
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting file',
        error: error.message
      });
    }
  }

  // Get file info
  async getFileInfo(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'Public ID is required'
        });
      }

      const result = await cloudinary.api.resource(publicId);

      res.json({
        success: true,
        data: {
          publicId: result.public_id,
          url: result.secure_url,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.bytes,
          createdAt: result.created_at,
          tags: result.tags || []
        }
      });
    } catch (error) {
      console.error('Get file info error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting file info',
        error: error.message
      });
    }
  }

  // Transform image (resize, crop, etc.)
  async transformImage(req, res) {
    try {
      const { publicId, width, height, crop, quality } = req.query;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'Public ID is required'
        });
      }

      const transformation = [];
      
      if (width || height) {
        transformation.push({
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          crop: crop || 'limit'
        });
      }

      if (quality) {
        transformation.push({ quality: quality });
      }

      const url = cloudinary.url(publicId, {
        transformation: transformation
      });

      res.json({
        success: true,
        data: {
          url,
          publicId,
          transformation: transformation
        }
      });
    } catch (error) {
      console.error('Transform image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error transforming image',
        error: error.message
      });
    }
  }

  // Get upload statistics
  async getUploadStats(req, res) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'intellicivic/',
        max_results: 1000
      });

      const stats = {
        totalFiles: result.resources.length,
        totalSize: result.resources.reduce((sum, resource) => sum + resource.bytes, 0),
        byType: {},
        byFolder: {}
      };

      result.resources.forEach(resource => {
        // Count by type
        const type = resource.resource_type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Count by folder
        const folder = resource.public_id.split('/')[1] || 'root';
        stats.byFolder[folder] = (stats.byFolder[folder] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get upload stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting upload statistics',
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();
