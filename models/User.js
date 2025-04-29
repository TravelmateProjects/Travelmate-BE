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
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách người dùng đã kết nối(bạn bè)
  title: { type: String }
}, { timestamps: true });

// const updateAvatar = async (userId, newAvatarUrl) => {
//   try {
//     const user = await User.findByIdAndUpdate(
//       userId,
//       { avatar: newAvatarUrl },
//       { new: true } // Return the updated document
//     );

//     if (!user) {
//       throw new Error('User not found');
//     }

//     return user;
//   } catch (error) {
//     console.error('Error updating avatar:', error);
//     throw error;
//   }
// };

module.exports = mongoose.model('User', userSchema);
// module.exports.updateAvatar = updateAvatar;
