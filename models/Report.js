const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userIsReported: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  titleReport: { type: String },
  description: { type: String },
  travelHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelHistory', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
