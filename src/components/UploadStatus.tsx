import { useState } from "react";

type Props = {
  state: "uploading" | "error";
  error?: string | null;
  onRetry: () => void;
  onBack: () => void;
};

export function UploadStatus({ state, error, onRetry, onBack }: Props) {
  if (state === "uploading") {
    return (
      <div className="step-in mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-32 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-foreground/20 border-t-violet-500" />
        <p className="text-base font-semibold text-foreground/55">Đang gửi câu trả lời của bạn…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 px-4 pt-32 text-center">
      <h2 style={{ animationDelay: "0s" }} className="step-in-slow text-2xl font-extrabold tracking-tight text-foreground/90">Gửi không thành công</h2>
      <p style={{ animationDelay: "0.25s" }} className="step-in-slow text-base text-foreground/55 leading-relaxed">
        {error || "Có lỗi khi gửi. Vui lòng kiểm tra kết nối mạng và thử lại."}
      </p>
      <div style={{ animationDelay: "0.45s" }} className="step-in-slow flex gap-3">
        <PrimaryButton onClick={onRetry}>Thử lại</PrimaryButton>
        <SecondaryButton onClick={onBack}>Quay lại</SecondaryButton>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [rippling, setRippling] = useState(false);

  const handleClick = () => {
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
      className={`btn-glow cursor-pointer rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-600 px-8 py-3 font-semibold text-white active:from-fuchsia-600 active:via-violet-600 active:to-indigo-700 ${rippling ? "btn-ripple" : ""}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [rippling, setRippling] = useState(false);

  const handleClick = () => {
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
      className={`btn-glow cursor-pointer rounded-full bg-gradient-to-r from-violet-400/80 to-indigo-400/80 px-8 py-3 font-semibold text-white active:from-violet-500 active:to-indigo-500 ${rippling ? "btn-ripple" : ""}`}
    >
      {children}
    </button>
  );
}
