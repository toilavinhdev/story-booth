"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionGate } from "./PermissionGate";
import { Recorder } from "./Recorder";
import { QuestionCard } from "./QuestionCard";
import { UploadStatus } from "./UploadStatus";
import { fileExtension, useRecorder } from "@/hooks/useRecorder";
import { QUESTIONS, SECONDS_PER_QUESTION } from "@/lib/questions";
import { getStorageAdapter } from "@/lib/storage";
import { buildUploadMeta } from "@/lib/upload";

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

  const [qIndex, setQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);
  const [count, setCount] = useState(3);

  const deadlineRef = useRef(0); // hạn chót cho câu hỏi hiện tại
  const countdownRef = useRef(0); // hạn chót đếm ngược 3-2-1
  const qIndexRef = useRef(0);

  const isLast = qIndex >= QUESTIONS.length - 1;

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
        qIndexRef.current = 0;
        setQIndex(0);
        deadlineRef.current = Date.now() + SECONDS_PER_QUESTION * 1000;
        setSecondsLeft(SECONDS_PER_QUESTION);
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

  // --- Render theo bước ---

  if (step === "intro") {
    return (
      <Card>
        <h1 className="text-2xl font-semibold">story-booth</h1>
        <p className="text-foreground/60">
          Hãy chia sẻ câu trả lời của bạn về gia đình qua {QUESTIONS.length} câu hỏi (~5 phút). Mỗi
          câu khoảng 1 phút, video sẽ tự ghi liên tục.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên của bạn"
          className="w-full rounded-lg border border-foreground/20 px-4 py-2.5"
        />
        <label className="flex items-start gap-2 text-left text-sm text-foreground/60">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          {/* B2: nội dung consent chính thức sẽ do khách cung cấp (placeholder). */}
          <span>
            Tôi đồng ý cho phép ghi lại và lưu trữ video câu trả lời của mình cho mục đích của
            chương trình.
          </span>
        </label>
        <PrimaryButton onClick={handleContinue} disabled={!name.trim() || !consent}>
          Tiếp tục
        </PrimaryButton>
      </Card>
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
    return (
      <div className="flex flex-col items-center gap-4">
        <Recorder
          stream={stream}
          recording
          overlay={
            <QuestionCard
              index={qIndex}
              total={QUESTIONS.length}
              text={QUESTIONS[qIndex].text}
              secondsLeft={secondsLeft}
            />
          }
        />
        <div className="flex gap-3">
          <PrimaryButton onClick={handleNext}>{isLast ? "Hoàn thành" : "Câu tiếp"}</PrimaryButton>
          <SecondaryButton onClick={finish}>Kết thúc</SecondaryButton>
        </div>
        {leftScreen ? (
          <p className="text-sm font-medium text-accent">
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
        <h2 className="text-xl font-semibold">Hoàn tất ghi hình</h2>
        <p className="text-foreground/60">
          Cảm ơn bạn đã trả lời. Nhấn &quot;Gửi&quot; để gửi câu trả lời của bạn.
        </p>
        <PrimaryButton onClick={handleSend} disabled={!recordedBlob}>
          {recordedBlob ? "Gửi" : "Đang xử lý…"}
        </PrimaryButton>
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
      <h2 className="text-xl font-semibold">Đã gửi thành công 🎉</h2>
      <p className="text-foreground/60">Cảm ơn bạn đã chia sẻ.</p>
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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-accent px-8 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-foreground/20 px-8 py-2.5 font-medium transition-colors hover:bg-foreground/5"
    >
      {children}
    </button>
  );
}
