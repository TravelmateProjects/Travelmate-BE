const mongoose = require('mongoose');

const albumImageSchema = new mongoose.Schema({
  albumId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'UserAlbum'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  url: {
    type: String,
    required: true
  },
  publicId: { 
    type: String 
  },
//   caption: {
//     type: String,
//     default: ''
//   },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Tạo index để tối ưu việc truy vấn ảnh trong album theo thời gian
albumImageSchema.index({ albumId: 1, timestamp: 1 });

module.exports = mongoose.model('AlbumImage', albumImageSchema);
