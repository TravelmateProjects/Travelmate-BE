const User = require('../models/User');
const cloudinary = require('../configs/cloudinary');


// Cập nhật thông tin cá nhân trừ avatar và coverImage
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.account.userId; // đã được giải mã từ token
    const updateData = { ...req.body };

    // Remove avatar and coverImage from updateData
    delete updateData.avatar;
    delete updateData.coverImage;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// Cập nhật ảnh bìa
exports.updateCoverImage = async (req, res) => {
  try {
    const userId = req.account.userId; // đã được giải mã từ token

    // Check if a file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old cover image from Cloudinary if it exists
    if (user.coverImage && user.coverImage.publicId) {
      await cloudinary.uploader.destroy(user.coverImage.publicId);
    }

    // Upload new cover image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'CoverImage',
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      uploadStream.end(req.file.buffer);
    });

    // Log the result from Cloudinary
    console.log('Cloudinary upload result:', result);

    // Update user's cover image
    user.coverImage = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await user.save();

    // Log the updated user
    console.log('Updated user:', user);

    res.status(200).json({
      message: 'Cover image updated successfully',
      coverImage: user.coverImage,
    });
  } catch (error) {
    console.error('Error updating cover image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật avatar
exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.account.userId; // đã được giải mã từ token

    // Check if a file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar && user.avatar.publicId) {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    }

    // Upload new avatar to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: 'Avatar',
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      uploadStream.end(req.file.buffer);
    });

    // Log the result from Cloudinary
    console.log('Cloudinary upload result:', result);

    // Update user's avatar
    user.avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await user.save();

    // Log the updated user
    console.log('Updated user:', user);

    res.status(200).json({
      message: 'Avatar updated successfully',
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};