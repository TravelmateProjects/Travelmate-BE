const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
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
  
  //Todo: Làm sao để có thể cài tiến cho actor như công ty tour có thể đăng bài quảng cáo.
  isAd: { type: Boolean, default: false }, // Gắn cờ nếu là bài quảng cáo
  adTargetUrl: { type: String }, // URL đích nếu là quảng cáo
  videos:[{
    url: String, // URL của video trên Cloudinary hoặc nơi khác
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now }, // Thời điểm tải video lên (tùy chọn)
  }],
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
