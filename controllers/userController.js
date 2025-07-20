const User = require('../models/User');
const cloudinary = require('../configs/cloudinary');
const Account = require('../models/Account');

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

exports.getAllUsers = async (req, res) => {
  try {
    // Get all users
    const users = await User.find();
    // Get all accounts and map by userId
    const accounts = await Account.find({}, 'userId accountStatus username role');
    const accountMap = {};
    accounts.forEach(acc => {
      if (acc.userId) accountMap[acc.userId.toString()] = acc;
    });
    // Merge accountStatus, username, and role into user object
    const usersWithStatus = users.map(user => {
      const acc = accountMap[user._id.toString()];
      return {
        ...user.toObject(),
        accountStatus: acc ? acc.accountStatus : undefined,
        username: acc ? acc.username : undefined,
        role: acc ? acc.role : undefined
      };
    });
    res.status(200).json({ message: 'Users retrieved successfully', data: usersWithStatus });
  } catch (error) {
    res.status(500).json({ message: `Failed to retrieve users: ${error.message}` });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User retrieved successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: `Failed to retrieve user: ${error.message}` });
  }
};

exports.updateUserTitle = async (req, res) => {
  try {
    const { userId, title } = req.body;
    const user = await User.findByIdAndUpdate(userId, { title }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User title updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: `Failed to update user title: ${error.message}` });
  }
};

exports.lockUser = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from route parameter
    const account = await Account.findOneAndUpdate({ userId }, { accountStatus: false }, { new: true }); // Update accountStatus in Account model
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(200).json({ message: 'User locked successfully', data: account });
  } catch (error) {
    res.status(500).json({ message: `Failed to lock user: ${error.message}` });
  }
};

exports.unlockUser = async (req, res) => {
  try {
    const { userId } = req.params; // Extract userId from route parameter
    const account = await Account.findOneAndUpdate({ userId }, { accountStatus: true }, { new: true }); // Update accountStatus in Account model
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(200).json({ message: 'User unlocked successfully', data: account });
  } catch (error) {
    res.status(500).json({ message: `Failed to unlock user: ${error.message}` });
  }
};

// Cập nhật trạng thái du lịch (travelStatus)
exports.updateTravelStatus = async (req, res) => {
  try {
    const userId = req.account.userId; // Lấy userId từ token
    const { travelStatus } = req.body;

    if (typeof travelStatus !== 'boolean') {
      return res.status(400).json({ message: 'travelStatus must be boolean (true/false)' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { travelStatus },
      { new: true } // Trả về tài liệu đã cập nhật
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Travel status updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating travel status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get multiple users by an array of userIds
exports.getManyByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No user ids provided' });
    }
    const users = await User.find({ _id: { $in: ids } });
    res.status(200).json({ message: 'Users retrieved successfully', data: users });
  } catch (error) {
    res.status(500).json({ message: `Failed to retrieve users: ${error.message}` });
  }
};

// Search users by criteria (username, email, status)
exports.searchUsers = async (req, res) => {
  try {
    const { username, fullName, email, accountStatus } = req.body;
    let userIdsFromAccount = null;
    let userIdsFromUser = null;

    // 1. Filter Account by username/accountStatus
    if (username || accountStatus !== undefined) {
      let accountFilter = {};
      if (username) accountFilter.username = { $regex: username, $options: 'i' };
      if (accountStatus !== undefined) accountFilter.accountStatus = accountStatus;
      const accounts = await Account.find(accountFilter, 'userId');
      userIdsFromAccount = accounts
        .filter(acc => acc.userId !== undefined && acc.userId !== null)
        .map(acc => acc.userId.toString());
      if (userIdsFromAccount.length === 0) {
        return res.status(200).json({ message: 'Users found', data: [] });
      }
    }

    // 2. Filter User by email/fullName
    let userFilter = {};
    if (email) userFilter.email = { $regex: email, $options: 'i' };
    if (fullName) userFilter.fullName = { $regex: fullName, $options: 'i' };
    let users = [];
    if (Object.keys(userFilter).length > 0) {
      users = await User.find(userFilter);
      userIdsFromUser = users.map(u => u._id.toString());
      if (userIdsFromUser.length === 0) {
        return res.status(200).json({ message: 'Users found', data: [] });
      }
    } else {
      users = await User.find();
      userIdsFromUser = users.map(u => u._id.toString());
    }

    // 3. Combine filters (intersection if both, else one)
    let finalUserIds = userIdsFromUser;
    if (userIdsFromAccount) {
      finalUserIds = finalUserIds.filter(id => userIdsFromAccount.includes(id));
      if (finalUserIds.length === 0) {
        return res.status(200).json({ message: 'Users found', data: [] });
      }
    }

    // 4. Get final users
    const finalUsers = await User.find({ _id: { $in: finalUserIds } });
    // 5. Get all accounts for these users
    const accounts = await Account.find({ userId: { $in: finalUserIds } }, 'userId accountStatus username role');
    const accountMap = {};
    accounts.forEach(acc => {
      if (acc.userId) accountMap[acc.userId.toString()] = acc;
    });
    // 6. Merge accountStatus, username, and role into user object
    const usersWithStatus = finalUsers.map(user => {
      const acc = accountMap[user._id.toString()];
      return {
        ...user.toObject(),
        accountStatus: acc ? acc.accountStatus : undefined,
        username: acc ? acc.username : undefined,
        role: acc ? acc.role : undefined
      };
    });
    res.status(200).json({ message: 'Users found', data: usersWithStatus });
  } catch (error) {
    res.status(500).json({ message: `Failed to search users: ${error.message}` });
  }
};