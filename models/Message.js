const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  attachments: [{
    type: { type: String, enum: ['image', 'video', 'file'], required: true }, // Chỉ cho phép 3 loại: image, video, file
    url: String, // URL của file/ảnh trên Cloudinary hoặc nơi khác
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }, // Thời điểm tải ảnh lên (tùy chọn)
  }],
  // readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
