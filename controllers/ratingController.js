const Rating = require('../models/Rating');
const User = require('../models/User');

exports.createRating = async (req, res) => {
    try {
        const userId = req.account.userId;
        const { userIsRated, ratingValue, travelHistoryId } = req.body;

        // Validate input
        if (!userIsRated || !ratingValue || !travelHistoryId) {
            return res.status(400).json({ message: 'userIsRated, ratingValue, and travelHistoryId are required.' });
        }
        if (userId === userIsRated) {
            return res.status(400).json({ message: 'You cannot rate yourself.' });
        }
        if (ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ message: 'ratingValue must be between 1 and 5.' });
        }

        // Check if this user already rated this user for this travelHistoryId
        let rating = await Rating.findOne({ userId, userIsRated, travelHistoryId });
        if (rating) {
            rating.ratingValue = ratingValue;
            await rating.save();
        } else {
            rating = new Rating({ userId, userIsRated, ratingValue, travelHistoryId });
            await rating.save();
        }

        // Fetch all ratings for the user being rated
        const userRatings = await Rating.find({ userIsRated });
        const totalRatings = userRatings.reduce((sum, r) => sum + r.ratingValue, 0);
        const averageRating = userRatings.length > 0 ? totalRatings / userRatings.length : 0;

        // Update the rated user's rate
        await User.findByIdAndUpdate(userIsRated, { rate: averageRating });

        res.status(201).json({ message: 'Rating created/updated and user rate updated successfully.', rating, averageRating });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while creating/updating the rating.' });
    }
};

exports.getMyRatingsInTrip = async (req, res) => {
    try {
        const userId = req.account.userId;
        const { travelHistoryId } = req.params;
        if (!travelHistoryId) {
            return res.status(400).json({ message: 'travelHistoryId is required.' });
        }
        const ratings = await Rating.find({ userId, travelHistoryId });
        res.status(200).json({ ratings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch ratings', error: error.message });
    }
};

