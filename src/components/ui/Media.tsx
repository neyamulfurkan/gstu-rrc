// src/components/ui/Media.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Upload, X, Play, ImageIcon } from "lucide-react";

import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { Alert, ProgressBar } from "@/components/ui/Feedback";
import { cn } from "@/lib/utils";

// ─── FileUpload ───────────────────────────────────────────────────────────────

interface FilePreview {
  file: File;
  objectUrl: string;
  error?: string;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  onFiles: (files: File[]) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export function FileUpload({
  accept,
  multiple = false,
  maxSizeMb = 10,
  onFiles,
  className,
  label = "Click to upload or drag and drop",
  disabled = false,
}: FileUploadProps): JSX.Element {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewsRef = useRef<FilePreview[]>([]);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.objectUrl));
    };
  }, []);

  const validateAndProcess = useCallback(
    (files: FileList | File[]) => {
      setGlobalError(null);
      const fileArray = Array.from(files);

      if (!multiple && fileArray.length > 1) {
        setGlobalError("Only one file is allowed.");
        return;
      }

      const acceptedTypes = accept
        ? accept.split(",").map((t) => t.trim())
        : [];

      const newPreviews: FilePreview[] = fileArray.map((file) => {
        let error: string | undefined;

        if (acceptedTypes.length > 0) {
          const matched = acceptedTypes.some((type) => {
            if (type.endsWith("/*")) {
              return file.type.startsWith(type.replace("/*", "/"));
            }
            return file.type === type || file.name.endsWith(type);
          });
          if (!matched) {
            error = `File type "${file.type || file.name.split(".").pop()}" is not allowed.`;
          }
        }

        const maxBytes = maxSizeMb * 1024 * 1024;
        if (!error && file.size > maxBytes) {
          error = `File exceeds the maximum size of ${maxSizeMb} MB.`;
        }

        return {
          file,
          objectUrl: URL.createObjectURL(file),
          error,
        };
      });

      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.objectUrl));
        return newPreviews;
      });

      const validFiles = newPreviews
        .filter((p) => !p.error)
        .map((p) => p.file);

      if (validFiles.length > 0) {
        onFiles(validFiles);
      }
    },
    [accept, maxSizeMb, multiple, onFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndProcess(e.dataTransfer.files);
      }
    },
    [disabled, validateAndProcess]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndProcess(e.target.files);
      }
      e.target.value = "";
    },
    [validateAndProcess]
  );

  const removePreview = useCallback((index: number) => {
    setPreviews((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].objectUrl);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload area"
        aria-disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3",
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
          isDragOver
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50 bg-[var(--color-bg-surface)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload
          size={32}
          className="text-[var(--color-text-secondary)]"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {accept
              ? `Accepted: ${accept}`
              : "All file types accepted"}
            {maxSizeMb ? ` · Max ${maxSizeMb} MB` : ""}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {globalError && (
        <Alert
          variant="error"
          message={globalError}
          dismissible
          onDismiss={() => setGlobalError(null)}
          className="mt-2"
        />
      )}

      {previews.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected files">
          {previews.map((preview, index) => (
            <li
              key={`${preview.file.name}-${index}`}
              className={cn(
                "relative flex items-center gap-2 rounded-lg border p-2",
                preview.error
                  ? "border-[var(--color-error)]/40 bg-[var(--color-error)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
              )}
            >
              {preview.file.type.startsWith("image/") ? (
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={preview.objectUrl}
                    alt={preview.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[var(--color-bg-surface)]">
                  <ImageIcon
                    size={18}
                    className="text-[var(--color-text-secondary)]"
                    aria-hidden="true"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="max-w-[140px] truncate text-xs font-medium text-[var(--color-text-primary)]">
                  {preview.file.name}
                </p>
                {preview.error ? (
                  <p className="text-xs text-[var(--color-error)]">
                    {preview.error}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {(preview.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePreview(index);
                }}
                aria-label={`Remove ${preview.file.name}`}
                className={cn(
                  "flex-shrink-0 rounded p-0.5 text-[var(--color-text-secondary)]",
                  "hover:text-[var(--color-error)] transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                )}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── ImageCropper ─────────────────────────────────────────────────────────────

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageCropperProps {
  imgSrc: string;
  aspectRatio: number;
  onCrop: (file: File) => void;
  onCancel: () => void;
  className?: string;
}

export function ImageCropper({
  imgSrc,
  aspectRatio,
  onCrop,
  onCancel,
  className,
}: ImageCropperProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    mode: "move" | "draw";
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    mode: "draw",
  });

  const CANVAS_MAX = 600;

  const drawOverlay = useCallback(
    (rect: CropRect) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, overlay.width, overlay.height);

      ctx.clearRect(rect.x, rect.y, rect.w, rect.h);

      ctx.strokeStyle = "var(--color-accent, #00E5FF)";
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      const third = rect.w / 3;
      const thirdH = rect.h / 3;
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(rect.x + third * i, rect.y);
        ctx.lineTo(rect.x + third * i, rect.y + rect.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rect.x, rect.y + thirdH * i);
        ctx.lineTo(rect.x + rect.w, rect.y + thirdH * i);
        ctx.stroke();
      }
    },
    []
  );

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;

      const scale = Math.min(CANVAS_MAX / img.width, CANVAS_MAX / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      overlay.width = canvas.width;
      overlay.height = canvas.height;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let initW = canvas.width * 0.8;
      let initH = initW / aspectRatio;
      if (initH > canvas.height * 0.8) {
        initH = canvas.height * 0.8;
        initW = initH * aspectRatio;
      }
      const initX = (canvas.width - initW) / 2;
      const initY = (canvas.height - initH) / 2;
      const initialRect = {
        x: Math.floor(initX),
        y: Math.floor(initY),
        w: Math.floor(initW),
        h: Math.floor(initH),
      };
      setCropRect(initialRect);
      drawOverlay(initialRect);
      setImageLoaded(true);
    };
    img.onerror = () => setError("Failed to load image.");
    img.src = imgSrc;
  }, [imgSrc, aspectRatio, drawOverlay]);

  const getRelativePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const rect = overlayRef.current!.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const clampRect = useCallback(
    (r: CropRect, canvasW: number, canvasH: number): CropRect => {
      let { x, y, w, h } = r;
      if (w < 20) w = 20;
      if (h < 20) h = 20;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + w > canvasW) x = canvasW - w;
      if (y + h > canvasH) y = canvasH - h;
      return { x, y, w, h };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getRelativePos(e);
      const inside =
        pos.x >= cropRect.x &&
        pos.x <= cropRect.x + cropRect.w &&
        pos.y >= cropRect.y &&
        pos.y <= cropRect.y + cropRect.h;

      dragState.current = {
        dragging: true,
        startX: pos.x,
        startY: pos.y,
        offsetX: pos.x - cropRect.x,
        offsetY: pos.y - cropRect.y,
        mode: inside ? "move" : "draw",
      };
    },
    [cropRect, getRelativePos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState.current.dragging) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const pos = getRelativePos(e);
      const { mode, startX, startY, offsetX, offsetY } = dragState.current;

      let newRect: CropRect;

      if (mode === "move") {
        newRect = clampRect(
          {
            x: pos.x - offsetX,
            y: pos.y - offsetY,
            w: cropRect.w,
            h: cropRect.h,
          },
          overlay.width,
          overlay.height
        );
      } else {
        const rawW = pos.x - startX;
        const rawH = rawW / aspectRatio;
        const x = rawW >= 0 ? startX : startX + rawW;
        const y = rawH >= 0 ? startY : startY + rawH;
        newRect = clampRect(
          {
            x,
            y,
            w: Math.abs(rawW),
            h: Math.abs(rawH),
          },
          overlay.width,
          overlay.height
        );
      }

      setCropRect(newRect);
      drawOverlay(newRect);
    },
    [aspectRatio, clampRect, cropRect.h, cropRect.w, drawOverlay, getRelativePos]
  );

  const handleMouseUp = useCallback(() => {
    dragState.current.dragging = false;
  }, []);

  const handleCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = Math.round(cropRect.w * scaleX);
    outputCanvas.height = Math.round(cropRect.h * scaleY);
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropRect.w * scaleX,
      cropRect.h * scaleY,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height
    );

    outputCanvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to crop image.");
          return;
        }
        const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
        onCrop(file);
      },
      "image/jpeg",
      0.92
    );
  }, [cropRect, onCrop]);

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {error && <Alert variant="error" message={error} />}
      <div className="relative select-none overflow-hidden rounded-lg border border-[var(--color-border)]">
        <canvas ref={canvasRef} className="block max-w-full" />
        <canvas
          ref={overlayRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            "absolute inset-0 block max-w-full",
            imageLoaded ? "cursor-crosshair" : "cursor-wait"
          )}
        />
        {!imageLoaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-surface)]">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Loading image…
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Drag inside the box to move · Drag outside to redraw
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCrop}
          disabled={!imageLoaded}
          className={cn(
            "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
            "bg-[var(--color-accent)] text-[var(--color-bg-base)]",
            "hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2"
          )}
        >
          Crop
        </button>
      </div>
    </div>
  );
}

// ─── CloudinaryWidget ─────────────────────────────────────────────────────────

interface CloudinaryWidgetProps {
  folder: string;
  value: string | null;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  accept?: string;
}

export function CloudinaryWidget({
  folder,
  value,
  onChange,
  label = "Upload Image",
  className,
  disabled = false,
  accept = "image/*",
}: CloudinaryWidgetProps): JSX.Element {
  const { upload, uploading, progress, error } = useCloudinaryUpload(folder);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalError(null);
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      try {
        const { url } = await upload(file);
        onChange(url);
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      }
    },
    [upload, onChange]
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setLocalError(null);
  }, [onChange]);

  const displayError = error ?? localError;

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <p className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </p>
      )}

      {value ? (
        <div className="relative inline-block">
          <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-[var(--color-border)]">
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            aria-label="Remove uploaded image"
            className={cn(
              "absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center",
              "rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)]",
              "text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled || uploading}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors",
              "border-[var(--color-border)] text-[var(--color-text-secondary)]",
              "hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
              (disabled || uploading) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Upload size={16} aria-hidden="true" />
            {uploading ? "Uploading…" : "Choose file"}
          </button>

          {uploading && (
            <ProgressBar
              value={progress}
              variant="accent"
              size="sm"
              showLabel
              label="Uploading"
            />
          )}

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={disabled || uploading}
            onChange={handleFileChange}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      )}

      {displayError && (
        <Alert
          variant="error"
          message={displayError}
          dismissible
          onDismiss={() => setLocalError(null)}
          className="mt-2"
        />
      )}
    </div>
  );
}

// ─── VideoPlayer ──────────────────────────────────────────────────────────────

type VideoSource = "youtube" | "facebook" | "cloudinary" | "unknown";

function detectVideoSource(src: string): VideoSource {
  if (/youtu\.be\/|youtube\.com\/(watch|embed|shorts)/.test(src)) {
    return "youtube";
  }
  if (/facebook\.com\/.*\/videos\//.test(src)) {
    return "facebook";
  }
  if (/res\.cloudinary\.com/.test(src) || /cloudinary\.com\/.*\/video\//.test(src)) {
    return "cloudinary";
  }
  return "unknown";
}

function getYouTubeEmbedUrl(src: string): string {
  let videoId = "";

  const shortMatch = src.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  const watchMatch = src.match(/youtube\.com\/watch\?.*v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  const embedMatch = src.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) {
    videoId = embedMatch[1];
  }

  const shortsMatch = src.match(/youtube\.com\/shorts\/([^?&]+)/);
  if (shortsMatch) {
    videoId = shortsMatch[1];
  }

  return videoId
    ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
    : src;
}

function getFacebookEmbedUrl(src: string): string {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(src)}&show_text=false&width=560`;
}

interface VideoPlayerProps {
  src: string;
  className?: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function VideoPlayer({
  src,
  className,
  title = "Video player",
  autoPlay = false,
  muted = false,
  loop = false,
}: VideoPlayerProps): JSX.Element {
  const source = detectVideoSource(src);

  if (source === "youtube") {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-xl bg-black",
          className
        )}
      >
        <iframe
          src={getYouTubeEmbedUrl(src)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  if (source === "facebook") {
    return (
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-xl bg-black",
          className
        )}
      >
        <iframe
          src={getFacebookEmbedUrl(src)}
          title={title}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
          className="absolute inset-0 h-full w-full border-0"
          scrolling="no"
        />
      </div>
    );
  }

  if (source === "cloudinary" || source === "unknown") {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl bg-black",
          className
        )}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={src}
          controls
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
          className="h-full w-full"
          title={title}
        >
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">
            Your browser does not support HTML5 video.{" "}
            <a
              href={src}
              className="text-[var(--color-accent)] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download the video
            </a>
            .
          </p>
        </video>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-video w-full items-center justify-center rounded-xl",
        "border border-[var(--color-border)] bg-[var(--color-bg-surface)]",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-[var(--color-text-secondary)]">
        <Play size={32} aria-hidden="true" />
        <p className="text-sm">Unsupported video source</p>
      </div>
    </div>
  );
}