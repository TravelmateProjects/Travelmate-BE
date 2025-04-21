const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  name: { type: String, default: null }, // nếu chat 1-1 thì sẽ lấy tên của ngươi còn lại làm tên room (tự xử lý trên fronend)
  isGroup: { type: Boolean, required: true, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
