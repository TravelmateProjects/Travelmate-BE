const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: Date },
  job: { type: String,  },
  phone: { type: String },
  address: { type: String },
  hometown: { type: String },
  cccd: { type: String },
  hobbies: [{ type: String }],
  description: { type: String },
  rate: { type: Number, default: 0 },
  avatar: { type: String },       // Ảnh đại diện (URL Cloudinary)
  coverImage: { type: String },   // Ảnh bìa (URL Cloudinary)
  travelStatus: { type: Boolean, default: false },
  currentLocation: { type: String },
  payment: { type: String },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách người dùng đã kết nối(bạn bè)
  title: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
