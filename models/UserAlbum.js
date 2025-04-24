const mongoose = require('mongoose');

const userAlbumSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  albumName: {
    type: String,
    required: true
  },
  // description: {
  //   type: String,
  //   default: ''
  // },
  // coverImage: { // coverImage = await AlbumImage.findOne({ albumId }).sort({ timestamp: 1 }); // ảnh đầu tiên làm cover
  //   imageId: {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: 'AlbumImage',
  //     default: null
  //   },
  //   imageUrl: {
  //     type: String,
  //     default: null
  //   }
  // }
}, { timestamps: true });

module.exports = mongoose.model('UserAlbum', userAlbumSchema);

