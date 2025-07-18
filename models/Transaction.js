const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  sessionId: { type: String, required: true }, // Stripe session id
  plan: { type: String, enum: ['month', 'year'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'vnd' },
  status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: { type: String }, // e.g. 'card'
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema); 