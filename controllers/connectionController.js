const User = require('../models/User');
const mongoose = require('mongoose');
const notificationUtils = require('../utils/notificationUtils');

exports.sendFriendRequest = async (req, res) => {
  const fromUserId = req.account.userId;
  const { toUserId } = req.body;
  if (!toUserId || fromUserId === toUserId) {
    return res.status(400).json({ message: 'Invalid user.' });
  }
  try {
    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found.' });
    const alreadyRequested = toUser.connections.some(
      c => c && c.userId && c.userId.toString() === fromUserId && c.status === 'pending'
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: 'Request already sent.' });
    }
    toUser.connections.push({ userId: fromUserId, status: 'pending' });
    await toUser.save();
    const io = req.app.get('io');
    await notificationUtils.createConnectionNotification(toUserId, fromUserId, 'request', 'pending', io);
    res.json({ message: 'Friend request sent.' });
  } catch (err) {
    console.error('Send friend request error:', err, { fromUserId, toUserId, account: req.account });
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  const userId = req.account.userId;
  const { fromUserId } = req.body;
  if (!fromUserId) return res.status(400).json({ message: 'Invalid user.' });
  try {
    const user = await User.findById(userId);
    const conn = user.connections.find(c => c.userId.toString() === fromUserId && c.status === 'pending');
    if (!conn) return res.status(404).json({ message: 'No pending request.' });
    conn.status = 'accepted';
    await user.save();
    const fromUser = await User.findById(fromUserId);
    const backConn = fromUser.connections.find(c => c.userId.toString() === userId);
    if (backConn) {
      backConn.status = 'accepted';
    } else {
      fromUser.connections.push({ userId, status: 'accepted' });
    }
    await fromUser.save();
    await notificationUtils.updateConnectionNotificationStatus(userId, fromUserId, 'accepted');
    const io = req.app.get('io');
    await notificationUtils.createConnectionNotification(fromUserId, userId, 'accepted', 'accepted', io);
    res.json({ message: 'Friend request accepted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.rejectFriendRequest = async (req, res) => {
  const userId = req.account.userId;
  const { fromUserId } = req.body;
  if (!fromUserId) return res.status(400).json({ message: 'Invalid user.' });
  try {
    const user = await User.findById(userId);
    const conn = user.connections.find(c => c.userId.toString() === fromUserId && c.status === 'pending');
    if (!conn) return res.status(404).json({ message: 'No pending request.' });
    conn.status = 'rejected';
    await user.save();
    const fromUser = await User.findById(fromUserId);
    const backConn = fromUser.connections.find(c => c.userId.toString() === userId);
    if (backConn) {
      backConn.status = 'rejected';
    } else {
      fromUser.connections.push({ userId, status: 'rejected' });
    }
    await fromUser.save();
    await notificationUtils.updateConnectionNotificationStatus(userId, fromUserId, 'rejected');
    const io = req.app.get('io');
    await notificationUtils.createConnectionNotification(fromUserId, userId, 'rejected', 'rejected', io);
    res.json({ message: 'Friend request rejected.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.removeFriend = async (req, res) => {
  const userId = req.account.userId;
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ message: 'Invalid friendId.' });
  try {
    const user = await User.findById(userId);
    user.connections = user.connections.filter(c => c.userId.toString() !== friendId);
    await user.save();
    const friend = await User.findById(friendId);
    if (friend) {
      friend.connections = friend.connections.filter(c => c.userId.toString() !== userId);
      await friend.save();
    }
    res.json({ message: 'Friend removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};
