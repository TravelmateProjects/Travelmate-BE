const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  images: [{
    url: String, // URL của ảnh trên Cloudinary hoặc nơi khác
    // caption: String, // Mô tả cho ảnh (tùy chọn)
    // altText: String, // Văn bản thay thế cho ảnh (tùy chọn, tốt cho SEO và trợ năng)
    // location: { type: [Number], index: '2dsphere' }, // Vị trí địa lý của ảnh (tùy chọn)
    uploadedAt: { type: Date, default: Date.now }, // Thời điểm tải ảnh lên (tùy chọn)
  }],
  // Các trường khác của UserStatus
}, { timestamps: true });

module.exports = mongoose.model('UserStatus', userStatusSchema);
