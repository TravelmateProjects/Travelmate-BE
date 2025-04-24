const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put('/updateProfile', verifyToken, userController.updateProfile); // Cập nhật thông tin cá nhân trừ avatar và coverImage
router.put('/updateCoverImage', verifyToken, upload.single('image'), userController.updateCoverImage); // Cập nhật ảnh bìa
router.put('/updateAvatar', verifyToken, upload.single('image'), userController.updateAvatar);

module.exports = router;
