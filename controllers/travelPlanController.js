const TravelPlan = require("../models/TravelPlan");
const TravelHistory = require("../models/TravelHistory");

exports.createTravelPlan = async (req, res) => {
    try {
        const userId = req.account.userId;
        const { title, destination, arrivalDate, returnDate, plans, shareWith } = req.body;

        // Kiểm tra các trường bắt buộc
        if (!destination || !arrivalDate || !returnDate || !plans || !Array.isArray(plans)) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if returnDate is greater than or equal to arrivalDate
        if (new Date(returnDate) < new Date(arrivalDate)) {
            return res.status(400).json({ message: 'Return date must be greater than or equal to arrival date' });
        }

        // Check if startTime is not later than endTime for each plan
        for (const plan of plans) {
            if (plan.startTime && plan.endTime && plan.startTime > plan.endTime) {
                return res.status(400).json({ message: `Start time cannot be later than end time for activity: ${plan.activityName}` });
            }
        }

        // Tạo mới TravelPlan với đầy đủ trường
        const travelPlan = new TravelPlan({
            userId,
            title,
            destination,
            arrivalDate,
            returnDate,
            plans,
            shareWith: shareWith || []
        });
        await travelPlan.save();

        res.status(201).json({ message: 'Travel plan created successfully', data: travelPlan });
    } catch (error) {
        res.status(500).json({ message: `Failed to create travel plan: ${error.message}` });
    }
};

exports.getAllTravelPlans = async (req, res) => {
    try {
        const plans = await TravelPlan.find()
            .populate('userId', 'fullName email avatar')
            .populate('shareWith', 'fullName email avatar');
        res.json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to get travel plans', error: err.message });
    }
};

exports.getTravelPlanById = async (req, res) => {
    try {
        const plan = await TravelPlan.findById(req.params.id)
            .populate('userId', 'fullName email avatar')
            .populate('shareWith', 'fullName email avatar');
        if (!plan) return res.status(404).json({ success: false, message: 'Travel plan not found' });
        res.json({ success: true, data: plan });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to get travel plan', error: err.message });
    }
};

exports.getTravelPlansByUserId = async (req, res) => {
    try {
        const plans = await TravelPlan.find({ userId: req.params.userId })
            .populate('userId', 'fullName email avatar')
            .populate('shareWith', 'fullName email avatar');
        res.json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to get user travel plans', error: err.message });
    }
};

exports.updateTravelPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, destination, arrivalDate, returnDate, plans, shareWith } = req.body;
        const plan = await TravelPlan.findById(id);
        if (!plan) return res.status(404).json({ success: false, message: 'Travel plan not found' });

        // Only owner can update
        if (plan.userId.toString() !== req.account.userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (title !== undefined) plan.title = title;
        if (destination !== undefined) plan.destination = destination;
        if (arrivalDate !== undefined) plan.arrivalDate = arrivalDate;
        if (returnDate !== undefined) plan.returnDate = returnDate;
        if (plans !== undefined) plan.plans = plans;
        if (shareWith !== undefined) plan.shareWith = shareWith;

        const updatedPlan = await plan.save();
        res.json({ success: true, message: 'Travel plan updated', data: updatedPlan });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update travel plan', error: err.message });
    }
};

exports.deleteTravelPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await TravelPlan.findById(id);
        if (!plan) return res.status(404).json({ success: false, message: 'Travel plan not found' });

        // Only owner can delete
        if (plan.userId.toString() !== req.account.userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await TravelPlan.findByIdAndDelete(id);
        res.json({ success: true, message: 'Travel plan deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete travel plan', error: err.message });
    }
};

// Chia sẻ kế hoạch cho người khác
exports.shareTravelPlan = async (req, res) => {
    try {
        const { id } = req.params; // id của TravelPlan
        const { userIds } = req.body; // mảng userId muốn share

        const plan = await TravelPlan.findById(id);
        if (!plan) return res.status(404).json({ success: false, message: 'Travel plan not found' });

        // Chỉ chủ sở hữu mới được chia sẻ
        if (plan.userId.toString() !== req.account.userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Thêm userIds vào shareWith (không trùng lặp)
        plan.shareWith = Array.from(new Set([...plan.shareWith.map(id => id.toString()), ...userIds]));
        await plan.save();

        res.json({ success: true, message: 'Travel plan shared successfully', data: plan });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to share travel plan', error: err.message });
    }
};

// Lấy các kế hoạch được chia sẻ với user hiện tại
exports.getSharedTravelPlans = async (req, res) => {
    try {
        console.log('getSharedTravelPlans called');
        console.log('req.account:', req.account);
        
        if (!req.account || !req.account.userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'User ID not found in token' 
            });
        }
        
        const userId = req.account.userId;
        console.log('Looking for plans shared with userId:', userId);
        
        const plans = await TravelPlan.find({ shareWith: userId })
            .populate('userId', 'fullName email avatar')
            .populate('shareWith', 'fullName email avatar');
            
        console.log('Found plans:', plans.length);
        res.json({ success: true, data: plans });
    } catch (err) {
        console.error('Error in getSharedTravelPlans:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get shared travel plans', 
            error: err.message 
        });
    }
};
