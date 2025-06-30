const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorizeRole } = require('../middlewares/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put('/updateProfile', verifyToken, userController.updateProfile); // Cập nhật thông tin cá nhân trừ avatar và coverImage
router.put('/updateCoverImage', verifyToken, upload.single('image'), userController.updateCoverImage); // Cập nhật ảnh bìa
router.put('/updateAvatar', verifyToken, upload.single('image'), userController.updateAvatar);
router.put('/updateTravelStatus', verifyToken, userController.updateTravelStatus); // Cập nhật trạng thái du lịch

router.get('/getAllUsers', verifyToken, authorizeRole('admin'), userController.getAllUsers); // Lấy tất cả người dùng
router.get('/getUserById/:userId', verifyToken, userController.getUserById); // Lấy thông tin người dùng theo ID (tạm thời dùng chung)
router.put('/updateUserTitle', verifyToken, authorizeRole('admin'), userController.updateUserTitle); // Cập nhật title người dùng 
router.put('/lockUser/:userId', verifyToken, authorizeRole('admin'), userController.lockUser); // Khóa người dùng
router.put('/unlockUser/:userId', verifyToken, authorizeRole('admin'), userController.unlockUser); // Mở khóa người dùng
router.post('/getManyByIds', verifyToken, userController.getManyByIds); // Lấy nhiều user theo mảng userId

module.exports = router;
