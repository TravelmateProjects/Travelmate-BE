const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['chat', 'connection_request', 'travel_match', 'blog_like', 'rating', 'system'], 
    required: true 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of related object (chatId, userId, blogId, etc.)
  relatedModel: { type: String, enum: ['ChatRoom', 'User', 'Blog', 'TravelPlan'] }, // Model of related object
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isRead: { type: Boolean, default: false }, // whether user has read the notification
  notifyStatus: { type: Boolean, default: false }, // whether realtime notification has been sent
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // sender of notification (if any)
  data: { type: mongoose.Schema.Types.Mixed } // additional data for FE
}, { timestamps: true });

// Index for query optimization
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ notifyStatus: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
