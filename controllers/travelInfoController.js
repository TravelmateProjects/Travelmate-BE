const TravelInfo = require('../models/TravelInfo');
const User = require('../models/User');

exports.createTravelInfo = async (req, res) => {
    try {
        const userId = req.account.userId; // Updated to use userId from req.account
        const { destination, arrivalDate, returnDate } = req.body;

        // Check if userId already has a TravelInfo
        const existingTravelInfo = await TravelInfo.findOne({ userId });
        if (existingTravelInfo) {
            return res.status(400).json({ message: 'User already has travel info' });
        }

        // Check if returnDate is greater than arrivalDate
        if (new Date(returnDate) <= new Date(arrivalDate)) {
            return res.status(400).json({ message: 'Return date must be greater than arrival date' });
        }

        // Create a new TravelInfo document
        const travelInfo = new TravelInfo({ userId, destination, arrivalDate, returnDate });
        await travelInfo.save();

        // Update the user's travelStatus to true
        await User.findByIdAndUpdate(userId, { travelStatus: true });

        res.status(201).json({ message: 'Travel info created successfully', data: travelInfo });
    } catch (error) {
        res.status(500).json({ message: `Failed to create travel info: ${error.message}` });
    }
};

exports.deleteTravelInfo = async (req, res) => {
    try {
        const userId = req.account?.userId; // Ensure userId is properly accessed

        if (!userId) {
            return res.status(400).json({ message: 'User ID is missing or undefined' });
        }

        // Find and delete all TravelInfo documents for the user
        const deletedTravelInfos = await TravelInfo.deleteMany({ userId });
        if (deletedTravelInfos.deletedCount === 0) {
            return res.status(404).json({ message: 'No travel info found for the user' });
        }

        // Update the user's travelStatus to false
        await User.findByIdAndUpdate(userId, { travelStatus: false });

        res.status(200).json({ message: 'All travel info for the user deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Failed to delete travel info: ${error.message}` });
    }
};

exports.getAllTravelInfo = async (req, res) => {
    try {
        const travelInfos = await TravelInfo.find();
        res.status(200).json({ message: 'All travel info retrieved successfully', data: travelInfos });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve travel info: ${error.message}` });
    }
};

exports.getTravelInfoByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;
        const travelInfo = await TravelInfo.findOne({ userId });
        if (!travelInfo) {
            return res.status(404).json({ message: 'Travel info not found for the user' });
        }
        res.status(200).json({ message: 'Travel info retrieved successfully', data: travelInfo });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve travel info: ${error.message}` });
    }
};

exports.updateTravelInfo = async (req, res) => {
    try {
        const userId = req.account.userId;
        const { destination, arrivalDate, returnDate } = req.body;

        // Check if returnDate is greater than arrivalDate
        if (new Date(returnDate) <= new Date(arrivalDate)) {
            return res.status(400).json({ message: 'Return date must be greater than arrival date' });
        }

        const updatedTravelInfo = await TravelInfo.findOneAndUpdate(
            { userId },
            { destination, arrivalDate, returnDate },
            { new: true }
        );

        if (!updatedTravelInfo) {
            return res.status(404).json({ message: 'Travel info not found for the user' });
        }

        res.status(200).json({ message: 'Travel info updated successfully', data: updatedTravelInfo });
    } catch (error) {
        res.status(500).json({ message: `Failed to update travel info: ${error.message}` });
    }
};