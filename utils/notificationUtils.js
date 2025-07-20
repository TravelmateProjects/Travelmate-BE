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
      // Check if we're running in batch context
      const isBatchContext = !!global.socketIO;
      
      // If io wasn't passed but we have global.socketIO, use that
      if (!io && isBatchContext) {
        io = global.socketIO;
      }
      
      // Create and save notification
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Populate fromUser information if needed
      if (notification.fromUser) {
        await notification.populate('fromUser', 'fullName avatar');
      }
      
      // Send realtime notification if io is available
      if (io) {
        await this.sendRealtimeNotification(io, notification);
      }
      
      return notification;
    } catch (error) {
      console.error(`[Notification] Error creating notification: ${error.message}`);
      // Still throw so calling code can handle it
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
      if (!io || !notification.userId) {
        return;
      }
      
      const socketRoom = `user_${notification.userId}`;
      
      io.to(socketRoom).emit('newNotification', {
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
    } catch (error) {
      console.error(`[Notification] Error sending realtime notification: ${error.message}`);
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
  static async createChatNotification(userId, fromUserId, chatRoomId, chatRoomName = null, messageContent, io) {
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
      data: { chatRoomId, chatRoomName, originalMessage: messageContent }
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
   * Create travel reminder notification
   * @param {ObjectId} userId - Recipient ID
   * @param {number} daysRemaining - Days remaining before trip
   * @param {string} destination - Destination name
   * @param {boolean} isCreator - Whether the user is the trip creator
   * @param {Object} tripData - Trip related data
   * @param {Object} io - Socket.io instance
   */
  static async createTravelReminderNotification(userId, daysRemaining, destination, isCreator = true, tripData = {}, io) {
    // Content templates for different days (English only)
    const contentTemplates = {
      creator: {
        5: `Reminder: Your trip to ${destination} is in 5 days!`,
        3: `Reminder: Your trip to ${destination} is in 3 days! Time to start preparing.`,
        1: `Reminder: Tomorrow is your trip to ${destination}! Make sure you've prepared everything for your journey. We hope you have a great trip!`
      },
      participant: {
        5: `Reminder: You have a trip to ${destination} in 5 days! Please check your travel details and prepare luggage for your trip.`,
        3: `Reminder: You have a trip to ${destination} in 3 days! Time to start preparing.`,
        1: `Reminder: Tomorrow is your trip to ${destination}! Make sure you've prepared everything for your journey. We hope you have a great trip!`
      }
    };

    // Determine which content set to use
    const role = isCreator ? 'creator' : 'participant';
    
    // Get the appropriate message content
    const content = contentTemplates[role][daysRemaining];
    
    // Set data for the notification
    const notificationData = {
      type: 'travel_reminder',
      priority: 'high',
      ...tripData,
      daysRemaining,
      destination
    };

    return await this.createNotification({
      userId,
      content,
      type: 'travel_reminder',
      priority: 'high',
      data: notificationData
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
   * Create VIP account renewal reminder notification
   * @param {ObjectId} userId - Recipient ID
   * @param {number} daysRemaining - Days remaining before VIP expiration
   * @param {string} planType - Type of plan ('month' or 'year')
   * @param {Object} accountData - Account related data
   * @param {Object} io - Socket.io instance
   */
  static async createVipAccountRenewReminderNotification(userId, daysRemaining, planType, accountData = {}, io) {
    // Format plan type for display
    const formattedPlanType = planType === 'month' ? 'Monthly' : 'Yearly';
    
    // Content templates for different scenarios
    const contentTemplates = {
      // For regular reminders before expiration
      reminder: {
        3: `Your ${formattedPlanType} VIP subscription will expire in 3 days. Renew now to continue enjoying premium features!`,
        1: `Your ${formattedPlanType} VIP subscription expires tomorrow! Don't miss out on premium features - renew your subscription today.`
      },
      // For expired notifications
      expired: `Your ${formattedPlanType} VIP subscription has expired. Upgrade now to restore premium features and benefits!`
    };

    // Determine content based on whether this is an expiration notice or a reminder
    let content;
    let notificationType;
    
    if (daysRemaining === 0) {
      // This is an expiration notice
      content = contentTemplates.expired;
      notificationType = 'vip_expired';
    } else {
      // This is a reminder
      content = contentTemplates.reminder[daysRemaining];
      notificationType = 'vip_expiration';
    }
    
    // Set data for the notification
    const notificationData = {
      type: notificationType,
      priority: 'high',
      ...accountData,
      daysRemaining,
      planType,
      formattedPlanType
    };

    return await this.createNotification({
      userId,
      content,
      type: 'vip_reminder',
      priority: 'high',
      data: notificationData
    }, io);
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

  /**
   * Create travel planning reminder notification
   * @param {ObjectId} userId - User ID to send notification to
   * @param {number} daysUntilArrival - Days until arrival date
   * @param {Object} tripData - Trip data
   * @param {boolean} isCreator - Whether the user is the creator of the trip
   * @param {Object} io - Socket.IO instance
   */
  static async createTravelPlanningReminderNotification(userId, daysUntilArrival, tripData, isCreator = true, io) {
    const message = isCreator 
      ? `Please update your travel plan to ${tripData.destination} that starts in ${daysUntilArrival} days`
      : `A trip to ${tripData.destination} you're part of needs to be updated. It starts in ${daysUntilArrival} days`;
      
    return this.createNotification({
      userId,
      content: message,
      type: 'travel_status_reminder',
      priority: 'medium',
      data: {
        travelHistoryId: tripData._id,
        destination: tripData.destination,
        arrivalDate: tripData.arrivalDate,
        daysUntilArrival,
        ...(isCreator ? {} : { creatorId: tripData.creatorId._id, creatorName: tripData.creatorId.fullName })
      }
    }, io);
  }

  /**
   * Create auto cancellation notification for travel plans
   * @param {ObjectId} userId - User ID to send notification to
   * @param {Object} tripData - Trip data
   * @param {boolean} isCreator - Whether the user is the creator of the trip
   * @param {Object} io - Socket.IO instance
   */
  static async createTravelAutoCancelNotification(userId, tripData, isCreator = true, io) {
    const message = isCreator
      ? `Your trip to ${tripData.destination} has been automatically cancelled as it was not activated in time`
      : `A trip to ${tripData.destination} you were part of has been automatically cancelled`;
    
    return this.createNotification({
      userId,
      content: message,
      type: 'travel_auto_cancelled',
      priority: 'medium',
      data: {
        travelHistoryId: tripData._id,
        destination: tripData.destination,
        arrivalDate: tripData.arrivalDate,
        ...(isCreator ? {} : { creatorId: tripData.creatorId._id, creatorName: tripData.creatorId.fullName })
      }
    }, io);
  }

  /**
   * Create trip started notification
   * @param {ObjectId} userId - User ID to send notification to
   * @param {Object} tripData - Trip data
   * @param {Object} io - Socket.IO instance
   */
  static async createTripStartedNotification(userId, tripData, io) {
    return this.createNotification({
      userId,
      content: `Your trip to ${tripData.destination} has started! Have a great journey!`,
      type: 'travel_started',
      priority: 'high',
      data: {
        travelHistoryId: tripData._id,
        destination: tripData.destination,
        arrivalDate: tripData.arrivalDate
      }
    }, io);
  }

  /**
   * Create trip completed notification
   * @param {ObjectId} userId - User ID to send notification to
   * @param {Object} tripData - Trip data
   * @param {Object} io - Socket.IO instance
   */
  static async createTripCompletedNotification(userId, tripData, io) {
    return this.createNotification({
      userId,
      content: `Your trip to ${tripData.destination} has been marked as completed. We hope you had a great time!`,
      type: 'travel_completed',
      priority: 'medium',
      data: {
        travelHistoryId: tripData._id,
        destination: tripData.destination,
        returnDate: tripData.returnDate
      }
    }, io);
  }

  /**
   * Create rating reminder notification
   * @param {ObjectId} userId - User ID to send notification to
   * @param {Object} tripData - Trip data including destination, dates and participants
   * @param {string} tripData.destination - Travel destination
   * @param {Date} tripData.arrivalDate - Date when the trip started
   * @param {Date} tripData.returnDate - Date when the trip ended
   * @param {number} daysSinceReturn - Days since the trip return date
   * @param {boolean} isCreator - Whether the user is the creator of the trip
   * @param {Array} peopleToRate - List of people the user should rate
   * @param {Object} io - Socket.IO instance
   */
  static async createRatingReminderNotification(userId, tripData, daysSinceReturn, isCreator = false, peopleToRate = [], io) {
    // Format dates to DD/MM format
    const formatDate = (date) => {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    };
    
    const arrivalDateFormatted = formatDate(tripData.arrivalDate);
    const returnDateFormatted = formatDate(tripData.returnDate);
    
    // Create different messages based on whether user is creator or participant
    let content = isCreator
      ? `Don't forget to rate your travel companions from your trip to ${tripData.destination} from ${arrivalDateFormatted} to ${returnDateFormatted}!`
      : `Please take a moment to rate your experience with your travel companions to ${tripData.destination} from ${arrivalDateFormatted} to ${returnDateFormatted}!`;

    return this.createNotification({
      userId,
      content,
      type: 'travel_rating_reminder',
      priority: 'medium',
      data: {
        travelHistoryId: tripData._id,
        destination: tripData.destination,
        arrivalDate: tripData.arrivalDate,
        returnDate: tripData.returnDate,
        daysSinceReturn,
        isCreator,
        peopleToRate
      }
    }, io);
  }
}

module.exports = notificationUtils;
