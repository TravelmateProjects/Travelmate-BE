const mongoose = require("mongoose");

const blogCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    commenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    commentText: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogComment", blogCommentSchema);
