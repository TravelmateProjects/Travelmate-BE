const cloudinary = require('../configs/cloudinary');
const AlbumImage = require('../models/AlbumImage');
const UserAlbum = require('../models/UserAlbum');

exports.uploadMultipleImagesToAlbum = async (req, res) => {
    try {
        const { albumId } = req.params;
        const userId = req.account.userId; // Extract userId from token

        // Check if the album exists and if the user is the owner
        const album = await UserAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        if (album.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to upload images to this album' });
        }

        // Check if files are uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Upload images to Cloudinary and save to database
        const uploadedImages = await Promise.all(req.files.map(async (file) => {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: 'AlbumImages',
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
                uploadStream.end(file.buffer);
            });
            // Todo: nếu có lỗi thì xoá ảnh vừa up trên cloudinary

            const newImage = new AlbumImage({
                albumId,
                userId, // Store userId for reference
                url: result.secure_url,
                publicId: result.public_id,
            });

            await newImage.save();
            return newImage;
        }));

        res.status(201).json({
            message: 'Images uploaded successfully',
            images: uploadedImages,
        });
    } catch (error) {
        console.error('Error uploading images to album:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteImageFromAlbum = async (req, res) => {
    try {
        const { imageId } = req.params;

        // Find the image by ID
        const image = await AlbumImage.findById(imageId);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Delete the image from Cloudinary
        if (image.publicId) {
            try {
                await cloudinary.uploader.destroy(image.publicId);
            } catch (error) {
                console.error(`Error deleting image with publicId ${image.publicId}:`, error);
            }
        }

        // Delete the image from the database
        await image.deleteOne();

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image from album:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getImageById = async (req, res) => {
    try {
        const { imageId } = req.params;

        // Find the image by ID
        const image = await AlbumImage.findById(imageId);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        res.status(200).json({
            message: 'Image fetched successfully',
            image,
        });
    } catch (error) {
        console.error('Error fetching image by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getImagesByAlbumId = async (req, res) => {
    try {
        const { albumId } = req.params;

        // Find all images by album ID
        const images = await AlbumImage.find({ albumId }).sort({ createdAt: -1 });

        res.status(200).json({
            message: 'Images fetched successfully',
            images,
        });
    } catch (error) {
        console.error('Error fetching images by album ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};