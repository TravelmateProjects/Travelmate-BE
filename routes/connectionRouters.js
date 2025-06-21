const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Gửi yêu cầu kết bạn
router.post('/', verifyToken, connectionController.sendFriendRequest);

// Chấp nhận kết bạn
router.post('/accept', verifyToken, connectionController.acceptFriendRequest);

// Từ chối kết bạn
router.post('/reject', verifyToken, connectionController.rejectFriendRequest);

module.exports = router;
