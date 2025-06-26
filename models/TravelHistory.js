const mongoose = require('mongoose');

const travelHistorySchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người tạo chuyến sử du lịch
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelPlan' }, // Tham chiếu đến TravelPlan (không bắt buộc)
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // Danh sách người tham gia chuyến du lịch
  destination: { type: String, required: true }, // Địa điểm du lịch
  arrivalDate: { type: Date, required: true }, // Ngày đến
  returnDate: { type: Date, required: true }, // Ngày trở về
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'inprogress', 'reported', 'planing'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('TravelHistory', travelHistorySchema); // Cần thì đổi tên
