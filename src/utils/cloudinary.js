import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    return response;
  } catch (error) {
    console.error("Error uploading file to cloudinary:", error.message);
    return null;
  } finally {
    try {
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath);
      }
    } catch (cleanupError) {
      console.error("Failed to cleanup temp file:", cleanupError.message);
    }
  }
};

const getPublicIdFromCloudinaryUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const urlObj = new URL(url);
    const segments = urlObj.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.findIndex((segment) => segment === "upload");

    if (uploadIndex === -1 || uploadIndex + 1 >= segments.length) {
      return null;
    }

    // Cloudinary URL format: /<resource_type>/upload/(transforms)/v<version>/<public_id>.<ext>
    const publicIdParts = segments.slice(uploadIndex + 1).filter((segment) => {
      return !segment.startsWith("v") && !segment.includes(",");
    });

    if (!publicIdParts.length) return null;

    const lastPart = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = lastPart.replace(/\.[^/.]+$/, "");

    return publicIdParts.join("/");
  } catch {
    return null;
  }
};

const deleteFromCloudinary = async (publicId, options = {}) => {
  if (!publicId) return null;

  try {
    return await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      ...options,
    });
  } catch (error) {
    console.error("Error deleting file from cloudinary:", error.message);
    return null;
  }
};

export { uploadOnCloudinary, getPublicIdFromCloudinaryUrl, deleteFromCloudinary };
