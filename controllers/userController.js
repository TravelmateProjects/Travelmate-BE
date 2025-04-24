const User = require('../models/User');

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