const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.put('/updateProfile', userController.updateProfile); // Cập nhật thông tin cá nhân trừ avatar và coverImage

router.put('/updateCoverImage', userController.updateCoverImage);
router.put('/updateAvatar', userController.updateAvatar);

module.exports = router;
