const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const noteSchema = new mongoose.Schema({
  text: { type: String },
  images: [imageSchema],
  createdAt: { type: Date, default: Date.now }
});

const expenseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  // category: { type: String },
  description: { type: String }
});

const travelHistorySchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người tạo chuyến sử du lịch
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelPlan' }, // Tham chiếu đến TravelPlan (không bắt buộc)
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // Danh sách người tham gia chuyến du lịch
  destination: { type: String, required: true }, // Địa điểm du lịch
  arrivalDate: { type: Date, required: true }, // Ngày đến
  returnDate: { type: Date, required: true }, // Ngày trở về
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'inprogress', 'reported', 'planing'], default: 'active' },
  notes: [noteSchema], // Chuyển từ string thành mảng các note có text và ảnh
  expenses: [expenseSchema], // Thêm mảng chi tiêu
}, { timestamps: true });

module.exports = mongoose.model('TravelHistory', travelHistorySchema); // Cần thì đổi tên
