import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;

  const [videoStats, subscribersCount] = await Promise.all([
    Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
        },
      },
    ]),
    Subscription.countDocuments({ channel: channelId }),
  ]);

  const ownerVideos = await Video.find({ owner: channelId }).select("_id");
  const ownerVideoIds = ownerVideos.map((video) => video._id);
  const totalLikes = ownerVideoIds.length
    ? await Like.countDocuments({ video: { $in: ownerVideoIds } })
    : 0;

  const stats = {
    totalVideos: videoStats[0]?.totalVideos || 0,
    totalViews: videoStats[0]?.totalViews || 0,
    totalSubscribers: subscribersCount,
    totalLikes,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ owner: req.user?._id })
    .sort({ createdAt: -1 })
    .select(
      "title description thumbnail views isPublished createdAt updatedAt",
    );

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
