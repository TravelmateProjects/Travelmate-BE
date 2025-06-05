const Blog = require("../models/Blog");
const cloudinary = require("../configs/cloudinary");
const { uploadFilesToCloudinary } = require("../utils/cloudinaryUtils");

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
          return res
            .status(400)
            .json({ message: "You can upload up to 10 images only" });
        }
        uploadedImages = await uploadFilesToCloudinary(
          req.files.images,
          "Blog/Images"
        );
      }

      if (req.files.videos) {
        if (req.files.videos.length > 1) {
          return res
            .status(400)
            .json({ message: "You can upload only 1 video" });
        }
        uploadedVideo = await uploadFilesToCloudinary(
          req.files.videos,
          "Blog/Videos",
          "video"
        );
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
      message: "User blog created successfully",
      blog: newUserBlog,
    });
  } catch (error) {
    console.error("Error creating user blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllBlogs = async (req, res) => {
  try {
    // Fetch all blogs, populate user info
    const blogs = await Blog.find({})
      .populate("userId", "fullName email avatar") // Lấy thông tin user cơ bản
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All blogs fetched successfully",
      blogs,
    });
  } catch (error) {
    console.error("Error fetching all blogs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserBlogs = async (req, res) => {
  try {
    const userId = req.account.userId; // Lấy userId từ token
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log(`Fetching blogs for userId: ${userId}`); // Debug log
    const userBlogs = await Blog.find({ userId })
      .populate("userId", "fullName email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "User blogs fetched successfully",
      blogs: userBlogs || [], // Trả về mảng rỗng nếu không có blog
    });
  } catch (error) {
    console.error("Error fetching user blogs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUserBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const userBlog = await Blog.findById(id).populate(
      "userId",
      "fullName email avatar"
    );

    if (!userBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({
      message: "Blog fetched successfully",
      blog: userBlog,
    });
  } catch (error) {
    console.error("Error fetching blog by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateUserBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, address, existingImagePublicIds, existingVideoPublicIds } =
      req.body;

    // console.log("Update blog request:", {
    //   id,
    //   content,
    //   address,
    //   existingImagePublicIds,
    //   existingVideoPublicIds,
    //   files: req.files ? Object.keys(req.files) : null,
    // });

    const userBlog = await Blog.findById(id);

    if (!userBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (userBlog.userId.toString() !== req.account.userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this blog" });
    }

    if (content) userBlog.content = content;
    if (address) userBlog.address = address;

    const keepImagePublicIds = existingImagePublicIds
      ? JSON.parse(existingImagePublicIds)
      : [];
    let keepVideoPublicIds = existingVideoPublicIds
      ? JSON.parse(existingVideoPublicIds)
      : [];

    // console.log("Parsed public IDs:", { keepImagePublicIds, keepVideoPublicIds });

    if (userBlog.images && userBlog.images.length > 0) {
      const imagesToKeep = userBlog.images.filter((image) =>
        keepImagePublicIds.includes(image.publicId)
      );
      const imagesToDelete = userBlog.images.filter(
        (image) => !keepImagePublicIds.includes(image.publicId)
      );

      for (const image of imagesToDelete) {
        if (image.publicId) {
          try {
            await cloudinary.uploader.destroy(image.publicId);
            // console.log(`Deleted image with publicId ${image.publicId} from Cloudinary`);
          } catch (error) {
            console.error(
              `Error deleting image with publicId ${image.publicId}:`,
              error
            );
          }
        }
      }

      userBlog.images = imagesToKeep;
    }

    if (userBlog.videos && userBlog.videos.length > 0) {
      const videosToKeep = userBlog.videos.filter((video) =>
        keepVideoPublicIds.includes(video.publicId)
      );
      const videosToDelete = userBlog.videos.filter(
        (video) => !keepVideoPublicIds.includes(video.publicId)
      );

      for (const video of videosToDelete) {
        if (video.publicId) {
          try {
            await cloudinary.uploader.destroy(video.publicId, {
              resource_type: "video",
            });
            // console.log(`Deleted video with publicId ${video.publicId} from Cloudinary`);
          } catch (error) {
            console.error(
              `Error deleting video with publicId ${video.publicId}:`,
              error
            );
          }
        }
      }

      userBlog.videos = videosToKeep;
    }

    if (req.files && req.files.images) {
      const imageFiles = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      if (imageFiles.length > 10 - (userBlog.images?.length || 0)) {
        return res
          .status(400)
          .json({ message: "You can upload up to 10 images in total" });
      }

      const newImages = await uploadFilesToCloudinary(
        imageFiles,
        "Blog/Images"
      );
      userBlog.images = [...(userBlog.images || []), ...newImages];
    }

    if (req.files && req.files.videos) {
      const videoFiles = Array.isArray(req.files.videos)
        ? req.files.videos
        : [req.files.videos];
      if (
        videoFiles.length > 1 ||
        userBlog.videos.length + videoFiles.length > 1
      ) {
        return res.status(400).json({ message: "You can upload only 1 video" });
      }

      const newVideos = await uploadFilesToCloudinary(
        videoFiles,
        "Blog/Videos",
        "video"
      );
      userBlog.videos = [...(userBlog.videos || []), ...newVideos];
    }

    userBlog.updatedAt = new Date();
    await userBlog.save();

    res.status(200).json({
      message: "Blog updated successfully",
      blog: userBlog,
    });
  } catch (error) {
    console.error("Error updating user blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteUserBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the blog by ID
    const userBlog = await Blog.findById(id);

    if (!userBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if the user is the owner of the blog
    if (userBlog.userId.toString() !== req.account.userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this blog" });
    }

    // Delete images from Cloudinary
    for (const image of userBlog.images) {
      if (image.publicId) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
          // console.log(`Deleted image with publicId ${image.publicId} from Cloudinary`);
        } catch (error) {
          console.error(
            `Error deleting image with publicId ${image.publicId}:`,
            error
          );
        }
      }
    }

    // Delete videos from Cloudinary
    for (const video of userBlog.videos) {
      if (video.publicId) {
        try {
          await cloudinary.uploader.destroy(video.publicId, {
            resource_type: "video",
          });
          // console.log(`Deleted video with publicId ${video.publicId} from Cloudinary`);
        } catch (error) {
          console.error(
            `Error deleting video with publicId ${video.publicId}:`,
            error
          );
        }
      }
    }

    // Delete the blog from the database
    await userBlog.deleteOne();

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting user blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
