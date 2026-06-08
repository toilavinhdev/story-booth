"use client";

import { useState } from "react";
import type { RecorderStatus } from "@/hooks/useRecorder";

type Props = {
  status: RecorderStatus;
  error: string | null;
  onRequest: () => void;
  children: React.ReactNode;
};

export function PermissionGate({ status, error, onRequest, children }: Props) {
  if (status === "ready" || status === "recording" || status === "stopped") {
    return <div className="step-in">{children}</div>;
  }

  if (status === "denied") {
    return (
      <StepCard>
        <h2 style={{ animationDelay: "0s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90">Cần quyền camera & micro</h2>
        <p style={{ animationDelay: "0.25s" }} className="step-in-slow text-base text-foreground/55 leading-relaxed">
          Bạn đã từ chối quyền truy cập. Hãy mở cài đặt quyền của trình duyệt, bật lại Camera & Micro rồi thử lại.
        </p>
        <div style={{ animationDelay: "0.45s" }} className="step-in-slow">
          <PrimaryButton onClick={onRequest}>Thử lại</PrimaryButton>
        </div>
      </StepCard>
    );
  }

  if (status === "no-device") {
    return (
      <StepCard>
        <h2 style={{ animationDelay: "0s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90">Không tìm thấy camera</h2>
        <p style={{ animationDelay: "0.25s" }} className="step-in-slow text-base text-foreground/55 leading-relaxed">
          Thiết bị không có camera/micro, hoặc đang bị ứng dụng khác sử dụng. Vui lòng kiểm tra lại rồi thử lại.
        </p>
        <div style={{ animationDelay: "0.45s" }} className="step-in-slow">
          <PrimaryButton onClick={onRequest}>Thử lại</PrimaryButton>
        </div>
      </StepCard>
    );
  }

  if (status === "error") {
    return (
      <StepCard>
        <h2 style={{ animationDelay: "0s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90">Đã có lỗi xảy ra</h2>
        <p style={{ animationDelay: "0.25s" }} className="step-in-slow text-base text-foreground/55 leading-relaxed">
          {error ?? "Không mở được camera/mic."}
        </p>
        <div style={{ animationDelay: "0.45s" }} className="step-in-slow">
          <PrimaryButton onClick={onRequest}>Thử lại</PrimaryButton>
        </div>
      </StepCard>
    );
  }

  // idle | requesting
  return (
    <StepCard>
      <h2 style={{ animationDelay: "0s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90">Cho phép camera & micro</h2>
      <p style={{ animationDelay: "0.25s" }} className="step-in-slow text-base text-foreground/55 leading-relaxed">
        Để ghi lại câu trả lời, trình duyệt sẽ xin quyền truy cập Camera và Micro của bạn.
      </p>
      <div style={{ animationDelay: "0.45s" }} className="step-in-slow">
        <PrimaryButton onClick={onRequest} disabled={status === "requesting"}>
          {status === "requesting" ? "Đang xin quyền…" : "Cho phép"}
        </PrimaryButton>
      </div>
    </StepCard>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-32 text-center">
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
      className={`btn-glow cursor-pointer rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-600 px-12 py-4 text-lg font-semibold text-white active:from-fuchsia-600 active:via-violet-600 active:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${rippling ? "btn-ripple" : ""}`}
    >
      {children}
    </button>
  );
}
