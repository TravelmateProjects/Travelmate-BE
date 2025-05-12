const mongoose = require('mongoose');

const travelHistorySchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  destination: { type: String },
  arrivalDate: { type: Date },
  returnDate: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'inprogress', 'reported'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('TravelHistory', travelHistorySchema); // Cần thì đổi tên
