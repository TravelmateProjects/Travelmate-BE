const mongoose = require('mongoose');

const travelInfoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: { type: String },
  arrivalDate: { type: Date },
  returnDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('TravelInfo', travelInfoSchema);
