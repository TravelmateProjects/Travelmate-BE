const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  notifyStatus: { type: Boolean, default: false } // đã gửi thông báo cho người dùng hay chưa
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
