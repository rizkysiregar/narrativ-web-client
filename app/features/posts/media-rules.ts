// The backend's limits (PostServiceImpl): checked before uploading, so a user learns at once that a file will not do.
export const MAX_MEDIA = 5;
export const MAX_CAPTION = 500;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
// the backend takes any image/*; these are the ones every browser can show again
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(",");

export type MediaProblem = "type" | "imageSize" | "videoSize";

export function mediaProblem(file: File): MediaProblem | null {
  if (VIDEO_TYPES.includes(file.type)) {
    return file.size > MAX_VIDEO_BYTES ? "videoSize" : null;
  }
  if (IMAGE_TYPES.includes(file.type)) {
    return file.size > MAX_IMAGE_BYTES ? "imageSize" : null;
  }
  return "type";
}
