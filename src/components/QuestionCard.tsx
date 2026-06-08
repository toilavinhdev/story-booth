type Props = {
  index: number; // 0-based
  total: number;
  text: string;
  fill: number; // 0..1 — mức đầy của khúc hiện tại
  fading?: boolean;
};

// Lớp phủ: thanh tiến độ chia khúc (kiểu iOS/Instagram Stories) + câu hỏi căn giữa + gợi ý chạm.
export function QuestionCard({ index, total, text, fill, fading }: Props) {
  const textStyle: React.CSSProperties = {
    transition: "opacity 0.4s ease, filter 0.4s ease, transform 0.4s ease",
    opacity: fading ? 0 : 1,
    filter: fading ? "blur(8px)" : "blur(0px)",
    transform: fading ? "scale(0.95)" : "scale(1)",
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-t from-black/70 via-black/10 to-black/45 p-4 sm:p-5">
      {/* thanh chia khúc — không bị ảnh hưởng bởi transition */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
              style={{
                width: i < index ? "100%" : i === index ? `${Math.min(fill, 1) * 100}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* câu hỏi + gợi ý — fade+blur khi chuyển */}
      <div className="flex flex-1 items-end justify-center" style={textStyle}>
        <div className="flex flex-col items-center gap-3 pb-2">
          <p className="max-w-[90%] text-center text-lg font-medium leading-relaxed text-white sm:text-xl">
            {text}
          </p>
          <p className="text-center text-sm text-white/70">Chạm để tiếp tục 💫</p>
        </div>
      </div>
    </div>
  );
}
