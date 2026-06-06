type Props = {
  index: number; // 0-based
  total: number;
  text: string;
  secondsLeft: number;
};

// Lớp phủ hiển thị câu hỏi hiện tại + tiến độ + thời gian còn lại, đặt lên video.
export function QuestionCard({ index, total, text, secondsLeft }: Props) {
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/40 p-4 sm:p-6">
      {/* Căn phải để không đè lên chấm REC ở góc trên-trái */}
      <div className="flex justify-end">
        <span className="rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white/90">
          Câu {index + 1}/{total} · {secondsLeft}s
        </span>
      </div>
      <p className="text-lg font-medium text-white drop-shadow sm:text-2xl">{text}</p>
    </div>
  );
}
