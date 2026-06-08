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

type Step = "intro" | "name" | "setup" | "countdown" | "recording" | "confirm" | "uploading" | "error" | "done";

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
  const [uploaded, setUploaded] = useState(false);

  const [rolePhase, setRolePhase] = useState(true);
  const rolePhaseRef = useRef(true);
  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROLE_QUESTION_SECONDS);
  const [count, setCount] = useState(3);
  const [qFading, setQFading] = useState(false);

  const deadlineRef = useRef(0); // hạn chót cho câu hỏi hiện tại
  const countdownRef = useRef(0); // hạn chót đếm ngược 3-2-1
  const qIndexRef = useRef(0);

  // intro -> name
  const handleIntro = () => setStep("name");

  // name -> setup (xin quyền)
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
  const advanceQuestion = useCallback(() => {
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

  const handleNext = useCallback(() => {
    setQFading(true);
    setTimeout(() => {
      advanceQuestion();
      setQFading(false);
    }, 400);
  }, [advanceQuestion]);

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
      setUploaded(true);
      setStep("confirm");
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
      <div key="intro" className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-20 text-center">
        <h1 style={{ animationDelay: "0s" }} className="step-in-slow text-3xl font-extrabold tracking-tight text-foreground/90 sm:text-4xl">Gương Màn Hình</h1>

        <p style={{ animationDelay: "0.25s" }} className="step-in-slow text-base font-semibold leading-relaxed text-foreground/55 sm:text-lg">
          Chiếc gương đầu tiên hôm nay
          <br />
          không treo trên tường.
          <br />
          <span className="font-bold text-foreground">Nó nằm trong túi của bạn. ✨</span>
        </p>

        <div style={{ animationDelay: "0.5s" }} className="step-in-slow mt-6">
          <PrimaryButton onClick={handleIntro}>
            🌟 Bắt đầu
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div key="name" className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-32 text-center">
        <h2 style={{ animationDelay: "0s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90 sm:text-3xl">Mình gọi bạn là gì nhỉ?</h2>
        <input
          style={{ animationDelay: "0.25s" }}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên của bạn"
          className="step-in-slow w-full rounded-full border border-white/60 bg-white/70 px-5 py-3 text-center text-base font-semibold shadow-sm backdrop-blur-sm outline-none transition-all duration-200 placeholder:text-foreground/35 hover:border-violet-200 hover:bg-white/80 hover:shadow-md focus:border-violet-300 focus:bg-white/95 focus:shadow-md focus:shadow-violet-100/60 focus:ring-2 focus:ring-violet-200/50"
        />

        <label style={{ animationDelay: "0.45s" }} className="step-in-slow flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/50 bg-white/50 px-4 py-2.5 text-xs text-foreground/75 backdrop-blur-sm transition-all duration-200 hover:border-violet-200/60 hover:bg-white/75 hover:shadow-sm active:scale-[0.98]">
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

        <div style={{ animationDelay: "0.65s" }} className="step-in-slow">
          <PrimaryButton onClick={handleContinue} disabled={!name.trim() || !consent}>
            🚀 Tiếp tục
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (step === "setup" || step === "countdown") {
    const isReady = status === "ready" || status === "recording" || status === "stopped";

    if (!isReady) {
      return <PermissionGate status={status} error={error} onRequest={requestPermission}><></></PermissionGate>;
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <Recorder
          stream={stream}
          recording={false}
          overlay={
            step === "setup" ? (
              <button
                type="button"
                onClick={handleBegin}
                className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-6"
              >
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xl font-bold text-white drop-shadow">Bạn đã sẵn sàng chưa?</p>
                  <p className="text-sm text-white/70">Chạm để bắt đầu 🦋</p>
                </div>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center bg-black/40">
                <span className="text-7xl font-bold text-white">{count}</span>
              </div>
            )
          }
        />
        <p className="text-sm text-foreground/40">Đừng rời màn hình khi đang ghi nhé.</p>
      </div>
    );
  }

  if (step === "recording") {
    const totalSeconds = rolePhase ? ROLE_QUESTION_SECONDS : SECONDS_PER_QUESTION;
    const fill = (totalSeconds - secondsLeft) / totalSeconds;
    return (
      <div className="flex flex-col items-center gap-4">
        <Recorder
          stream={stream}
          recording
          overlay={
            <>
              <QuestionCard
                index={rolePhase ? 0 : qIndex + 1}
                total={QUESTIONS.length + 1}
                text={rolePhase ? "Bạn là Phụ Huynh hay Con?" : QUESTIONS[qIndex].text}
                fill={fill}
                fading={qFading}
              />
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
      <div key="confirm" className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-6 pt-24 text-center">
        <h2 className="step-in-slow text-3xl font-black leading-tight tracking-tight text-foreground/90 sm:text-4xl">
          Mỗi đứa trẻ đều phản chiếu<br />
          <span className="text-violet-500">cách người lớn nhìn chúng.</span><br />
          <span className="text-2xl">✨</span>
        </h2>
        <p className="text-sm font-semibold text-foreground/60">
          © Gương Màn Hình — Một trải nghiệm phản chiếu
        </p>
        <div className="mt-6 flex w-[200px] flex-col gap-3 [&>button]:w-full">
          {uploaded ? (
            <p className="text-sm font-semibold text-violet-500">✅ Đã gửi thành công!</p>
          ) : (
            <PrimaryButton onClick={handleSend} disabled={!recordedBlob}>
              {recordedBlob ? "📤 Gửi" : "Đang xử lý…"}
            </PrimaryButton>
          )}
          <SecondaryButton onClick={handleSaveLocally} disabled={!recordedBlob}>
            {savedLocally ? "✅ Đã lưu về máy" : "💾 Lưu về máy"}
          </SecondaryButton>
        </div>
      </div>
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
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-32 text-center">
      <p style={{ animationDelay: "0s" }} className="step-in-slow text-4xl">🌟💗✨</p>
      <h2 style={{ animationDelay: "0.25s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90">Đã gửi thành công</h2>
      <p style={{ animationDelay: "0.45s" }} className="step-in-slow text-base text-foreground/55 leading-relaxed">Cảm ơn bạn đã chia sẻ một khoảnh khắc về gia đình. 💛</p>
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
      className={`btn-glow cursor-pointer rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-600 px-12 py-4 text-lg font-semibold text-white active:from-fuchsia-600 active:via-violet-600 active:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${rippling ? "btn-ripple" : ""}`}
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
      className={`btn-glow cursor-pointer rounded-full bg-gradient-to-r from-violet-400/80 to-indigo-400/80 px-8 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${rippling ? "btn-ripple" : ""}`}
    >
      {children}
    </button>
  );
}
