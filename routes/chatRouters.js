const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// router.get('/', chatController.getAllChatRooms); // Lấy danh sách tất cả phòng chat(test)
router.get('/', verifyToken, authorizeRole('user'), chatController.getChatRooms); // Lấy danh sách phòng chat người dùng
router.get('/:id', verifyToken, authorizeRole('user'), chatController.getChatRoomById); // Lấy thông tin phòng chat theo ID
router.post('/', verifyToken, authorizeRole('user'), chatController.createChatRoom); // Tạo phòng chat mới
router.post('/chatAi', verifyToken, authorizeRole('user'), chatController.handleChatAI); // chat AI
router.post('/clear-chat-ai', verifyToken, authorizeRole('user'), chatController.clearChatAI); // clear conversation AI
router.post('/:id/travelhistory', verifyToken, authorizeRole('user'), chatController.createTravelHistory); // Tạo chuyến du lịch mới với id
router.post('/:id/message', verifyToken, authorizeRole('user'), upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 2 }, { name: 'files', maxCount: 2 } ]), chatController.sendMessage); // Gửi tin nhắn trong phòng chat (image/video/file là tùy chọn)
router.get('/:id/messages', verifyToken, authorizeRole('user'), chatController.getMessages); // Lấy danh sách tin nhắn trong phòng chat
router.post('/:id/leave', verifyToken, authorizeRole('user'), chatController.leaveChatRoom); // Rời khỏi phòng chat
router.delete('/:id', verifyToken, authorizeRole('user'), chatController.deleteChatRoom); // Xóa phòng chat theo ID (chỉ chủ phòng)
router.delete('/:id/message/:messageId', verifyToken, authorizeRole('user'), chatController.deleteMessage); // Xóa tin nhắn theo ID
router.post('/:id/add-participant', verifyToken, authorizeRole('user'), chatController.addParticipant); // Thêm người vào chatroom
router.post('/:id/remove-participant', verifyToken, authorizeRole('user'), chatController.removeParticipant); // Kick người khỏi chatroom

module.exports = router;
