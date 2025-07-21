const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");
const { verifyToken } = require("../middlewares/authMiddleware");
const blogReactionController = require("../controllers/blogReactionController");
const blogCommentController = require("../controllers/blogCommentController");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/all", blogController.getAllBlogs);
router.get("/", verifyToken, blogController.getUserBlogs); // Lấy danh sách bài viết của người dùng
router.get("/:id", verifyToken, blogController.getUserBlogById); // Lấy thông tin bài viết theo ID
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 1 },
  ]),
  blogController.createUserBlog
); // Tạo bài viết mới với nhiều ảnh và một video
router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 1 },
  ]),
  blogController.updateUserBlog
); // Cập nhật bài viết theo ID
router.delete("/:id", verifyToken, blogController.deleteUserBlog); // Xóa bài viết theo ID
router.get("/user/:userId", verifyToken, blogController.getBlogsByUserId); // Lấy danh sách bài viết của một người dùng cụ thể
// === Các Routes Quản Lý Cảm Xúc (Reactions) Của Blog ===
router.post(
  "/reactions",
  verifyToken,
  blogReactionController.addOrUpdateBlogReaction
);
router.get("/reactions/:postId", blogReactionController.getBlogReactions);
router.get(
  "/reactions/my-reaction/:postId",
  verifyToken,
  blogReactionController.getMyBlogReaction
);
router.get(
  "/reactions/summary/:postId",
  blogReactionController.getBlogReactionSummary
);

// === Các Routes Quản Lý Bình Luận (Comments) Của Blog ===
router.post("/comments", verifyToken, blogCommentController.addBlogComment);
router.get("/comments/:postId", blogCommentController.getBlogComments);
router.put(
  "/comments/:commentId",
  verifyToken,
  blogCommentController.updateBlogComment
);
router.delete(
  "/comments/:commentId",
  verifyToken,
  blogCommentController.deleteBlogComment
);

module.exports = router;
