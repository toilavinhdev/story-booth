import type { UploadMeta } from "@/lib/storage";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// Bỏ dấu tiếng Việt + chuyển về slug an toàn cho tên file.
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu thanh
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug || "khach";
}

// Tên file: {ngày}_{giờphút}_{tên}_{id}.{ext} — vd: 2026-06-06_1430_an_ab12cd34.webm
export function buildFileName(name: string, ext: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const id = crypto.randomUUID().slice(0, 8);
  return `${stamp}_${slugify(name)}_${id}.${ext}`;
}

export function buildUploadMeta(
  name: string,
  mimeType: string,
  ext: string,
  durationMs: number,
): UploadMeta {
  return {
    fileName: buildFileName(name, ext),
    mimeType: mimeType || "video/webm",
    userName: name.trim() || undefined,
    durationMs,
    device: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}
