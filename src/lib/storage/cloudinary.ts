import type { StorageAdapter, UploadMeta, UploadResult } from "./types";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Upload thẳng từ trình duyệt bằng unsigned upload preset — không cần backend.
export class CloudinaryAdapter implements StorageAdapter {
  readonly provider = "cloudinary";

  async upload(blob: Blob, meta: UploadMeta): Promise<UploadResult> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error(
        "Thiếu biến môi trường Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / _UPLOAD_PRESET).",
      );
    }

    const form = new FormData();
    form.append("file", blob, meta.fileName);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("public_id", meta.fileName.replace(/\.[^.]+$/, "")); // bỏ phần đuôi file
    if (meta.userName) form.append("context", `name=${meta.userName}`);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
    const res = await fetch(endpoint, { method: "POST", body: form });

    if (!res.ok) {
      throw new Error(`Cloudinary upload lỗi: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { id: data.public_id, url: data.secure_url, provider: this.provider };
  }
}
