const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, reportController.createReport); // Tạo báo cáo
router.get('/', verifyToken, authorizeRole('admin'), reportController.getAllReports); // Lấy tất cả báo cáo
router.get('/:reportId', verifyToken, authorizeRole('admin'), reportController.getReportById); // Lấy báo cáo theo ID
router.delete('/:reportId', verifyToken, authorizeRole('admin'), reportController.deleteReport); // Xóa báo cáo theo ID

module.exports = router;
