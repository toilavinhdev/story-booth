type Props = {
  index: number; // 0-based
  total: number;
  text: string;
  fill: number; // 0..1 — mức đầy của khúc hiện tại
};

// Lớp phủ: thanh tiến độ chia khúc (kiểu iOS/Instagram Stories) + câu hỏi căn giữa + gợi ý chạm.
export function QuestionCard({ index, total, text, fill }: Props) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-t from-black/70 via-black/10 to-black/45 p-4 sm:p-5">
      {/* thanh chia khúc */}
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

      {/* câu hỏi */}
      <div className="flex flex-1 items-end justify-center">
        <p className="max-w-[90%] pb-2 text-center text-lg font-medium leading-relaxed text-white sm:text-xl">
          {text}
        </p>
      </div>

      {/* gợi ý chạm */}
      <p className="pt-3 text-center text-sm text-white/70">Chạm để tiếp tục 💫</p>
    </div>
  );
}
