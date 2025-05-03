const Rating = require('../models/Rating');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.createRating = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from req.account set by verifyToken middleware
        // console.log('User ID:', userId); // Log the userId for debugging
        const { userIsRated, ratingValue } = req.body;

        // Validate input
        if (!userIsRated || !ratingValue) {
            return res.status(400).json({ message: 'User to be rated and rating value are required.' });
        }

        // Create a new rating
        const newRating = new Rating({ userId, userIsRated, ratingValue });
        await newRating.save();

        // Fetch all ratings for the user being rated
        const userRatings = await Rating.find({ userIsRated });

        // Calculate the average rating
        const totalRatings = userRatings.reduce((sum, rating) => sum + rating.ratingValue, 0);
        const averageRating = totalRatings / userRatings.length;

        // Update the rated user's rate
        await User.findByIdAndUpdate(userIsRated, { rate: averageRating });

        res.status(201).json({ message: 'Rating created and user rate updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while creating the rating.' });
    }
};

