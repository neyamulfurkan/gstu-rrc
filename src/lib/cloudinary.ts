// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function getSignedUploadParams(
  folder: string,
  publicId?: string
): { signature: string; timestamp: number; cloudName: string; apiKey: string } {
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
  };

  if (publicId) {
    paramsToSign.public_id = publicId;
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string
  );

  return {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
  };
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`[cloudinary] Failed to delete asset ${publicId}:`, error);
  }
}

export function getOptimizedUrl(
  publicId: string,
  width: number,
  height?: number
): string {
  const transformations: Record<string, string | number> = {
    fetch_format: "auto",
    quality: "auto",
    width,
  };

  if (height) {
    transformations.height = height;
    transformations.crop = "fill";
  }

  return cloudinary.url(publicId, transformations);
}

export function getBlurPlaceholder(publicId: string): string {
  const url = cloudinary.url(publicId, {
    width: 10,
    effect: "blur:1000",
    fetch_format: "jpg",
    quality: 10,
  });

  return url;
}