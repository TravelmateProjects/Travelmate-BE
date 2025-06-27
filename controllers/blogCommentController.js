const BlogComment = require("../models/BlogComment");
const Blog = require("../models/Blog"); // Import model Blog để kiểm tra postId hợp lệ

/**
 * @desc    Thêm một bình luận mới vào bài blog
 * @route   POST /api/blog/comments
 * @access  Private
 */
exports.addBlogComment = async (req, res) => {
  try {
    const { postId, commentText } = req.body;
    const commenterId = req.account.userId; // Lấy commenterId từ token đã xác thực

    // Kiểm tra xem postId có hợp lệ không (tồn tại trong DB)
    const blog = await Blog.findById(postId);
    if (!blog) {
      return res.status(404).json({ message: "Bài viết không tìm thấy." });
    }

    const newComment = new BlogComment({ postId, commenterId, commentText });
    await newComment.save();

    res.status(201).json({
      message: "Bình luận đã được thêm thành công.",
      comment: newComment,
    });
  } catch (error) {
    console.error("Lỗi khi thêm bình luận blog:", error);
    res.status(500).json({ message: "Lỗi server nội bộ." });
  }
};

/**
 * @desc    Lấy tất cả bình luận của một bài blog cụ thể
 * @route   GET /api/blog/comments/:postId
 * @access  Public
 */
exports.getBlogComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Kiểm tra xem postId có hợp lệ không
    const blog = await Blog.findById(postId);
    if (!blog) {
      return res.status(404).json({ message: "Bài viết không tìm thấy." });
    }

    const comments = await BlogComment.find({ postId })
      .populate("commenterId", "fullName avatar") // Lấy thông tin người bình luận
      .sort({ createdAt: 1 }); // Sắp xếp bình luận theo thời gian tạo tăng dần

    res.status(200).json({
      message: "Các bình luận đã được lấy thành công.",
      comments,
    });
  } catch (error) {
    console.error("Lỗi khi lấy bình luận blog:", error);
    res.status(500).json({ message: "Lỗi server nội bộ." });
  }
};

/**
 * @desc    Cập nhật một bình luận
 * @route   PUT /api/blog/comments/:commentId
 * @access  Private (Chỉ chủ sở hữu bình luận mới có thể cập nhật)
 */
exports.updateBlogComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { commentText } = req.body;
    const userId = req.account.userId;

    const comment = await BlogComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Bình luận không tìm thấy." });
    }

    // Kiểm tra quyền: chỉ người tạo bình luận mới được cập nhật
    if (comment.commenterId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật bình luận này." });
    }

    comment.commentText = commentText;
    await comment.save();

    res.status(200).json({
      message: "Bình luận đã được cập nhật thành công.",
      comment,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật bình luận blog:", error);
    res.status(500).json({ message: "Lỗi server nội bộ." });
  }
};

/**
 * @desc    Xóa một bình luận
 * @route   DELETE /api/blog/comments/:commentId
 * @access  Private (Chỉ chủ sở hữu bình luận hoặc chủ bài blog mới có thể xóa)
 */
exports.deleteBlogComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.account.userId;

    const comment = await BlogComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Bình luận không tìm thấy." });
    }

    // Lấy bài blog để kiểm tra xem người dùng hiện tại có phải chủ bài blog không
    const blog = await Blog.findById(comment.postId);

    // Kiểm tra quyền: người tạo bình luận hoặc chủ bài blog mới được xóa
    if (
      comment.commenterId.toString() !== userId &&
      blog.userId.toString() !== userId
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa bình luận này." });
    }

    await BlogComment.deleteOne({ _id: commentId });

    res.status(200).json({ message: "Bình luận đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa bình luận blog:", error);
    res.status(500).json({ message: "Lỗi server nội bộ." });
  }
};
