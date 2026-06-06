// Lớp icon trang trí rải quanh màn hình, nhấp nháy + bồng bềnh. Thuần trang trí.
const ITEMS = [
  { e: "✨", top: "12%", left: "9%", cls: "text-2xl text-amber-300" },
  { e: "💗", top: "8%", left: "76%", cls: "text-3xl text-pink-300" },
  { e: "⭐", top: "22%", left: "88%", cls: "text-xl text-yellow-400" },
  { e: "🌸", top: "36%", left: "5%", cls: "text-2xl text-rose-300" },
  { e: "✨", top: "50%", left: "93%", cls: "text-lg text-violet-300" },
  { e: "🦋", top: "64%", left: "11%", cls: "text-2xl text-sky-300" },
  { e: "🌟", top: "70%", left: "84%", cls: "text-xl text-amber-300" },
  { e: "💛", top: "84%", left: "20%", cls: "text-2xl text-yellow-300" },
  { e: "✨", top: "86%", left: "68%", cls: "text-lg text-pink-300" },
  { e: "⭐", top: "16%", left: "44%", cls: "text-sm text-violet-300" },
  { e: "🌸", top: "30%", left: "70%", cls: "text-lg text-rose-300" },
  { e: "💗", top: "90%", left: "46%", cls: "text-xl text-pink-200" },
];

export function Sparkles() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className={`sparkle absolute ${it.cls}`}
          style={{
            top: it.top,
            left: it.left,
            animationDelay: `${(i % 6) * 0.45}s, ${(i % 5) * 0.6}s`,
          }}
        >
          {it.e}
        </span>
      ))}
    </div>
  );
}
