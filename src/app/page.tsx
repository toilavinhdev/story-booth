import { RecordingFlow } from "@/components/RecordingFlow";
import { Sparkles } from "@/components/Sparkles";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center p-6">
      <Sparkles />
      <div className="relative z-10 flex w-full flex-col items-center">
        <RecordingFlow />
      </div>
    </main>
  );
}
