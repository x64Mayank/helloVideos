import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [comments, totalComments] = await Promise.all([
    Comment.find({ video: videoId })
      .populate("owner", "fullName username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    Comment.countDocuments({ video: videoId }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        comments,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalComments,
          totalPages: Math.ceil(totalComments / limitNumber) || 1,
        },
      },
      "Video comments fetched successfully",
    ),
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Unauthorized to update this comment");
  }

  comment.content = content.trim();
  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Unauthorized to delete this comment");
  }

  await Comment.deleteOne({ _id: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
