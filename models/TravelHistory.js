const mongoose = require('mongoose');

const travelHistorySchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  destination: { type: String },
  arrivalDate: { type: Date },
  returnDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('TravelHistory', travelHistorySchema);
