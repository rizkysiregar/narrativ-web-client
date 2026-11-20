import { api } from "~/api/client";
import { ApiError, request } from "~/api/errors";
import { postUploadForm } from "~/shared/lib/upload-form";

/**
 * Uploads one file for a post and answers its object key for POST /posts. The backend hands out a presigned POST
 * form; the browser sends the file straight to object storage with it, the API never sees the bytes.
 */
export async function uploadPostMedia(
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const { uploadForm, objectKey } = await request(
    api.POST("/posts/upload-url", { body: { contentType: file.type }, signal }),
  );
  if (!uploadForm?.url || !objectKey) {
    throw new ApiError(200, "No upload form in the answer");
  }
  await postUploadForm({ url: uploadForm.url, fields: uploadForm.fields ?? {} }, file, onProgress, signal);
  return objectKey;
}
