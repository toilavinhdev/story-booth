"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle" // chưa xin quyền
  | "requesting" // đang xin quyền
  | "ready" // đã có camera/mic, sẵn sàng ghi
  | "recording" // đang ghi
  | "stopped" // đã ghi xong, có blob
  | "denied" // người dùng từ chối quyền
  | "no-device" // không có camera/mic
  | "error"; // lỗi khác

// Chọn định dạng ghi được hỗ trợ: ưu tiên .webm; Safari/iOS sẽ rơi về .mp4.
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function fileExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

const VIDEO_BITS_PER_SECOND = 2_500_000; // ~720p

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [mimeType, setMimeType] = useState("");

  const mimeTypeRef = useRef<string>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);

  // Dừng camera/mic khi unmount.
  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Trình duyệt không hỗ trợ ghi hình, hoặc trang không chạy trên HTTPS.");
      return;
    }

    setStatus("requesting");
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = s; // stream gốc (đủ video + audio) — dùng để GHI
      // Preview chỉ gồm track video → iOS không hiện "Now Playing / Trực tiếp".
      setStream(new MediaStream(s.getVideoTracks()));
      setStatus("ready");
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setStatus("denied");
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setStatus("no-device");
      } else {
        setStatus("error");
        setError(e.message || "Không mở được camera/mic.");
      }
    }
  }, []);

  const start = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;

    const chosen = pickMimeType();
    mimeTypeRef.current = chosen;
    setMimeType(chosen);
    chunksRef.current = [];

    const recorder = new MediaRecorder(s, {
      mimeType: chosen || undefined,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = mimeTypeRef.current || "video/webm";
      setRecordedBlob(new Blob(chunksRef.current, { type }));
      setDurationMs(Date.now() - startedAtRef.current);
      setStatus("stopped");
    };

    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start(1000); // gom chunk mỗi 1s — nhẹ bộ nhớ, an toàn hơn trên mobile
    setStatus("recording");
  }, []);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  // Bỏ bản ghi hiện tại, quay về trạng thái sẵn sàng (giữ nguyên camera).
  const reset = useCallback(() => {
    setRecordedBlob(null);
    setDurationMs(0);
    setStatus(streamRef.current ? "ready" : "idle");
  }, []);

  return {
    status,
    error,
    stream,
    recordedBlob,
    durationMs,
    mimeType,
    requestPermission,
    start,
    stop,
    reset,
  };
}
