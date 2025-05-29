const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  job: { type: String,  },
  phone: { type: String },
  address: { type: String },
  hometown: { type: String },
  cccd: { type: String },
  hobbies: [{ type: String }],
  description: { type: String },
  rate: { type: Number, default: 0 },
  avatar: { 
    url: { type: String },
    publicId: { type: String },
   },       // Ảnh đại diện (URL Cloudinary)
  coverImage: { 
    url: { type: String },
    publicId: { type: String },
   },   // Ảnh bìa (URL Cloudinary)
  travelStatus: { type: Boolean, default: false },
  currentLocation: { type: String },
  payment: { type: String },
  connections: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  }], // Danh sách người dùng đã kết nối(bạn bè)
  title: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
