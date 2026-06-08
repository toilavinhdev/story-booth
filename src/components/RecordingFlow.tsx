"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionGate } from "./PermissionGate";
import { Recorder } from "./Recorder";
import { QuestionCard } from "./QuestionCard";
import { UploadStatus } from "./UploadStatus";
import { fileExtension, useRecorder } from "@/hooks/useRecorder";
import { QUESTIONS, ROLE_QUESTION_SECONDS, SECONDS_PER_QUESTION } from "@/lib/questions";
import { getStorageAdapter } from "@/lib/storage";
import { buildFileName, buildUploadMeta } from "@/lib/upload";

type Step = "intro" | "setup" | "countdown" | "recording" | "confirm" | "uploading" | "error" | "done";

export function RecordingFlow() {
  const {
    status,
    error,
    stream,
    recordedBlob,
    durationMs,
    mimeType,
    requestPermission,
    start: recStart,
    stop: recStop,
  } = useRecorder();

  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [leftScreen, setLeftScreen] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  const [rolePhase, setRolePhase] = useState(true);
  const rolePhaseRef = useRef(true);
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROLE_QUESTION_SECONDS);
  const [count, setCount] = useState(3);

  const deadlineRef = useRef(0); // hạn chót cho câu hỏi hiện tại
  const countdownRef = useRef(0); // hạn chót đếm ngược 3-2-1
  const qIndexRef = useRef(0);

  // intro -> setup (xin quyền)
  const handleContinue = () => {
    setStep("setup");
    requestPermission();
  };

  // setup -> countdown
  const handleBegin = () => {
    setCount(3);
    countdownRef.current = Date.now() + 3000;
    setStep("countdown");
  };

  // Kết thúc ghi -> confirm
  const finish = useCallback(() => {
    recStop();
    setStep("confirm");
  }, [recStop]);

  // Sang câu kế, hoặc kết thúc nếu là câu cuối. KHÔNG động tới luồng ghi.
  const handleNext = useCallback(() => {
    if (rolePhaseRef.current) {
      rolePhaseRef.current = false;
      setRolePhase(false);
      qIndexRef.current = 0;
      setQIndex(0);
      deadlineRef.current = Date.now() + SECONDS_PER_QUESTION * 1000;
      setSecondsLeft(SECONDS_PER_QUESTION);
      return;
    }
    const i = qIndexRef.current;
    if (i >= QUESTIONS.length - 1) {
      finish();
      return;
    }
    const next = i + 1;
    qIndexRef.current = next;
    setQIndex(next);
    deadlineRef.current = Date.now() + SECONDS_PER_QUESTION * 1000;
    setSecondsLeft(SECONDS_PER_QUESTION);
  }, [finish]);

  // Đếm ngược 3-2-1, rồi bắt đầu ghi liên tục.
  useEffect(() => {
    if (step !== "countdown") return;
    const id = setInterval(() => {
      const remaining = Math.ceil((countdownRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(id);
        recStart();
        rolePhaseRef.current = true;
        setRolePhase(true);
        qIndexRef.current = 0;
        setQIndex(0);
        deadlineRef.current = Date.now() + ROLE_QUESTION_SECONDS * 1000;
        setSecondsLeft(ROLE_QUESTION_SECONDS);
        setLeftScreen(false);
        setStep("recording");
      } else {
        setCount(remaining);
      }
    }, 200);
    return () => clearInterval(id);
  }, [step, recStart]);

  // Trong lúc ghi: đếm lùi thời gian mỗi câu, hết giờ thì tự nhảy câu.
  useEffect(() => {
    if (step !== "recording") return;
    const id = setInterval(() => {
      const remaining = Math.ceil((deadlineRef.current - Date.now()) / 1000);
      if (remaining <= 0) handleNext();
      else setSecondsLeft(remaining);
    }, 250);
    return () => clearInterval(id);
  }, [step, handleNext]);

  // D1: cảnh báo khi đóng/refresh tab lúc đang ghi hoặc đang gửi.
  useEffect(() => {
    if (step !== "recording" && step !== "uploading") return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step]);

  // D2: phát hiện rời màn hình (khóa máy / chuyển tab / cuộc gọi) khi đang ghi.
  useEffect(() => {
    if (step !== "recording") return;
    const handler = () => {
      if (document.hidden) setLeftScreen(true);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [step]);

  const handleSend = useCallback(async () => {
    if (!recordedBlob) return;
    setUploadError(null);
    setStep("uploading");
    try {
      const ext = fileExtension(mimeType);
      const meta = buildUploadMeta(name, mimeType, ext, durationMs);
      await getStorageAdapter().upload(recordedBlob, meta);
      setStep("done");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Lỗi không xác định.");
      setStep("error");
    }
  }, [recordedBlob, mimeType, name, durationMs]);

  const handleSaveLocally = useCallback(() => {
    if (!recordedBlob) return;
    const ext = fileExtension(mimeType);
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildFileName(name, ext);
    a.click();
    URL.revokeObjectURL(url);
    setSavedLocally(true);
  }, [recordedBlob, mimeType, name]);

  // --- Render theo bước ---

  if (step === "intro") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-32 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground/90 sm:text-4xl">Gương Màn Hình</h1>

        <p className="text-base font-semibold leading-relaxed text-foreground/55 sm:text-lg">
          Chiếc gương đầu tiên hôm nay
          <br />
          không treo trên tường.
          <br />
          <span className="font-bold text-foreground">Nó nằm trong túi của bạn. ✨</span>
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên của bạn"
          className="w-full rounded-full border border-white/60 bg-white/70 px-5 py-3 text-center text-base font-semibold shadow-sm backdrop-blur-sm outline-none transition-all duration-200 placeholder:text-foreground/35 hover:border-violet-200 hover:bg-white/80 hover:shadow-md focus:border-violet-300 focus:bg-white/95 focus:shadow-md focus:shadow-violet-100/60 focus:ring-2 focus:ring-violet-200/50"
        />

        <label className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/50 bg-white/50 px-4 py-2.5 text-xs text-foreground/75 backdrop-blur-sm transition-all duration-200 hover:border-violet-200/60 hover:bg-white/75 hover:shadow-sm active:scale-[0.98]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="sr-only"
          />
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${consent ? "scale-105 border-violet-500 bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm shadow-violet-300/50" : "border-foreground/20 bg-white/80 hover:border-violet-300"}`}>
            {consent && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          {/* B2: nội dung consent chính thức sẽ do khách cung cấp (placeholder). */}
          <span>Tôi đồng ý cho phép ghi lại và lưu trữ video này.</span>
        </label>

        <PrimaryButton onClick={handleContinue} disabled={!name.trim() || !consent}>
          🌟 Bắt đầu
        </PrimaryButton>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <PermissionGate status={status} error={error} onRequest={requestPermission}>
        <div className="flex flex-col items-center gap-4">
          <Recorder stream={stream} recording={false} />
          <PrimaryButton onClick={handleBegin}>Bắt đầu</PrimaryButton>
        </div>
      </PermissionGate>
    );
  }

  if (step === "countdown") {
    return (
      <Recorder
        stream={stream}
        recording={false}
        overlay={
          <div className="flex h-full items-center justify-center bg-black/40">
            <span className="text-7xl font-bold text-white">{count}</span>
          </div>
        }
      />
    );
  }

  if (step === "recording") {
    const totalSeconds = rolePhase ? ROLE_QUESTION_SECONDS : SECONDS_PER_QUESTION;
    const fill = (totalSeconds - secondsLeft) / totalSeconds;
    return (
      <div className="flex flex-col items-center gap-3">
        <Recorder
          stream={stream}
          recording
          overlay={
            <>
              {rolePhase ? (
                <QuestionCard
                  index={0}
                  total={1}
                  text="Bạn là Phụ Huynh hay Con?"
                  fill={fill}
                />
              ) : (
                <QuestionCard
                  index={qIndex}
                  total={QUESTIONS.length}
                  text={QUESTIONS[qIndex].text}
                  fill={fill}
                />
              )}
              {/* Chạm vào khung để sang câu kế (tự sang khi hết giờ) */}
              <button
                type="button"
                onClick={handleNext}
                aria-label="Chạm để tiếp tục"
                className="absolute inset-0"
              />
            </>
          }
        />
        {leftScreen ? (
          <p className="text-sm font-medium text-red-600">
            Bạn vừa rời màn hình — bản ghi có thể đã bị gián đoạn.
          </p>
        ) : (
          <p className="text-sm text-foreground/40">Đừng rời màn hình khi đang ghi nhé.</p>
        )}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <Card>
        <h2 className="text-2xl font-bold">Hoàn tất ghi hình</h2>
        <p className="text-foreground/60">
          Cảm ơn bạn đã trả lời. Bạn có thể gửi video hoặc lưu về máy.
        </p>
        <PrimaryButton onClick={handleSend} disabled={!recordedBlob}>
          {recordedBlob ? "📤 Gửi" : "Đang xử lý…"}
        </PrimaryButton>
        <SecondaryButton onClick={handleSaveLocally} disabled={!recordedBlob}>
          {savedLocally ? "✅ Đã lưu về máy" : "💾 Lưu về máy"}
        </SecondaryButton>
      </Card>
    );
  }

  if (step === "uploading") {
    return <UploadStatus state="uploading" onRetry={handleSend} onBack={() => setStep("confirm")} />;
  }

  if (step === "error") {
    return (
      <UploadStatus
        state="error"
        error={uploadError}
        onRetry={handleSend}
        onBack={() => setStep("confirm")}
      />
    );
  }

  // done
  return (
    <Card>
      <div className="text-3xl" aria-hidden>
        🌟💗✨
      </div>
      <h2 className="text-2xl font-bold">Đã gửi thành công</h2>
      <p className="text-foreground/60">Cảm ơn bạn đã chia sẻ một khoảnh khắc về gia đình. 💛</p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-foreground/10 p-8 text-center">
      {children}
    </div>
  );
}


function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [rippling, setRippling] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setRippling(false);
    requestAnimationFrame(() => {
      setRippling(true);
      setTimeout(() => setRippling(false), 450);
    });
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`cursor-pointer rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-600 px-12 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-300/40 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-300/50 active:scale-[0.97] active:from-fuchsia-600 active:via-violet-600 active:to-indigo-700 active:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 ${rippling ? "btn-ripple" : ""}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [rippling, setRippling] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    setRippling(false);
    requestAnimationFrame(() => {
      setRippling(true);
      setTimeout(() => setRippling(false), 450);
    });
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`cursor-pointer rounded-full bg-gradient-to-r from-violet-400/80 to-indigo-400/80 px-8 py-3 font-semibold text-white shadow-md shadow-violet-200/40 transition-all duration-200 hover:scale-[1.02] hover:from-violet-400 hover:to-indigo-400 hover:shadow-lg hover:shadow-violet-200/50 active:scale-[0.97] active:from-violet-500 active:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${rippling ? "btn-ripple" : ""}`}
    >
      {children}
    </button>
  );
}
