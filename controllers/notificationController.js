const Notification = require('../models/Notification');

// Create new notification
exports.createNotification = async (req, res) => {
  try {
    const {
      userId,
      content,
      type,
      relatedId,
      relatedModel,
      priority = 'medium',
      fromUser,
      data
    } = req.body;

    const notification = new Notification({
      userId,
      content,
      type,
      relatedId,
      relatedModel,
      priority,
      fromUser,
      data
    });

    await notification.save();
    
    // Populate fromUser information
    await notification.populate('fromUser', 'fullName avatar');

    // Send realtime notification via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('newNotification', notification);
      
      // Update sent status
      notification.notifyStatus = true;
      await notification.save();
    }

    res.status(201).json({
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user notifications list
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.account.userId;
    const { page = 1, limit = 20, isRead } = req.query;
    
    const query = { userId };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .populate('fromUser', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.status(200).json({
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.account.userId;

    // Validate notification ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    // Check if ID is a valid ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid notification ID format' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.account.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.account.userId;

    // Validate notification ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    // Check if ID is a valid ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid notification ID format' });
    }

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get unread notifications count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.account.userId;
    
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.status(200).json({
      message: 'Unread count retrieved successfully',
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Service function to create notification from other modules
exports.createNotificationService = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    
    // Populate fromUser information
    await notification.populate('fromUser', 'fullName avatar');
    
    return notification;
  } catch (error) {
    console.error('Error in createNotificationService:', error);
    throw error;
  }
};

// Service function to send realtime notification
exports.sendRealtimeNotification = async (io, notification) => {
  try {
    if (io && notification.userId) {
      io.to(`user_${notification.userId}`).emit('newNotification', notification);
      
      // Update sent status
      await Notification.findByIdAndUpdate(notification._id, { notifyStatus: true });
    }
  } catch (error) {
    console.error('Error sending realtime notification:', error);
  }
};
