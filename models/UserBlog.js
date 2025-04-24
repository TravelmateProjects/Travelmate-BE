const mongoose = require('mongoose');

const userBlogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  address: String, // Địa chỉ nơi người dùng đã đến (tùy chọn) vị trí đăng bài viết
  images: [{
    url: String, // URL của ảnh trên Cloudinary hoặc nơi khác
    publicId: { type: String },
    // caption: String, // Mô tả cho ảnh (tùy chọn)
    // altText: String, // Văn bản thay thế cho ảnh (tùy chọn, tốt cho SEO và trợ năng)
    // location: { type: [Number], index: '2dsphere' }, // Vị trí địa lý của ảnh (tùy chọn)
    uploadedAt: { type: Date, default: Date.now }, // Thời điểm tải ảnh lên (tùy chọn)
  }],
}, { timestamps: true });

module.exports = mongoose.model('UserBlog', userBlogSchema);
