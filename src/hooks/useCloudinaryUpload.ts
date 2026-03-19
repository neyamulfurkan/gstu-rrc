"use client";

import { useState, useCallback } from "react";

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

interface SignedUploadParams {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
}

interface UseCloudinaryUploadReturn {
  upload: (file: File) => Promise<{ url: string; publicId: string }>;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export function useCloudinaryUpload(folder: string): UseCloudinaryUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<{ url: string; publicId: string }> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const signResponse = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder }),
        });

        if (!signResponse.ok) {
          const message =
            signResponse.status === 401
              ? "You must be logged in to upload files."
              : "Failed to get upload credentials.";
          throw new Error(message);
        }

        const params: SignedUploadParams = await signResponse.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", params.apiKey);
        formData.append("timestamp", String(params.timestamp));
        formData.append("signature", params.signature);
        formData.append("folder", folder);

        const result = await new Promise<{ url: string; publicId: string }>(
          (resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (event: ProgressEvent) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setProgress(percent);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data: CloudinaryUploadResponse = JSON.parse(
                    xhr.responseText
                  );
                  resolve({
                    url: data.secure_url,
                    publicId: data.public_id,
                  });
                } catch {
                  reject(new Error("Invalid response from Cloudinary."));
                }
              } else {
                let message = "Upload failed.";
                try {
                  const errData = JSON.parse(xhr.responseText);
                  if (errData?.error?.message) {
                    message = errData.error.message;
                  }
                } catch {
                  // ignore parse error
                }
                reject(new Error(message));
              }
            };

            xhr.onerror = () => {
              reject(new Error("Network error during upload."));
            };

            xhr.onabort = () => {
              reject(new Error("Upload was cancelled."));
            };

            xhr.open(
              "POST",
              `https://api.cloudinary.com/v1_1/${params.cloudName}/auto/upload`
            );
            xhr.send(formData);
          }
        );

        setProgress(100);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [folder]
  );

  return { upload, uploading, progress, error };
}