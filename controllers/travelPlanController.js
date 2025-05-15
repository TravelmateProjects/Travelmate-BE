const TravelPlan = require("../models/TravelPlan");
const TravelHistory = require("../models/TravelHistory");

exports.createTravelPlan = async (req, res) => {
    try {
        const userId = req.account.userId; 
        const { plans, destination, arrivalDate, returnDate } = req.body;

        // Check if returnDate is greater than or equal to arrivalDate
        if (new Date(returnDate) < new Date(arrivalDate)) {
            return res.status(400).json({ message: 'Return date must be greater than or equal to arrival date' });
        }

        // Check if startTime is not later than endTime for each plan
        for (const plan of plans) {
            if (plan.startTime && plan.endTime && plan.startTime > plan.endTime) {
                return res.status(400).json({ message: `Start time cannot be later than end time for activity: ${plan.nameActivity}` });
            }
        }

        // Create a new TravelPlan
        const travelPlan = new TravelPlan({ userId, plans });
        await travelPlan.save();

        // Create a corresponding TravelHistory using the TravelPlan ID
        const travelHistory = new TravelHistory({
            plan: travelPlan._id,
            destination,
            arrivalDate,
            returnDate,
            participants: [userId] // Assuming the creator is the first participant
        });
        await travelHistory.save();

        res.status(201).json({ message: 'Travel plan and history created successfully', data: travelHistory, travelPlan });
    } catch (error) {
        res.status(500).json({ message: `Failed to create travel plan: ${error.message}` });
    }
};

exports.getAllTravelPlans = async (req, res) => {
    try {
        const travelPlans = await TravelPlan.find().populate('userId');
        const travelHistories = await TravelHistory.find().populate('plan');
        res.status(200).json({ message: 'All travel plans and histories retrieved successfully', data: { travelPlans, travelHistories } });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve travel plans: ${error.message}` });
    }
};

exports.getTravelPlanById = async (req, res) => {
    try {
        const { id } = req.params;
        const travelPlan = await TravelPlan.findById(id).populate('userId');
        if (!travelPlan) {
            return res.status(404).json({ message: 'Travel plan not found' });
        }

        const travelHistory = await TravelHistory.findOne({ plan: id }).populate('plan');
        res.status(200).json({ message: 'Travel plan and history retrieved successfully', data: { travelPlan, travelHistory } });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve travel plan: ${error.message}` });
    }
};

exports.getTravelPlansByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const travelPlans = await TravelPlan.find({ userId }).populate('userId');
        const travelHistories = await TravelHistory.find({ participants: userId }).populate('plan');
        res.status(200).json({ message: 'Travel plans and histories retrieved successfully', data: { travelPlans, travelHistories } });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve travel plans: ${error.message}` });
    }
};

exports.updateTravelPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId; // Get the user ID from the request
        const updates = req.body;

        // Find the travel plan to check ownership
        const travelPlan = await TravelPlan.findById(id);
        if (!travelPlan) {
            return res.status(404).json({ message: 'Travel plan not found' });
        }

        // Check if the user is the creator of the travel plan
        if (travelPlan.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to update this travel plan' });
        }

        // Update the travel plan
        const updatedTravelPlan = await TravelPlan.findByIdAndUpdate(id, updates, { new: true });

        // Update corresponding TravelHistory if necessary
        if (updates.destination || updates.arrivalDate || updates.returnDate) {
            await TravelHistory.findOneAndUpdate(
                { plan: id },
                {
                    destination: updates.destination,
                    arrivalDate: updates.arrivalDate,
                    returnDate: updates.returnDate
                },
                { new: true }
            );
        }

        res.status(200).json({ message: 'Travel plan updated successfully', data: updatedTravelPlan });
    } catch (error) {
        res.status(500).json({ message: `Failed to update travel plan: ${error.message}` });
    }
};

exports.deleteTravelPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.account.userId; // Get the user ID from the request

        // Find the travel plan to check ownership
        const travelPlan = await TravelPlan.findById(id);
        if (!travelPlan) {
            return res.status(404).json({ message: 'Travel plan not found' });
        }

        // Check if the user is the creator of the travel plan
        if (travelPlan.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this travel plan' });
        }

        // Delete the travel plan
        await TravelPlan.findByIdAndDelete(id);

        // Delete corresponding TravelHistory
        await TravelHistory.deleteMany({ plan: id });

        res.status(200).json({ message: 'Travel plan and history deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Failed to delete travel plan: ${error.message}` });
    }
};
