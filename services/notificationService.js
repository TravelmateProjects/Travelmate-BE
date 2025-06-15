const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Tạo thông báo mới
   * @param {Object} notificationData - Dữ liệu thông báo
   * @param {ObjectId} notificationData.userId - ID người nhận
   * @param {string} notificationData.content - Nội dung thông báo
   * @param {string} notificationData.type - Loại thông báo
   * @param {ObjectId} notificationData.relatedId - ID object liên quan
   * @param {string} notificationData.relatedModel - Model của object liên quan
   * @param {ObjectId} notificationData.fromUser - ID người gửi
   * @param {string} notificationData.priority - Độ ưu tiên
   * @param {Object} notificationData.data - Dữ liệu bổ sung
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Notification object
   */
  static async createNotification(notificationData, io = null) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Populate thông tin fromUser
      await notification.populate('fromUser', 'fullName avatar');
      
      // Gửi thông báo realtime nếu có io
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
   * Gửi thông báo realtime qua socket
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
        
        // Cập nhật trạng thái đã gửi
        await Notification.findByIdAndUpdate(notification._id, { notifyStatus: true });
      }
    } catch (error) {
      console.error('Error sending realtime notification:', error);
    }
  }

  /**
   * Tạo thông báo tin nhắn mới
   * @param {ObjectId} userId - ID người nhận
   * @param {ObjectId} fromUserId - ID người gửi
   * @param {ObjectId} chatRoomId - ID phòng chat
   * @param {string} messageContent - Nội dung tin nhắn
   * @param {Object} io - Socket.io instance
   */
  static async createChatNotification(userId, fromUserId, chatRoomId, messageContent, io) {
    const content = messageContent.length > 50 
      ? `${messageContent.substring(0, 50)}...` 
      : messageContent;
    
    return await this.createNotification({
      userId,
      content: `Tin nhắn mới: ${content}`,
      type: 'chat',
      relatedId: chatRoomId,
      relatedModel: 'ChatRoom',
      fromUser: fromUserId,
      priority: 'medium',
      data: { chatRoomId, originalMessage: messageContent }
    }, io);
  }

  /**
   * Tạo thông báo kết nối bạn bè
   * @param {ObjectId} userId - ID người nhận
   * @param {ObjectId} fromUserId - ID người gửi
   * @param {string} action - 'request' | 'accepted' | 'rejected'
   * @param {Object} io - Socket.io instance
   */
  static async createConnectionNotification(userId, fromUserId, action, io) {
    const contentMap = {
      request: 'đã gửi lời mời kết bạn',
      accepted: 'đã chấp nhận lời mời kết bạn',
      rejected: 'đã từ chối lời mời kết bạn'
    };

    return await this.createNotification({
      userId,
      content: contentMap[action],
      type: 'connection_request',
      relatedId: fromUserId,
      relatedModel: 'User',
      fromUser: fromUserId,
      priority: 'medium',
      data: { action }
    }, io);
  }

  /**
   * Tạo thông báo match du lịch
   * @param {ObjectId} userId - ID người nhận
   * @param {ObjectId} matchedUserId - ID người được match
   * @param {string} destination - Điểm đến
   * @param {Object} io - Socket.io instance
   */
  static async createTravelMatchNotification(userId, matchedUserId, destination, io) {
    return await this.createNotification({
      userId,
      content: `Bạn có một travel match mới tại ${destination}`,
      type: 'travel_match',
      relatedId: matchedUserId,
      relatedModel: 'User',
      fromUser: matchedUserId,
      priority: 'high',
      data: { destination }
    }, io);
  }

  /**
   * Tạo thông báo đánh giá
   * @param {ObjectId} userId - ID người nhận
   * @param {ObjectId} fromUserId - ID người đánh giá
   * @param {number} rating - Số sao đánh giá
   * @param {Object} io - Socket.io instance
   */
  static async createRatingNotification(userId, fromUserId, rating, io) {
    return await this.createNotification({
      userId,
      content: `Bạn nhận được đánh giá ${rating} sao`,
      type: 'rating',
      relatedId: fromUserId,
      relatedModel: 'User',
      fromUser: fromUserId,
      priority: 'medium',
      data: { rating }
    }, io);
  }

  /**
   * Tạo thông báo hệ thống
   * @param {ObjectId} userId - ID người nhận
   * @param {string} content - Nội dung thông báo
   * @param {string} priority - Độ ưu tiên
   * @param {Object} data - Dữ liệu bổ sung
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
   * Lấy số lượng thông báo chưa đọc
   * @param {ObjectId} userId - ID người dùng
   * @returns {Promise<number>} Số lượng thông báo chưa đọc
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
   * Đánh dấu thông báo đã đọc
   * @param {ObjectId} notificationId - ID thông báo
   * @param {ObjectId} userId - ID người dùng
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
}

module.exports = NotificationService;
