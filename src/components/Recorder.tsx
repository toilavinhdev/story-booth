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
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Inline playback: iOS Safari + Tencent X5 engine (Zalo, WeChat).
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.setAttribute("x5-video-player-type", "h5");
    el.setAttribute("x5-playsinline", "true");
    el.setAttribute("x5-video-player-fullscreen", "false");
    el.muted = true;
    el.controls = false;
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
    <div className="relative aspect-[9/16] max-h-[80vh] w-full max-w-[32rem] overflow-hidden rounded-3xl bg-black shadow-xl">
      {/* Lật gương kiểu selfie cho preview (tự nhiên với người dùng) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        onCanPlay={() => setVideoReady(true)}
        className={`pointer-events-none h-full w-full -scale-x-100 object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
      />

      {recording && (
        <div className="absolute left-4 top-10 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          REC {formatTime(elapsed)}
        </div>
      )}

      {overlay && (
        <div className="absolute inset-0 transition-opacity duration-500">
          {overlay}
        </div>
      )}
    </div>
  );
}
