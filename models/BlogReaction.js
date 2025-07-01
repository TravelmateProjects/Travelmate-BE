const mongoose = require("mongoose");

const blogReactionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "love", "wow", "haha", "sad", "angry"],
      required: true,
    },
  },
  { timestamps: true }
);

// Đảm bảo mỗi người chỉ phản ứng một lần cho một bài viết
blogReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("BlogReaction", blogReactionSchema);
