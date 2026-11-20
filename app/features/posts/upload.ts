import { api } from "~/api/client";
import { ApiError, request } from "~/api/errors";

/**
 * Uploads one file for a post and answers its object key for POST /posts. The backend hands out a presigned POST
 * form; the browser sends the file straight to object storage with it, the API never sees the bytes. The form pins
 * the content type and the size limit, so storage refuses anything else.
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
  await postForm(uploadForm.url, uploadForm.fields ?? {}, file, onProgress, signal);
  return objectKey;
}

// XMLHttpRequest rather than fetch: only it reports upload progress
function postForm(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      form.append(name, value);
    }
    // S3-style POST uploads ignore every field after the file, so it goes last
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new ApiError(xhr.status, `Upload refused (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      reject(ApiError.network(new Error("Upload failed")));
    };
    xhr.onabort = () => {
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    signal.addEventListener("abort", () => {
      xhr.abort();
    });
    xhr.send(form);
  });
}
