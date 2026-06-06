import type { StorageAdapter, UploadMeta, UploadResult } from "./types";

// Placeholder cho phase sau (P6): upload qua API route Next.js + service account.
// Tách sẵn ở đây để chuyển nơi lưu mà không đụng phần ghi hình / UI.
export class GoogleDriveAdapter implements StorageAdapter {
  readonly provider = "google-drive";

  async upload(_blob: Blob, _meta: UploadMeta): Promise<UploadResult> {
    throw new Error("GoogleDriveAdapter chưa được triển khai (xem P6 trong PLAN.md).");
  }
}
