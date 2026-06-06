type Props = {
  state: "uploading" | "error";
  error?: string | null;
  onRetry: () => void;
  onBack: () => void;
};

// Trạng thái gửi video. Lỗi thì cho thử lại hoặc quay lại (C2 — không có tải về).
export function UploadStatus({ state, error, onRetry, onBack }: Props) {
  if (state === "uploading") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-foreground/10 p-8 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        <p className="text-foreground/60">Đang gửi câu trả lời của bạn…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-foreground/10 p-8 text-center">
      <h2 className="text-xl font-semibold">Gửi không thành công</h2>
      <p className="text-foreground/60">
        {error || "Có lỗi khi gửi. Vui lòng kiểm tra kết nối mạng và thử lại."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-full bg-accent px-8 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          Thử lại
        </button>
        <button
          onClick={onBack}
          className="rounded-full border border-foreground/20 px-8 py-2.5 font-medium transition-colors hover:bg-foreground/5"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}
