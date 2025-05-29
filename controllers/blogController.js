const Blog = require('../models/Blog');
const cloudinary = require('../configs/cloudinary');
const { uploadFilesToCloudinary } = require('../utils/cloudinaryUtils');

exports.createUserBlog = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from token
        const { content, address } = req.body; // Include address from request body

        let uploadedImages = [];
        let uploadedVideo = null;

        // Use the consolidated function for both images and videos
        if (req.files) {
            if (req.files.images) {
                if (req.files.images.length > 10) {
                    return res.status(400).json({ message: 'You can upload up to 10 images only' });
                }
                uploadedImages = await uploadFilesToCloudinary(req.files.images, 'Blog/Images');
            }

            if (req.files.videos) {
                if (req.files.videos.length > 1) {
                    return res.status(400).json({ message: 'You can upload only 1 video' });
                }
                uploadedVideo = await uploadFilesToCloudinary(req.files.videos, 'Blog/Videos', 'video');
            }
        }

        // Ensure uploadedVideo is directly assigned to the video field
        const newUserBlog = new Blog({
            userId,
            content,
            address, // Add address to the document
            images: uploadedImages,
            videos: uploadedVideo || [], // Directly assign uploadedVideo
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

        // Fetch all blogs of the user, populate user info
        const userBlogs = await Blog.find({ userId })
            .populate('userId', 'fullName email avatar') // Lấy thông tin user cơ bản
            .sort({ createdAt: -1 });

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
        const userBlog = await Blog.findById(id);

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
        const userBlog = await Blog.findById(id);

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

        // Ensure files are deleted from Cloudinary after updating the database
        if (!req.body.images || (Array.isArray(req.body.images) && req.body.images.length === 0)) {
            for (const image of userBlog.images) {
                if (image.publicId) {
                    try {
                        await cloudinary.uploader.destroy(image.publicId);
                        // console.log(`Deleted image with publicId ${image.publicId} from Cloudinary`);
                    } catch (error) {
                        console.error(`Error deleting image with publicId ${image.publicId}:`, error);
                    }
                }
            }
            userBlog.images = [];
        }

        // Ensure video deletion logic is correctly implemented
        if (!req.body.videos || (Array.isArray(req.body.videos) && req.body.videos.length === 0)) {
            for (const video of userBlog.videos) {
                if (video.publicId) {
                    try {
                        await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
                        // console.log(`Deleted video with publicId ${video.publicId} from Cloudinary`);
                    } catch (error) {
                        console.error(`Error deleting video with publicId ${video.publicId}:`, error);
                    }
                }
            }
            userBlog.videos = [];
        }

        // Handle image updates if files are uploaded
        if (req.files && req.files.images) {
            if (req.files.images.length > 10) {
                return res.status(400).json({ message: 'You can upload up to 10 images only' });
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
            userBlog.images = await uploadFilesToCloudinary(req.files.images, 'Blog/Images');
        }

        // Handle video updates if files are uploaded
        if (req.files && req.files.videos) {
            if (req.files.videos.length > 1) {
                return res.status(400).json({ message: 'You can upload only 1 video' });
            }

            // Delete old video from Cloudinary
            for (const video of userBlog.videos) {
                if (video.publicId) {
                    try {
                        await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
                    } catch (error) {
                        console.error(`Error deleting video with publicId ${video.publicId}:`, error);
                    }
                }
            }

            // Upload new video to Cloudinary
            userBlog.videos = await uploadFilesToCloudinary(req.files.videos, 'Blog/Videos', 'video');
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
        const userBlog = await Blog.findById(id);

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
                    // console.log(`Deleted image with publicId ${image.publicId} from Cloudinary`);
                } catch (error) {
                    console.error(`Error deleting image with publicId ${image.publicId}:`, error);
                }
            }
        }

        // Delete videos from Cloudinary
        for (const video of userBlog.videos) {
            if (video.publicId) {
                try {
                    await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });
                    // console.log(`Deleted video with publicId ${video.publicId} from Cloudinary`);
                } catch (error) {
                    console.error(`Error deleting video with publicId ${video.publicId}:`, error);
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