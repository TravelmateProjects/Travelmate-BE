const UserAlbum = require('../models/UserAlbum');
const AlbumImage = require('../models/AlbumImage');
const cloudinary = require('cloudinary').v2;

exports.getAllUserAlbums = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from token

        // Fetch all albums of the user
        const userAlbums = await UserAlbum.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            message: 'User albums fetched successfully',
            albums: userAlbums,
        });
    } catch (error) {
        console.error('Error fetching user albums:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUserAlbumById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the album by ID
        const userAlbum = await UserAlbum.findById(id);

        if (!userAlbum) {
            return res.status(404).json({ message: 'Album not found' });
        }

        res.status(200).json({
            message: 'User album fetched successfully',
            album: userAlbum,
        });
    } catch (error) {
        console.error('Error fetching user album by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.createUserAlbum = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from token
        const { albumName } = req.body;

        // Create a new UserAlbum document without images
        const newUserAlbum = new UserAlbum({
            userId,
            albumName,
        });

        // Save the document to the database
        await newUserAlbum.save();

        res.status(201).json({
            message: 'User album created successfully',
            album: newUserAlbum,
        });
    } catch (error) {
        console.error('Error creating user album:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateUserAlbum = async (req, res) => {
    try {
        const { id } = req.params;
        const { albumName, description } = req.body;
        const userId = req.account.userId; // Extract userId from token

        // Find the album by ID
        const album = await UserAlbum.findById(id);

        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Check if the user is the owner of the album
        if (album.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to update this album' });
        }

        // Update album details
        if (albumName) album.albumName = albumName;
        if (description) album.description = description;

        // Save the updated album
        await album.save();

        res.status(200).json({
            message: 'Album updated successfully',
            album,
        });
    } catch (error) {
        console.error('Error updating user album:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteUserAlbum = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId; // Extract userId from token

        // Find the album by ID
        const album = await UserAlbum.findById(id);

        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Check if the user is the owner of the album
        if (album.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this album' });
        }

        // Find all images in the album
        const images = await AlbumImage.find({ albumId: id });

        // Delete all images from Cloudinary and the database
        for (const image of images) {
            if (image.publicId) {
                try {
                    await cloudinary.uploader.destroy(image.publicId);
                } catch (error) {
                    console.error(`Error deleting image with publicId ${image.publicId}:`, error);
                }
            }
            await image.deleteOne();
        }

        // Delete the album from the database
        await album.deleteOne();

        res.status(200).json({ message: 'Album and all associated images deleted successfully' });
    } catch (error) {
        console.error('Error deleting user album:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};