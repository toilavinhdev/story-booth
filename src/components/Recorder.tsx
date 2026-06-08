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

// Canvas resolution — portrait 9:16
const CANVAS_W = 540;
const CANVAS_H = 960;

// Bề mặt camera: preview qua canvas (tránh WebKit inject "Trực tiếp" / media controls lên <video>).
export function Recorder({ stream, recording, overlay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const videoReadyRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  // Gắn stream vào video ẩn — nguồn cho canvas draw.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.muted = true;
    el.controls = false;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [stream]);

  // RAF loop: draw video → canvas với mirror + object-cover crop.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    videoReadyRef.current = false;
    setVideoReady(false);

    const draw = () => {
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // object-cover: crop video để lấp đầy canvas giữ tỷ lệ khung hình
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const videoAspect = vw / vh;
          const canvasAspect = CANVAS_W / CANVAS_H;

          let sx = 0, sy = 0, sw = vw, sh = vh;
          if (videoAspect > canvasAspect) {
            sw = vh * canvasAspect;
            sx = (vw - sw) / 2;
          } else {
            sh = vw / canvasAspect;
            sy = (vh - sh) / 2;
          }

          // Mirror ngang kiểu selfie
          ctx.save();
          ctx.translate(CANVAS_W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
          ctx.restore();

          if (!videoReadyRef.current) {
            videoReadyRef.current = true;
            setVideoReady(true);
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stream]);

  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [recording]);

  return (
    <div className="relative aspect-[9/16] max-h-[80vh] w-full max-w-[32rem] overflow-hidden rounded-3xl bg-black shadow-xl">
      {/* Video ẩn — chỉ là nguồn stream, không hiển thị trực tiếp */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        className="absolute h-0 w-0 opacity-0"
      />
      {/* Canvas hiển thị — WebKit không inject "Trực tiếp" / controls lên canvas */}
      <canvas
        ref={canvasRef}
        className={`h-full w-full transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
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
