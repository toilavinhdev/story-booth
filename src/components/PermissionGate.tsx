"use client";

import type { RecorderStatus } from "@/hooks/useRecorder";

type Props = {
  status: RecorderStatus;
  error: string | null;
  onRequest: () => void;
  children: React.ReactNode;
};

// Xin quyền camera/mic. Khi đã có quyền thì hiển thị children (UI ghi hình).
// Xử lý các trường hợp từ chối / không có thiết bị / lỗi (D3).
export function PermissionGate({ status, error, onRequest, children }: Props) {
  if (status === "ready" || status === "recording" || status === "stopped") {
    return <>{children}</>;
  }

  if (status === "denied") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Cần quyền camera & micro</h2>
        <p className="text-foreground/60">
          Bạn đã từ chối quyền truy cập. Hãy mở phần cài đặt quyền của trình duyệt (biểu tượng ổ
          khóa trên thanh địa chỉ), bật lại Camera & Micro rồi thử lại.
        </p>
        <PrimaryButton onClick={onRequest}>Thử lại</PrimaryButton>
      </Card>
    );
  }

  if (status === "no-device") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Không tìm thấy camera hoặc micro</h2>
        <p className="text-foreground/60">
          Thiết bị của bạn không có camera/micro, hoặc đang bị ứng dụng khác sử dụng. Vui lòng kiểm
          tra lại rồi thử lại.
        </p>
        <PrimaryButton onClick={onRequest}>Thử lại</PrimaryButton>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Đã có lỗi xảy ra</h2>
        <p className="text-foreground/60">{error ?? "Không mở được camera/mic."}</p>
        <PrimaryButton onClick={onRequest}>Thử lại</PrimaryButton>
      </Card>
    );
  }

  // idle | requesting
  return (
    <Card>
      <h2 className="text-xl font-semibold">Cho phép camera & micro</h2>
      <p className="text-foreground/60">
        Để ghi lại câu trả lời, trình duyệt sẽ xin quyền truy cập Camera và Micro của bạn.
      </p>
      <PrimaryButton onClick={onRequest} disabled={status === "requesting"}>
        {status === "requesting" ? "Đang xin quyền…" : "Cho phép"}
      </PrimaryButton>
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
      className="rounded-full bg-foreground px-6 py-2.5 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
