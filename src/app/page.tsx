import { QUESTIONS } from "@/lib/questions";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">story-booth</h1>
      <p className="max-w-md text-foreground/60">
        Ghi lại câu trả lời của bạn về gia đình. Giao diện ghi hình sẽ được xây ở bước tiếp theo (P1).
      </p>
      <p className="text-sm text-foreground/40">{QUESTIONS.length} câu hỏi · ~5 phút</p>
    </main>
  );
}
