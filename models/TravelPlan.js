const mongoose = require('mongoose');

const TravelPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // destination: { type: String, required: true },
    // arrivalDate: { type: Date, required: true },
    // returnDate: { type: Date, required: true },
    plans: [
        {
            nameActivity: { type: String, required: true },
            description: String,
            location: String,
            price: Number,
            date: { type: Date, required: true },
            startTime: String,
            endTime: String,
            note: String
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('TravelPlan', TravelPlanSchema);
