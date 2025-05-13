const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { verifyToken } = require('../middlewares/authMiddleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', verifyToken, blogController.getUserBlogs); // Lấy danh sách bài viết của người dùng
router.get('/:id', verifyToken, blogController.getUserBlogById); // Lấy thông tin bài viết theo ID
router.post('/', verifyToken, upload.array('images', 10), blogController.createUserBlog); // Tạo bài viết mới với nhiều ảnh
router.put('/:id', verifyToken, upload.array('images', 10), blogController.updateUserBlog); // Cập nhật bài viết theo ID
router.delete('/:id', verifyToken, blogController.deleteUserBlog); // Xóa bài viết theo ID

module.exports = router;