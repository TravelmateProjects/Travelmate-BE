const Notification = require('../models/Notification');

class notificationUtils {
  /**
   * Create new notification
   * @param {Object} notificationData - Notification data
   * @param {ObjectId} notificationData.userId - Recipient ID
   * @param {string} notificationData.content - Notification content
   * @param {string} notificationData.type - Notification type
   * @param {ObjectId} notificationData.relatedId - Related object ID
   * @param {string} notificationData.relatedModel - Related object model
   * @param {ObjectId} notificationData.fromUser - Sender ID
   * @param {string} notificationData.priority - Priority level
   * @param {Object} notificationData.data - Additional data
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Notification object
   */
  static async createNotification(notificationData, io = null) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Populate fromUser information
      await notification.populate('fromUser', 'fullName avatar');
      
      // Send realtime notification if io is available
      if (io) {
        await this.sendRealtimeNotification(io, notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send realtime notification via socket
   * @param {Object} io - Socket.io instance
   * @param {Object} notification - Notification object
   */
  static async sendRealtimeNotification(io, notification) {
    try {
      if (io && notification.userId) {
        io.to(`user_${notification.userId}`).emit('newNotification', {
          id: notification._id,
          content: notification.content,
          type: notification.type,
          priority: notification.priority,
          fromUser: notification.fromUser,
          data: notification.data,
          createdAt: notification.createdAt,
          isRead: notification.isRead
        });
        
        // Update sent status
        await Notification.findByIdAndUpdate(notification._id, { notifyStatus: true });
      }
    } catch (error) {
      console.error('Error sending realtime notification:', error);
    }
  }

  /**
   * Create chat notification
   * @param {ObjectId} userId - Recipient ID
   * @param {ObjectId} fromUserId - Sender ID
   * @param {ObjectId} chatRoomId - Chat room ID
   * @param {string} messageContent - Message content
   * @param {Object} io - Socket.io instance
   */
  static async createChatNotification(userId, fromUserId, chatRoomId, messageContent, io) {
    const content = messageContent.length > 50 
      ? `${messageContent.substring(0, 50)}...` 
      : messageContent;
    
    return await this.createNotification({
      userId,
      content: `New message: ${content}`,
      type: 'chat',
      relatedId: chatRoomId,
      relatedModel: 'ChatRoom',
      fromUser: fromUserId,
      priority: 'medium',
      data: { chatRoomId, originalMessage: messageContent }
    }, io);
  }

  /**
   * Create connection notification
   * @param {ObjectId} userId - Recipient ID
   * @param {ObjectId} fromUserId - Sender ID
   * @param {string} action - 'request' | 'accepted' | 'rejected'
   * @param {Object} io - Socket.io instance
   */
  static async createConnectionNotification(userId, fromUserId, action, status, io) {
    const contentMap = {
      request: 'sent you a friend request',
      accepted: 'accepted your friend request',
      rejected: 'declined your friend request'
    };

    return await this.createNotification({
      userId,
      content: contentMap[action],
      type: 'connection_request',
      relatedId: fromUserId,
      relatedModel: 'User',
      fromUser: fromUserId,
      priority: 'medium',
      data: { action, status }
    }, io);
  }

  /**
   * Create travel match notification
   * @param {ObjectId} userId - Recipient ID
   * @param {ObjectId} matchedUserId - Matched user ID
   * @param {string} destination - Destination
   * @param {Object} io - Socket.io instance
   */
  static async createTravelMatchNotification(userId, matchedUserId, destination, io) {
    return await this.createNotification({
      userId,
      content: `You have a new travel match at ${destination}`,
      type: 'travel_match',
      relatedId: matchedUserId,
      relatedModel: 'User',
      fromUser: matchedUserId,
      priority: 'high',
      data: { destination }
    }, io);
  }

  /**
   * Create rating notification
   * @param {ObjectId} userId - Recipient ID
   * @param {ObjectId} fromUserId - Rater ID
   * @param {number} rating - Rating stars
   * @param {Object} io - Socket.io instance
   */
  static async createRatingNotification(userId, fromUserId, rating, io) {
    return await this.createNotification({
      userId,
      content: `You received a ${rating} star rating`,
      type: 'rating',
      relatedId: fromUserId,
      relatedModel: 'User',
      fromUser: fromUserId,
      priority: 'medium',
      data: { rating }
    }, io);
  }

  /**
   * Create system notification
   * @param {ObjectId} userId - Recipient ID
   * @param {string} content - Notification content
   * @param {string} priority - Priority level
   * @param {Object} data - Additional data
   * @param {Object} io - Socket.io instance
   */
  static async createSystemNotification(userId, content, priority = 'medium', data = {}, io) {
    return await this.createNotification({
      userId,
      content,
      type: 'system',
      priority,
      data
    }, io);
  }

  /**
   * Get unread notifications count
   * @param {ObjectId} userId - User ID
   * @returns {Promise<number>} Unread notifications count
   */
  static async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ 
        userId, 
        isRead: false 
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   * @param {ObjectId} notificationId - Notification ID
   * @param {ObjectId} userId - User ID
   * @returns {Promise<Object>} Notification object
   */
  static async markAsRead(notificationId, userId) {
    try {
      return await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Update status of connection request notification
   * @param {ObjectId} userId - Recipient ID (người nhận lời mời)
   * @param {ObjectId} fromUserId - Sender ID (người gửi lời mời)
   * @param {string} newStatus - 'accepted' | 'rejected'
   * @returns {Promise<number>} Number of notifications updated
   */
  static async updateConnectionNotificationStatus(userId, fromUserId, newStatus) {
    try {
      const result = await Notification.updateMany(
        {
          userId,
          fromUser: fromUserId,
          type: 'connection_request',
          'data.status': 'pending'
        },
        { $set: { 'data.status': newStatus } }
      );
      return result.modifiedCount || 0;
    } catch (error) {
      console.error('Error updating connection notification status:', error);
      throw error;
    }
  }
}

module.exports = notificationUtils;
