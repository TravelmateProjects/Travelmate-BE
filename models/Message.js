const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Made optional for system messages
  content: { type: String }, // Back to string for content
  messageType: { type: String, enum: ['user', 'system'], default: 'user' }, // Add messageType field
  systemData: { type: mongoose.Schema.Types.Mixed }, // Data for system message localization (optional)
  attachments: [{
    type: { type: String, enum: ['image', 'video', 'file'], required: true }, // Chỉ cho phép 3 loại: image, video, file
    url: String, // URL của file/ảnh trên Cloudinary hoặc nơi khác
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }, // Thời điểm tải ảnh lên (tùy chọn)
  }],
  // readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
