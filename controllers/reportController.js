const Report = require('../models/Report');

exports.createReport = async (req, res) => {
    try {
        const userId = req.account.userId; // Extract userId from req.account
        const report = new Report({ ...req.body, userId });
        await report.save();
        res.status(201).json({ message: 'Report created successfully', data: report });
    } catch (error) {
        res.status(400).json({ message: `Failed to create report: ${error.message}` });
    }
};

exports.getAllReports = async (req, res) => {
    try {
        const reports = await Report.find();
        res.status(200).json({ message: 'Reports retrieved successfully', data: reports });
    } catch (error) {
        res.status(500).json({ message: `Failed to retrieve reports: ${error.message}` });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.reportId); // Use req.params.reportId to match the route
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
        const report = await Report.findByIdAndDelete(req.params.reportId); // Find and delete the report by ID
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Failed to delete report: ${error.message}` });
    }
};