const express = require('express');
const router = express.Router();
const travelInfoController = require('../controllers/travelInfoController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, travelInfoController.getAllTravelInfo); // Lấy tất cả thông tin du lịch
router.get('/:userId', verifyToken, travelInfoController.getTravelInfoByUserId); // Lấy thông tin du lịch theo ID
router.post('/', verifyToken, authorizeRole('user'), travelInfoController.createTravelInfo); // Tạo thông tin du lịch
router.put('/', verifyToken, authorizeRole('user'), travelInfoController.updateTravelInfo); // Cập nhật thông tin du lịch theo ID (ko /userId do có token nếu ko có thì sửa lại)
router.delete('/', verifyToken, authorizeRole('user'), travelInfoController.deleteTravelInfo); // Xóa thông tin du lịch theo ID (ko /userId do có token nếu ko có thì sửa lại)

module.exports = router;