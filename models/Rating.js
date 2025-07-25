const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userIsRated: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratingValue: { type: Number, required: true, min: 1, max: 5 },
  travelHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelHistory', required: true }
}, { timestamps: true, collection: 'ratings' });

module.exports = mongoose.model('Rating', ratingSchema);
