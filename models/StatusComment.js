const mongoose = require('mongoose');

const statusCommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserStatus', required: true },
  commenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commentText: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('StatusComment', statusCommentSchema);

