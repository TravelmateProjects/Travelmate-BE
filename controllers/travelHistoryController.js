const TravelHistory = require('../models/TravelHistory');
const User = require('../models/User');

exports.createTravelHistory = async (req, res) => {
    try {
        const { destination, arrivalDate, returnDate, participants, plan } = req.body;
        const creatorId = req.account.userId;
        
        // Validate required fields
        if (!destination || !arrivalDate || !returnDate) {
            return res.status(400).json({
                success: false,
                message: 'Destination, arrival date, and return date are required'
            });
        }
        
        // Prepare participants array, ensuring creator is always included
        let participantsList = participants ? [...participants] : [];
        if (!participantsList.includes(creatorId)) {
            participantsList.push(creatorId);
        }
        
        // Create new travel history object
        const newTravelHistory = new TravelHistory({
            creatorId,
            destination,
            arrivalDate,
            returnDate,
            participants: participantsList, // Creator is always a participant
            plan: plan || null, // Reference to TravelPlan if provided (null if not provided)
            status: 'planing' // Default status for new trips
        });
        
        const savedTravelHistory = await newTravelHistory.save();
        
        res.status(201).json({
            success: true,
            message: 'Travel history created successfully',
            data: savedTravelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to create travel history',
            error: error.message
        });
    }
}

exports.updateTravelHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { destination, arrivalDate, returnDate, status, plan } = req.body; // thêm plan
        const userId = req.account.userId;
        
        const travelHistory = await TravelHistory.findById(id);
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Check if user is authorized to update this record
        if (travelHistory.creatorId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this travel history'
            });
        }
        
        // Update fields if provided
        if (destination) travelHistory.destination = destination;
        if (arrivalDate) travelHistory.arrivalDate = arrivalDate;
        if (returnDate) travelHistory.returnDate = returnDate;
        if (status && ['active', 'completed', 'cancelled', 'inprogress', 'reported', 'planing'].includes(status)) {
            travelHistory.status = status;
        }
        if (plan) travelHistory.plan = plan; // thêm dòng này
        
        const updatedTravelHistory = await travelHistory.save();
        
        res.status(200).json({
            success: true,
            message: 'Travel history updated successfully',
            data: updatedTravelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update travel history',
            error: error.message
        });
    }
}

exports.addParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { participantId } = req.body;
        const userId = req.account.userId;
        
        const travelHistory = await TravelHistory.findById(id);
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Check if user is authorized to update this record
        if (travelHistory.creatorId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this travel history'
            });
        }
        
        // Check if participant exists
        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }
        
        // Check if participant is already added
        if (travelHistory.participants.some(p => p.toString() === participantId)) {
            return res.status(400).json({
                success: false,
                message: 'Participant already added to this trip'
            });
        }
        
        travelHistory.participants.push(participantId);
        const updatedTravelHistory = await travelHistory.save();
        
        res.status(200).json({
            success: true,
            message: 'Participant added successfully',
            data: updatedTravelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to add participant',
            error: error.message
        });
    }
}

exports.removeParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { participantId } = req.body;
        const userId = req.account.userId;
        
        const travelHistory = await TravelHistory.findById(id);
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Check if user is authorized to update this record
        if (travelHistory.creatorId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this travel history'
            });
        }
        
        // Check if participant exists in the trip
        const participantExists = travelHistory.participants.some(p => p.toString() === participantId);
        if (!participantExists) {
            return res.status(400).json({
                success: false,
                message: 'Participant not found in this trip'
            });
        }
        
        // Prevent removing the creator from participants
        if (travelHistory.creatorId.toString() === participantId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove the creator from participants'
            });
        }
        
        travelHistory.participants = travelHistory.participants.filter(p => p.toString() !== participantId);
        const updatedTravelHistory = await travelHistory.save();
        
        res.status(200).json({
            success: true,
            message: 'Participant removed successfully',
            data: updatedTravelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove participant',
            error: error.message
        });
    }
}

exports.getAllUserTravelHistory = async (req, res) => {
    try {
        const userId = req.account.userId;
        
        // Find all travel histories where the user is a participant or creator
        const travelHistories = await TravelHistory.find({ 
            $or: [
                { creatorId: userId },
                { participants: userId }
            ] 
        })
            .sort({ arrivalDate: -1 }) // Sort by arrival date descending
            .populate('participants', 'fullName email avatar')
            .populate('creatorId', 'fullName email avatar')
            .populate({
                path: 'plan',
                select: 'plans', // Only select the plans array from TravelPlan
            });
        
        res.status(200).json({
            success: true,
            count: travelHistories.length,
            data: travelHistories
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to get travel histories',
            error: error.message
        });
    }
}

exports.getTravelHistoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId;
        
        const travelHistory = await TravelHistory.findById(id)
            .populate('participants', 'fullName email avatar gender phone travelStatus currentLocation')
            .populate('creatorId', 'fullName email avatar gender phone')
            .populate({
                path: 'plan',
                select: 'plans', // Only select the plans array from TravelPlan
            });
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Check if user is authorized to view this record
        // User can view if they are the creator or a participant
        const isCreator = travelHistory.creatorId._id.toString() === userId;
        const isParticipant = travelHistory.participants.some(p => 
            p._id && p._id.toString() === userId
        );
        
        if (!isCreator && !isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this travel history'
            });
        }
        
        res.status(200).json({
            success: true,
            data: travelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to get travel history',
            error: error.message
        });
    }
}

exports.cancelTravelHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId;
        
        const travelHistory = await TravelHistory.findById(id);
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Check if user is authorized to cancel/delete this trip
        if (travelHistory.creatorId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to cancel this trip'
            });
        }
        
        // Check if trip is already completed
        if (travelHistory.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel a completed trip'
            });
        }
        
        // For planned trips (future trips), we can delete them
        const currentDate = new Date();
        if (new Date(travelHistory.arrivalDate) > currentDate) {
            await TravelHistory.findByIdAndDelete(id);
            
            return res.status(200).json({
                success: true,
                message: 'Trip successfully deleted'
            });
        }
        
        // For ongoing trips, mark as cancelled
        travelHistory.status = 'cancelled';
        await travelHistory.save();
        
        res.status(200).json({
            success: true,
            message: 'Trip successfully cancelled',
            data: travelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel travel history',
            error: error.message
        });
    }
}

exports.changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.account.userId;
        
        // Validate status
        if (!status || !['active', 'completed', 'cancelled', 'inprogress', 'reported', 'planing'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value. Status must be one of: active, completed, cancelled, inprogress, reported, planing'
            });
        }
        
        const travelHistory = await TravelHistory.findById(id);
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Only creator can change status
        if (travelHistory.creatorId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to change the status of this travel history'
            });
        }
        
        // Validate status transitions
        if (travelHistory.status === 'completed' && status !== 'reported') {
            return res.status(400).json({
                success: false,
                message: 'Completed travel histories can only be changed to reported status'
            });
        }
        
        if (travelHistory.status === 'cancelled' && status !== 'planing') {
            return res.status(400).json({
                success: false,
                message: 'Cancelled travel histories can only be reactivated to planning status'
            });
        }
        
        // Update the status
        travelHistory.status = status;
        const updatedTravelHistory = await travelHistory.save();
        
        res.status(200).json({
            success: true,
            message: 'Travel history status updated successfully',
            data: updatedTravelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update travel history status',
            error: error.message
        });
    }
}

exports.updateTravelNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const userId = req.account.userId;
        
        const travelHistory = await TravelHistory.findById(id);
        
        if (!travelHistory) {
            return res.status(404).json({
                success: false,
                message: 'Travel history not found'
            });
        }
        
        // Check if user is authorized to update notes
        // Allow both creator and participants to add notes
        const isCreator = travelHistory.creatorId.toString() === userId;
        const isParticipant = travelHistory.participants.some(p => 
            p.toString() === userId
        );
        
        if (!isCreator && !isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update notes for this travel history'
            });
        }
        
        // Update notes
        travelHistory.notes = notes;
        const updatedTravelHistory = await travelHistory.save();
        
        res.status(200).json({
            success: true,
            message: 'Travel notes updated successfully',
            data: updatedTravelHistory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to update travel notes',
            error: error.message
        });
    }
}

exports.getAllTravelHistories = async (req, res) => {
    try {
        // Get parameters from query string
        const { 
            status,        // Trip status (active, completed, cancelled, inprogress, reported, planing)
            sort,          // Sort option (destination: by location name, date: by arrival date, default: by creation date)
            page = 1,      // Current page number, defaults to 1
            limit = 10,    // Number of records per page, defaults to 10
            destination,   // Optional filter by destination
            dateFrom,      // Optional filter for arrival date range start
            dateTo         // Optional filter for arrival date range end
        } = req.query;
        
        const query = {}; // Object containing search conditions
        
        // Filter by status if provided
        if (status && ['active', 'completed', 'cancelled', 'inprogress', 'reported', 'planing'].includes(status)) {
            query.status = status; // Add status filter condition
        }
        
        // Filter by destination if provided (case-insensitive partial match)
        if (destination) {
            query.destination = { $regex: destination, $options: 'i' };
        }
        
        // Filter by date range if provided
        if (dateFrom || dateTo) {
            query.arrivalDate = {};
            if (dateFrom) query.arrivalDate.$gte = new Date(dateFrom);
            if (dateTo) query.arrivalDate.$lte = new Date(dateTo);
        }
        
        // Calculate pagination - Calculate number of records to skip for pagination
        // Example: page=1, limit=10 => skip=0 (skip no records)
        //          page=2, limit=10 => skip=10 (skip first 10 records)
        //          page=3, limit=10 => skip=20 (skip first 20 records)
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Determine sort order
        let sortOptions = { createdAt: -1 }; // Default: sort by creation date (newest first)
        if (sort === 'destination') sortOptions = { destination: 1 }; // Sort by destination name (A-Z)
        if (sort === 'date') sortOptions = { arrivalDate: 1 }; // Sort by arrival date (oldest to newest)
        if (sort === 'dateDesc') sortOptions = { arrivalDate: -1 }; // Sort by arrival date (newest to oldest)
        
        // Query database with configured parameters
        const travelHistories = await TravelHistory.find(query)
            .sort(sortOptions)      // Sort results based on sortOptions
            .skip(skip)             // Skip records based on current page
            .limit(parseInt(limit)) // Limit number of returned results
            .populate('creatorId', 'fullName email avatar')       // Get creator information
            .populate('participants', 'fullName email avatar')    // Get participants information
            .populate({
                path: 'plan',
                select: 'plans',    // Only select the plans array from TravelPlan
            });
        
        // Count total records matching the query (without limit constraint)
        const totalRecords = await TravelHistory.countDocuments(query);
        
        // Return results with pagination information
        res.status(200).json({
            success: true,
            count: travelHistories.length,           // Number of records in current page
            totalRecords,                            // Total number of records found
            totalPages: Math.ceil(totalRecords / parseInt(limit)), // Total number of pages
            currentPage: parseInt(page),             // Current page number
            data: travelHistories                    // Travel history data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to get travel histories',
            error: error.message
        });
    }
}