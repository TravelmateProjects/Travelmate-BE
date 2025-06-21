const User = require('../models/User');
const mongoose = require('mongoose');
const notificationUtils = require('../utils/notificationUtils');

// Gửi yêu cầu kết bạn
exports.sendFriendRequest = async (req, res) => {
  const fromUserId = req.account.userId;
  const { toUserId } = req.body;
  if (!toUserId || fromUserId === toUserId) {
    return res.status(400).json({ message: 'Invalid user.' });
  }
  try {
    // Kiểm tra đã gửi chưa
    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found.' });
    const alreadyRequested = toUser.connections.some(
      c => c && c.userId && c.userId.toString() === fromUserId && c.status === 'pending'
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: 'Request already sent.' });
    }
    // Thêm vào connections của user nhận
    toUser.connections.push({ userId: fromUserId, status: 'pending' });
    await toUser.save();
    // Gửi notification qua socket
    const io = req.app.get('io');
    await notificationUtils.createConnectionNotification(toUserId, fromUserId, 'request', io);
    res.json({ message: 'Friend request sent.' });
  } catch (err) {
    console.error('Send friend request error:', err, { fromUserId, toUserId, account: req.account });
    res.status(500).json({ message: 'Server error.' });
  }
};

// Chấp nhận kết bạn
exports.acceptFriendRequest = async (req, res) => {
  const userId = req.account.userId;
  const { fromUserId } = req.body;
  if (!fromUserId) return res.status(400).json({ message: 'Invalid user.' });
  try {
    // Cập nhật status cho user hiện tại
    const user = await User.findById(userId);
    const conn = user.connections.find(c => c.userId.toString() === fromUserId && c.status === 'pending');
    if (!conn) return res.status(404).json({ message: 'No pending request.' });
    conn.status = 'accepted';
    await user.save();
    // Cập nhật cho user gửi request
    const fromUser = await User.findById(fromUserId);
    const backConn = fromUser.connections.find(c => c.userId.toString() === userId);
    if (backConn) {
      backConn.status = 'accepted';
    } else {
      fromUser.connections.push({ userId, status: 'accepted' });
    }
    await fromUser.save();
    // Gửi notification qua socket cho user gửi request
    const io = req.app.get('io');
    await notificationUtils.createConnectionNotification(fromUserId, userId, 'accepted', io);
    res.json({ message: 'Friend request accepted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// Từ chối kết bạn
exports.rejectFriendRequest = async (req, res) => {
  const userId = req.account.userId;
  const { fromUserId } = req.body;
  if (!fromUserId) return res.status(400).json({ message: 'Invalid user.' });
  try {
    // Cập nhật status cho user hiện tại
    const user = await User.findById(userId);
    const conn = user.connections.find(c => c.userId.toString() === fromUserId && c.status === 'pending');
    if (!conn) return res.status(404).json({ message: 'No pending request.' });
    conn.status = 'rejected';
    await user.save();
    // Cập nhật cho user gửi request
    const fromUser = await User.findById(fromUserId);
    const backConn = fromUser.connections.find(c => c.userId.toString() === userId);
    if (backConn) {
      backConn.status = 'rejected';
    } else {
      fromUser.connections.push({ userId, status: 'rejected' });
    }
    await fromUser.save();
    res.json({ message: 'Friend request rejected.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};
