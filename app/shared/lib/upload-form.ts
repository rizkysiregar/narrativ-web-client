import { ApiError } from "~/api/errors";

/**
 * Sends a file to object storage with a presigned POST form from the backend, reporting progress. XMLHttpRequest
 * rather than fetch, because only it reports upload progress. The form pins the content type and the size limit, so
 * storage refuses anything else.
 */
export function postUploadForm(
  form: { url: string; fields: Record<string, string> },
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    for (const [name, value] of Object.entries(form.fields)) {
      body.append(name, value);
    }
    // S3-style POST uploads ignore every field after the file, so it goes last
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", form.url);
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
    signal?.addEventListener("abort", () => {
      xhr.abort();
    });
    xhr.send(body);
  });
}
