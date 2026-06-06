"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { Recorder } from "@/components/Recorder";
import { useRecorder } from "@/hooks/useRecorder";

export default function Home() {
  const rec = useRecorder();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">story-booth</h1>

      <PermissionGate status={rec.status} error={rec.error} onRequest={rec.requestPermission}>
        <Recorder
          stream={rec.stream}
          status={rec.status}
          onStart={rec.start}
          onStop={rec.stop}
        />

        {rec.status === "stopped" && rec.recordedBlob && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-foreground/60">
              Đã ghi xong · {(rec.recordedBlob.size / 1_000_000).toFixed(1)} MB ·{" "}
              {(rec.durationMs / 1000).toFixed(0)}s
            </p>
            <button
              onClick={rec.reset}
              className="rounded-full border border-foreground/20 px-6 py-2.5 font-medium transition-colors hover:bg-foreground/5"
            >
              Ghi lại
            </button>
          </div>
        )}
      </PermissionGate>
    </main>
  );
}
