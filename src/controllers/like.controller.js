import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleLikeByTarget = async ({ targetField, targetId, userId }) => {
  const query = {
    [targetField]: targetId,
    likedBy: userId,
  };

  const existingLike = await Like.findOne(query);

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    return { liked: false };
  }

  await Like.create(query);
  return { liked: true };
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const result = await toggleLikeByTarget({
    targetField: "video",
    targetId: videoId,
    userId: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Video liked" : "Video unliked",
      ),
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const result = await toggleLikeByTarget({
    targetField: "comment",
    targetId: commentId,
    userId: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Comment liked" : "Comment unliked",
      ),
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const result = await toggleLikeByTarget({
    targetField: "tweet",
    targetId: tweetId,
    userId: req.user?._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        result.liked ? "Tweet liked" : "Tweet unliked",
      ),
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [likes, totalLikes] = await Promise.all([
    Like.find({ likedBy: req.user?._id, video: { $ne: null } })
      .populate({
        path: "video",
        populate: {
          path: "owner",
          select: "fullName username avatar",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    Like.countDocuments({ likedBy: req.user?._id, video: { $ne: null } }),
  ]);

  const videos = likes.map((like) => like.video).filter(Boolean);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalLikes,
          totalPages: Math.ceil(totalLikes / limitNumber) || 1,
        },
      },
      "Liked videos fetched successfully",
    ),
  );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
