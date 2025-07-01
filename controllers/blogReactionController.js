const BlogReaction = require("../models/BlogReaction");
const Blog = require("../models/Blog");

/**
 * @desc    Tạo hoặc cập nhật cảm xúc (reaction) cho một bài blog
 * @route   POST /api/blog/reactions
 * @access  Private
 */
exports.addOrUpdateBlogReaction = async (req, res) => {
  try {
    const { postId, type } = req.body;
    const userId = req.account.userId;

    // Kiểm tra postId hợp lệ
    if (!postId) {
      return res.status(400).json({ message: "Thiếu postId." });
    }

    const blog = await Blog.findById(postId);
    if (!blog) {
      return res.status(404).json({ message: "Bài viết không tìm thấy." });
    }

    // Tìm phản ứng hiện tại
    let reaction = await BlogReaction.findOne({ postId, userId });

    if (type === null || type === undefined) {
      // Xóa phản ứng nếu type là null
      if (reaction) {
        await BlogReaction.deleteOne({ _id: reaction._id });
        return res
          .status(200)
          .json({ message: "Cảm xúc đã được xóa.", removed: true });
      }
      return res.status(200).json({ message: "Không có cảm xúc để xóa." });
    }

    // Kiểm tra type hợp lệ
    const validTypes = ["like", "love", "kiss", "haha", "wow", "sad", "angry"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Loại cảm xúc không hợp lệ." });
    }

    if (reaction) {
      // Cập nhật type nếu khác
      if (reaction.type !== type) {
        reaction.type = type;
        await reaction.save();
        return res
          .status(200)
          .json({ message: "Cảm xúc đã được cập nhật.", reaction });
      }
      return res
        .status(200)
        .json({ message: "Cảm xúc không thay đổi.", reaction });
    } else {
      // Tạo phản ứng mới
      const newReaction = new BlogReaction({ postId, userId, type });
      await newReaction.save();
      return res
        .status(201)
        .json({ message: "Cảm xúc đã được thêm.", reaction: newReaction });
    }
  } catch (error) {
    console.error("Chi tiết lỗi khi thêm/cập nhật cảm xúc:", error.message);
    res
      .status(500)
      .json({ message: "Lỗi server nội bộ.", error: error.message });
  }
};

/**
 * @desc    Lấy tất cả cảm xúc của một bài blog cụ thể
 * @route   GET /api/blog/reactions/:postId
 * @access  Public
 */
exports.getBlogReactions = async (req, res) => {
  try {
    const { postId } = req.params;

    const blog = await Blog.findById(postId);
    if (!blog) {
      return res.status(404).json({ message: "Bài viết không tìm thấy." });
    }

    const reactions = await BlogReaction.find({ postId }).populate(
      "userId",
      "fullName avatar"
    );

    const reactionCounts = reactions.reduce((acc, reaction) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      message: "Các cảm xúc đã được lấy thành công.",
      reactions,
      reactionCounts,
    });
  } catch (error) {
    console.error("Chi tiết lỗi khi lấy cảm xúc:", error.message);
    res
      .status(500)
      .json({ message: "Lỗi server nội bộ.", error: error.message });
  }
};

/**
 * @desc    Lấy cảm xúc của người dùng hiện tại đối với một bài blog
 * @route   GET /api/blog/reactions/my-reaction/:postId
 * @access  Private
 */
exports.getMyBlogReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.account.userId;

    const reaction = await BlogReaction.findOne({ postId, userId });

    res.status(200).json({
      message: reaction
        ? "Cảm xúc của bạn đã được lấy thành công."
        : "Bạn chưa bày tỏ cảm xúc với bài viết này.",
      reaction,
    });
  } catch (error) {
    console.error(
      "Chi tiết lỗi khi lấy cảm xúc của người dùng:",
      error.message
    );
    res
      .status(500)
      .json({ message: "Lỗi server nội bộ.", error: error.message });
  }
};

/**
 * @desc    Lấy tóm tắt cảm xúc của một bài blog
 * @route   GET /api/blog/reactions/summary/:postId
 * @access  Public
 */
exports.getBlogReactionSummary = async (req, res) => {
  try {
    const { postId } = req.params;

    const blog = await Blog.findById(postId);
    if (!blog) {
      return res.status(404).json({ message: "Bài viết không tìm thấy." });
    }

    const reactions = await BlogReaction.find({ postId });

    const totalReactions = reactions.length;

    const reactionCounts = reactions.reduce((acc, reaction) => {
      acc[reaction.type] = (acc[reaction.type] || 0) + 1;
      return acc;
    }, {});

    const sortedReactions = Object.entries(reactionCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    res.status(200).json({
      message: "Tóm tắt cảm xúc đã được lấy thành công.",
      totalReactions,
      topReactions: sortedReactions,
    });
  } catch (error) {
    console.error("Chi tiết lỗi khi lấy tóm tắt cảm xúc:", error.message);
    res
      .status(500)
      .json({ message: "Lỗi server nội bộ.", error: error.message });
  }
};
