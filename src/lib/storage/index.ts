import type { StorageAdapter } from "./types";
import { CloudinaryAdapter } from "./cloudinary";
import { GoogleDriveAdapter } from "./google-drive";

export type { StorageAdapter, UploadMeta, UploadResult } from "./types";

// Chọn nơi lưu qua biến môi trường — đổi 1 dòng env là chuyển provider.
export function getStorageAdapter(): StorageAdapter {
  const provider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "cloudinary";

  switch (provider) {
    case "cloudinary":
      return new CloudinaryAdapter();
    case "google-drive":
      return new GoogleDriveAdapter();
    default:
      throw new Error(`Storage provider không hợp lệ: ${provider}`);
  }
}
