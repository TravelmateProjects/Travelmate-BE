const cloudinary = require("../configs/cloudinary");
const AlbumImage = require("../models/AlbumImage");
const UserAlbum = require("../models/UserAlbum");

exports.uploadMultipleImagesToAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.account.userId;

    // Kiểm tra album tồn tại
    const album = await UserAlbum.findById(albumId);
    if (!album) {
      return res.status(404).json({ message: "Album not found" });
    }

    // Kiểm tra quyền sở hữu
    if (album.userId.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to upload images to this album",
      });
    }

    // Kiểm tra có file được upload không
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Kiểm tra giới hạn 20 ảnh
    const currentImageCount = await AlbumImage.countDocuments({ albumId });
    if (currentImageCount + req.files.length > 20) {
      return res
        .status(400)
        .json({ message: "Album cannot have more than 20 images" });
    }

    const uploadedImages = [];
    try {
      // Sử dụng uploadFilesToCloudinary để upload ảnh
      const cloudinaryResults = await uploadFilesToCloudinary(
        req.files,
        "AlbumImages",
        "image"
      );

      // Lưu thông tin ảnh vào database
      for (const result of cloudinaryResults) {
        const newImage = new AlbumImage({
          albumId,
          userId,
          url: result.url,
          publicId: result.publicId,
        });
        await newImage.save();
        uploadedImages.push(newImage);
      }

      res.status(201).json({
        message: "Images uploaded successfully",
        images: uploadedImages,
      });
    } catch (error) {
      // Rollback: Xóa ảnh đã upload trên Cloudinary nếu có lỗi
      for (const image of uploadedImages) {
        if (image.publicId) {
          try {
            await cloudinary.uploader.destroy(image.publicId);
          } catch (cloudError) {
            console.error(
              `Failed to delete image ${image.publicId}:`,
              cloudError
            );
          }
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error uploading images to album:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteImageFromAlbum = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Find the image by ID
    const image = await AlbumImage.findById(imageId);

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Delete the image from Cloudinary
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

    // Delete the image from the database
    await image.deleteOne();

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image from album:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getImageById = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Find the image by ID
    const image = await AlbumImage.findById(imageId);

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.status(200).json({
      message: "Image fetched successfully",
      image,
    });
  } catch (error) {
    console.error("Error fetching image by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getImagesByAlbumId = async (req, res) => {
  try {
    const { albumId } = req.params;

    // Find all images by album ID
    const images = await AlbumImage.find({ albumId }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Images fetched successfully",
      images,
    });
  } catch (error) {
    console.error("Error fetching images by album ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
