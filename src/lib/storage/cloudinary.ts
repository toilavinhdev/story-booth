import type { StorageAdapter, UploadMeta, UploadResult } from "./types";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Upload thẳng từ trình duyệt bằng unsigned upload preset — không cần backend.
export class CloudinaryAdapter implements StorageAdapter {
  readonly provider = "cloudinary";

  upload(blob: Blob, meta: UploadMeta, onProgress?: (pct: number) => void): Promise<UploadResult> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      return Promise.reject(
        new Error("Thiếu biến môi trường Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / _UPLOAD_PRESET)."),
      );
    }

    const form = new FormData();
    form.append("file", blob, meta.fileName);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("public_id", meta.fileName.replace(/\.[^.]+$/, ""));
    if (meta.userName) form.append("context", `name=${meta.userName}`);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve({ id: data.public_id, url: data.secure_url, provider: "cloudinary" });
        } else {
          reject(new Error(`Cloudinary upload lỗi: ${xhr.status} ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Lỗi kết nối khi upload."));
      xhr.send(form);
    });
  }
}
