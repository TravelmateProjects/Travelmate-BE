const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  images: [{ type: String }] // Mảng URL ảnh (Cloudinary hoặc tương đương)
}, { timestamps: true });

module.exports = mongoose.model('UserStatus', userStatusSchema);
