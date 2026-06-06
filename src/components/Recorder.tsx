"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  stream: MediaStream | null;
  recording: boolean;
  /** Lớp phủ lên video (vd: câu hỏi, đếm ngược) */
  overlay?: React.ReactNode;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Bề mặt camera: preview (gương selfie) + chấm REC. Controls do flow bên ngoài quản lý.
export function Recorder({ stream, recording, overlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Ép phát inline trên iOS Safari (tránh tự nhảy fullscreen che mất câu hỏi).
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.muted = true;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  return (
    <div className="relative aspect-[9/16] max-h-[70svh] w-full max-w-[22rem] overflow-hidden rounded-3xl bg-black shadow-xl">
      {/* Không lật gương: preview khớp đúng với video ghi ra (tránh cảm giác "ngược cam") */}
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

      {recording && (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          REC {formatTime(elapsed)}
        </div>
      )}

      {overlay && <div className="absolute inset-0">{overlay}</div>}
    </div>
  );
}
