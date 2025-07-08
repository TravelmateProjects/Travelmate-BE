const Blog = require("../models/Blog");
const cloudinary = require("../configs/cloudinary");
const { uploadFilesToCloudinary } = require("../utils/cloudinaryUtils");

exports.createUserBlog = async (req, res) => {
  try {
    const userId = req.account.userId;
    const { content, address, adTargetUrl } = req.body;

    // Safely convert isAd string to boolean
    const isAd = req.body.isAd === "true";

    // Validate required content
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Content is required." });
    }

    // Validate ad URL if it's an ad post
    if (isAd && !adTargetUrl?.trim()) {
      return res.status(400).json({
        message: "Advertisement target URL is required for ad posts.",
      });
    }

    let uploadedImages = [];
    let uploadedVideos = [];

    // Handle uploaded files (images/videos)
    if (req.files) {
      // 🖼️ Process uploaded images (max 10)
      if (req.files.images) {
        const imageFiles = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];

        if (imageFiles.length > 10) {
          return res
            .status(400)
            .json({ message: "You can upload up to 10 images." });
        }

        uploadedImages = await uploadFilesToCloudinary(
          imageFiles,
          "Blog/Images"
        );
      }

      //Process uploaded video (max 1)
      if (req.files.videos) {
        const videoFiles = Array.isArray(req.files.videos)
          ? req.files.videos
          : [req.files.videos];

        if (videoFiles.length > 1) {
          return res
            .status(400)
            .json({ message: "Only one video can be uploaded." });
        }

        uploadedVideos = await uploadFilesToCloudinary(
          videoFiles,
          "Blog/Videos",
          "video"
        );
      }
    }

    //Create and save the new blog post
    const newUserBlog = new Blog({
      userId,
      content: content.trim(),
      address: address?.trim() || "",
      images: uploadedImages,
      videos: uploadedVideos,
      isAd,
      adTargetUrl: isAd ? adTargetUrl?.trim() : null,
    });

    await newUserBlog.save();

    return res.status(201).json({
      message: "Blog post created successfully.",
      blog: newUserBlog,
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({})
      .populate("userId", "fullName email avatar")
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
    const userId = req.account.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log(`Fetching blogs for userId: ${userId}`);
    const userBlogs = await Blog.find({ userId })
      .populate("userId", "fullName email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "User blogs fetched successfully",
      blogs: userBlogs || [],
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
    const {
      content,
      address,
      isAd,
      adTargetUrl,
      existingImagePublicIds,
      existingVideoPublicIds,
    } = req.body;

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
    userBlog.isAd = isAd || false;
    userBlog.adTargetUrl = isAd ? adTargetUrl : null;

    const keepImagePublicIds = existingImagePublicIds
      ? JSON.parse(existingImagePublicIds)
      : [];
    const keepVideoPublicIds = existingVideoPublicIds
      ? JSON.parse(existingVideoPublicIds)
      : [];

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

    const userBlog = await Blog.findById(id);

    if (!userBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (userBlog.userId.toString() !== req.account.userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this blog" });
    }

    for (const image of userBlog.images) {
      if (image.publicId) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (error) {
          console.error(
            `Error deleting image with publicId ${image.publicId}:`,
            error
          );
        }
      }
    }

    for (const video of userBlog.videos) {
      if (video.publicId) {
        try {
          await cloudinary.uploader.destroy(video.publicId, {
            resource_type: "video",
          });
        } catch (error) {
          console.error(
            `Error deleting video with publicId ${video.publicId}:`,
            error
          );
        }
      }
    }

    await userBlog.deleteOne();

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting user blog:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
