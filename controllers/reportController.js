const Report = require('../models/Report');

exports.createReport = async (req, res) => {
    try {
        const userId = req.account.userId;
        const { userIsReported, titleReport, description, travelHistoryId } = req.body;
        if (!userIsReported || !travelHistoryId) {
            return res.status(400).json({ message: 'userIsReported and travelHistoryId are required.' });
        }
        if (userId === userIsReported) {
            return res.status(400).json({ message: 'You cannot report yourself.' });
        }
        // Only allow one report per (userId, userIsReported, travelHistoryId)
        const existing = await Report.findOne({ userId, userIsReported, travelHistoryId });
        if (existing) {
            return res.status(400).json({ message: 'You have already reported this user for this trip.' });
        }
        const report = new Report({ userId, userIsReported, titleReport, description, travelHistoryId });
        await report.save();
        res.status(201).json({ message: 'Report created successfully', data: report });
    } catch (error) {
        res.status(400).json({ message: `Failed to create report: ${error.message}` });
    }
};

exports.getAllReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('userId', 'fullName email')
            .populate('userIsReported', 'fullName email')
            .populate('travelHistoryId', 'destination arrivalDate returnDate');
        res.status(200).json({ message: 'Reports retrieved successfully', data: reports });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve reports: ${error.message}` });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.reportId)
            .populate('userId', 'fullName email')
            .populate('userIsReported', 'fullName email')
            .populate('travelHistoryId', 'destination arrivalDate returnDate');
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.status(200).json({ message: 'Report retrieved successfully', data: report });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve report: ${error.message}` });
    }
};

exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findByIdAndDelete(req.params.reportId);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Failed to delete report: ${error.message}` });
    }
};