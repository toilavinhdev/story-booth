# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-scaffold. Only `PLAN.md`, `README.md`, and `.gitignore` exist — the Next.js app has not
been generated yet. `PLAN.md` is the source of truth: it holds the business flow, the 5 fixed
questions, the decision checklist (section 9), and the 6 implementation phases (P0–P6).

## What this app does

Records a user answering 5 fixed questions about family. One session = **one continuous video**:
the user grants camera/mic access, presses "Start", and `MediaRecorder` records straight through
while the on-screen question auto-advances every ~60s. At the end, a single `.webm` is uploaded.

The critical invariant: **`MediaRecorder` starts once and stops once.** Advancing questions only
changes UI overlay + timer state — it must never touch the recording stream, or the output splits
into multiple files.

## Stack & commands

Next.js (App Router) + TypeScript + Tailwind. Deploy target is Vercel.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

> Camera/mic APIs only work over HTTPS or localhost.

## Architecture: storage adapter (the one deliberate abstraction)

Storage is hidden behind a single `StorageAdapter` interface so the upload destination can change
without touching recording or UI code. Default is Cloudinary (unsigned upload straight from the
browser); a `GoogleDriveAdapter` (service account + Next.js API route) is planned for a later phase.

- Interface + types: `src/lib/storage/types.ts`
- Factory selecting an adapter from `NEXT_PUBLIC_STORAGE_PROVIDER`: `src/lib/storage/index.ts`
- UI/recorder code only ever calls `adapter.upload(blob, meta)` — never a provider directly.
- Fixed questions live in `src/lib/questions.ts` (hardcoded, no DB).

## Conventions

- **Keep code clear and simple — not over-engineered.** Avoid unnecessary abstraction and
  patterns. The storage adapter is the one exception, justified by the planned Google Drive switch.
- Secrets go in `.env.local` (gitignored). Only `NEXT_PUBLIC_*` vars reach the browser — never put
  Google service-account credentials in a `NEXT_PUBLIC_` var.
