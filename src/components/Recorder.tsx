"use client";

import { useEffect, useRef, useState } from "react";
import type { RecorderStatus } from "@/hooks/useRecorder";

type Props = {
  stream: MediaStream | null;
  status: RecorderStatus;
  onStart: () => void;
  onStop: () => void;
  /** Lớp phủ lên video (vd: câu hỏi) — dùng ở P2 */
  overlay?: React.ReactNode;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Recorder({ stream, status, onStart, onStop, overlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

  // Gắn stream vào thẻ video để xem trước.
  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) el.srcObject = stream;
  }, [stream]);

  // Đồng hồ đếm thời gian ghi — chỉ chạy khi đang ghi; setState nằm trong interval.
  useEffect(() => {
    if (status !== "recording") return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [status]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-black">
        {/* -scale-x-100: hiệu ứng gương cho camera trước (chỉ preview, file ghi ra không bị lật) */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full -scale-x-100 object-cover"
        />

        {status === "recording" && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            REC {formatTime(elapsed)}
          </div>
        )}

        {overlay && <div className="absolute inset-0">{overlay}</div>}
      </div>

      {status === "ready" && (
        <button
          onClick={onStart}
          className="rounded-full bg-red-600 px-8 py-3 font-medium text-white transition-opacity hover:opacity-90"
        >
          Bắt đầu ghi
        </button>
      )}
      {status === "recording" && (
        <button
          onClick={onStop}
          className="rounded-full bg-foreground px-8 py-3 font-medium text-background transition-opacity hover:opacity-90"
        >
          Kết thúc
        </button>
      )}
    </div>
  );
}
