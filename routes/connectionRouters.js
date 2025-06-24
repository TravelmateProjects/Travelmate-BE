const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const { verifyToken } = require('../middlewares/authMiddleware');


router.post('/', verifyToken, connectionController.sendFriendRequest);
router.post('/accept', verifyToken, connectionController.acceptFriendRequest);
router.post('/reject', verifyToken, connectionController.rejectFriendRequest);
router.delete('/remove', verifyToken, connectionController.removeFriend);

module.exports = router;
