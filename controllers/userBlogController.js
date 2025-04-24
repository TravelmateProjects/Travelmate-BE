const UserBlog = require('../models/UserBlog');
const cloudinary = require('../configs/cloudinary');

// Tạo bài viết mới với nhiều ảnh
exports.createUserBlog = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from token
        const { content, address } = req.body; // Include address from request body

        let uploadedImages = [];

        // Check if files are uploaded
        if (req.files && req.files.length > 0) {
            // Limit the number of uploaded files to 10
            if (req.files.length > 10) {
                return res.status(400).json({ message: 'You can upload up to 10 files only' });
            }

            // Upload images to Cloudinary
            uploadedImages = await Promise.all(req.files.map(async (file) => {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({
                        folder: 'UserBlogImages',
                    }, (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                    uploadStream.end(file.buffer);
                });

                return {
                    url: result.secure_url,
                    publicId: result.public_id,
                    uploadedAt: new Date(),
                };
            }));
        }

        // Create a new UserBlog document
        const newUserBlog = new UserBlog({
            userId,
            content,
            address, // Add address to the document
            images: uploadedImages,
        });

        // Save the document to the database
        await newUserBlog.save();

        res.status(201).json({
            message: 'User blog created successfully',
            blog: newUserBlog,
        });
    } catch (error) {
        console.error('Error creating user blog:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUserBlogs = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from token

        // Fetch all blogs of the user
        const userBlogs = await UserBlog.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            message: 'User blogs fetched successfully',
            blogs: userBlogs,
        });
    } catch (error) {
        console.error('Error fetching user blogs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUserBlogById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the blog by ID
        const userBlog = await UserBlog.findById(id);

        if (!userBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json({
            message: 'User blog fetched successfully',
            blog: userBlog,
        });
    } catch (error) {
        console.error('Error fetching user blog by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateUserBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, address } = req.body;

        // Find the blog by ID
        const userBlog = await UserBlog.findById(id);

        if (!userBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Check if the user is the owner of the blog
        if (userBlog.userId.toString() !== req.account.userId) {
            return res.status(403).json({ message: 'You are not authorized to update this blog' });
        }

        // Update content and address
        if (content) userBlog.content = content;
        if (address) userBlog.address = address;

        // Handle image updates if files are uploaded
        if (req.files && req.files.length > 0) {
            // Limit the number of uploaded files to 10
            if (req.files.length > 10) {
                return res.status(400).json({ message: 'You can upload up to 10 files only' });
            }

            // Delete old images from Cloudinary
            for (const image of userBlog.images) {
                if (image.publicId) {
                    try {
                        await cloudinary.uploader.destroy(image.publicId);
                    } catch (error) {
                        console.error(`Error deleting image with publicId ${image.publicId}:`, error);
                    }
                }
            }

            // Upload new images to Cloudinary
            const uploadedImages = await Promise.all(req.files.map(async (file) => {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({
                        folder: 'UserBlogImages',
                    }, (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    });
                    uploadStream.end(file.buffer);
                });

                return {
                    url: result.secure_url,
                    publicId: result.public_id,
                    uploadedAt: new Date(),
                };
            }));

            userBlog.images = uploadedImages;
        }

        // Save the updated blog
        await userBlog.save();

        res.status(200).json({
            message: 'Blog updated successfully',
            blog: userBlog,
        });
    } catch (error) {
        console.error('Error updating user blog:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteUserBlog = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the blog by ID
        const userBlog = await UserBlog.findById(id);

        if (!userBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Check if the user is the owner of the blog
        if (userBlog.userId.toString() !== req.account.userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this blog' });
        }

        // Delete images from Cloudinary
        for (const image of userBlog.images) {
            if (image.publicId) {
                try {
                    await cloudinary.uploader.destroy(image.publicId);
                } catch (error) {
                    console.error(`Error deleting image with publicId ${image.publicId}:`, error);
                }
            }
        }

        // Delete the blog from the database
        await userBlog.deleteOne();

        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Error deleting user blog:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};