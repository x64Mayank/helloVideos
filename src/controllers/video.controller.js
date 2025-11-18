import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  getPublicIdFromCloudinaryUrl,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;
  const allowedSortFields = ["createdAt", "updatedAt", "views", "title"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder = `${sortType}`.toLowerCase() === "asc" ? 1 : -1;

  const filter = {
    ...(userId ? { owner: userId } : {}),
    ...(query
      ? {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        }
      : {}),
  };

  const [videos, totalVideos] = await Promise.all([
    Video.find(filter)
      .populate("owner", "fullName username avatar")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNumber),
    Video.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalVideos,
          totalPages: Math.ceil(totalVideos / limitNumber) || 1,
        },
      },
      "Videos fetched successfully",
    ),
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const [videoUpload, thumbnailUpload] = await Promise.all([
    uploadOnCloudinary(videoFileLocalPath),
    uploadOnCloudinary(thumbnailLocalPath),
  ]);

  if (!videoUpload?.url || !thumbnailUpload?.url) {
    throw new ApiError(400, "Failed to upload video assets");
  }

  const video = await Video.create({
    title: title.trim(),
    description: description.trim(),
    videoFile: videoUpload.url,
    thumbnail: thumbnailUpload.url,
    duration: Number(videoUpload.duration) || 0,
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "fullName username avatar",
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  await Promise.all([
    Video.updateOne({ _id: videoId }, { $inc: { views: 1 } }),
    User.updateOne(
      { _id: req.user?._id },
      { $addToSet: { watchHistory: video._id } },
    ),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;

  if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
    throw new ApiError(400, "At least one field is required for update");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Unauthorized to update this video");
  }

  const updates = {
    ...(title?.trim() ? { title: title.trim() } : {}),
    ...(description?.trim() ? { description: description.trim() } : {}),
  };

  if (thumbnailLocalPath) {
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnailUpload?.url) {
      throw new ApiError(400, "Failed to upload thumbnail");
    }

    // Delete old cloudinary thumbnail before replacing URL in database.
    const oldThumbnailPublicId = getPublicIdFromCloudinaryUrl(video.thumbnail);
    const newThumbnailPublicId = getPublicIdFromCloudinaryUrl(
      thumbnailUpload.url,
    );

    if (oldThumbnailPublicId && oldThumbnailPublicId !== newThumbnailPublicId) {
      await deleteFromCloudinary(oldThumbnailPublicId, {
        resource_type: "image",
      });
    }

    updates.thumbnail = thumbnailUpload.url;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updates },
    { returnDocument: "after" },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Unauthorized to delete this video");
  }

  await Video.deleteOne({ _id: videoId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Unauthorized to update this video");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "Video publish status updated successfully"),
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
