// Lớp trừu tượng cho nơi lưu video. UI/recorder chỉ gọi StorageAdapter.upload(),
// không biết đang lưu ở Cloudinary, Google Drive hay đâu khác.

export type UploadMeta = {
  /** Tên file, vd: "2026-06-06_1430_an_ab12cd.webm" */
  fileName: string;
  /** MIME type, vd: "video/webm" */
  mimeType: string;
  /** Tên người trả lời (nếu có) */
  userName?: string;
  /** Thời lượng video (ms) */
  durationMs?: number;
  /** Thông tin thiết bị/trình duyệt */
  device?: string;
  /** Vai trò người trả lời */
  role?: "parent" | "child";
};

export type UploadResult = {
  /** id / đường dẫn ở nơi lưu trữ */
  id: string;
  /** link xem lại (nếu nơi lưu trả về) */
  url?: string;
  /** "cloudinary" | "google-drive" | ... */
  provider: string;
};

export interface StorageAdapter {
  readonly provider: string;
  upload(blob: Blob, meta: UploadMeta): Promise<UploadResult>;
}
