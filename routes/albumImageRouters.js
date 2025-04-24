const express = require('express');
const router = express.Router();
const albumImageController = require('../controllers/albumImageController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// router.post('/upload/:albumId', verifyToken, upload.single('image'), albumImageController.uploadImageToAlbum);
router.post('/upload/:albumId', verifyToken, upload.array('images', 20), albumImageController.uploadMultipleImagesToAlbum);
router.delete('/:imageId', verifyToken, albumImageController.deleteImageFromAlbum);
router.get('/:imageId', verifyToken, albumImageController.getImageById); // ảnh lẻ
router.get('/album/:albumId', verifyToken, albumImageController.getImagesByAlbumId); // get tát cả các ảnh trên album

module.exports = router;