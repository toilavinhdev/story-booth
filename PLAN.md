# story-booth — Kế hoạch dự án

> Web ghi hình trả lời các câu hỏi cố định. Người dùng vào web → cấp quyền camera/mic →
> bấm "Bắt đầu" → câu hỏi hiện lên + tự động ghi hình → kết thúc → video được đóng gói
> (.webm) và gửi lên nơi lưu trữ.

Tham khảo demo: https://parenthood-reflection.lovable.app/

---

## 0. Nguyên tắc code

> **Ưu tiên rõ ràng & đơn giản, không cầu kỳ.** Tránh abstraction thừa, pattern không cần
> thiết, over-engineering. Component/hàm nhỏ, dễ đọc. Chỉ thêm độ phức tạp khi có lý do cụ thể
> (vd: storage adapter — vì sẽ chuyển sang Google Drive sau).

---

## 1. Nghiệp vụ (tóm tắt từ yêu cầu)

1. **Giao diện**: Khi truy cập web, trình duyệt hiện thông báo xin quyền Camera + Micro.
2. **Tương tác**: Sau khi bấm "Bắt đầu", câu hỏi hiện lên. Web tự động kích hoạt ghi hình (Record).
3. **Xử lý dữ liệu**: Khi kết thúc, video clip được tự động đóng gói (.webm/.mp4) và gửi về nơi lưu trữ.

Bổ sung từ trao đổi:
- Danh sách câu hỏi **cố định** (hardcode trong code, không cần DB).
- **MỘT phiên = MỘT video liên tục** (~5 phút, ~60–95 MB). Máy ghi xuyên suốt.
- Câu hỏi **tự nhảy** sang câu kế mỗi **~1 phút**; hết câu cuối thì dừng ghi.
- Cuối phiên chỉ upload **1 file duy nhất**.

---

## 2. Tech stack

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js (App Router)** | Có sẵn serverless function, deploy Vercel free |
| Ngôn ngữ | **TypeScript** | An toàn kiểu, dễ bảo trì adapter |
| Ghi hình | **MediaRecorder API** (native) | Không cần thư viện ngoài |
| Lưu trữ (mặc định) | **Cloudinary** | Free tier video thoáng, upload thẳng từ frontend |
| Deploy | **Vercel** (free, HTTPS sẵn) | Camera/mic bắt buộc HTTPS |
| Styling | Tailwind CSS | Nhanh, gọn |

---

## 3. Kiến trúc — Storage Adapter (điểm cốt lõi)

Yêu cầu: **sau này có thể chuyển sang Google Drive** mà không sửa phần ghi hình/UI.
Giải pháp: định nghĩa 1 interface chung, mỗi nơi lưu trữ là 1 implementation.

```
interface StorageAdapter {
  upload(blob: Blob, meta: UploadMeta): Promise<UploadResult>;
}

type UploadMeta = {
  fileName: string;        // vd: "2026-06-06_q1_uuid.webm"
  questionId: string;
  mimeType: string;        // "video/webm"
};

type UploadResult = {
  url?: string;            // link xem lại (nếu có)
  id: string;              // id/đường dẫn ở nơi lưu trữ
  provider: string;        // "cloudinary" | "google-drive" | ...
};
```

Implementations:
- `CloudinaryAdapter` — dùng ngay (unsigned upload preset, gọi thẳng từ browser).
- `GoogleDriveAdapter` — viết sau (qua API route Next.js + service account).

Chọn adapter qua biến môi trường `NEXT_PUBLIC_STORAGE_PROVIDER` → 1 factory trả về adapter tương ứng.
UI/recorder chỉ biết tới `StorageAdapter`, **không biết** đang lưu ở đâu.

---

## 4. Cấu trúc thư mục (dự kiến)

```
story-booth/
├── PLAN.md
├── .env.local                 # secrets (không commit)
├── .env.example               # mẫu biến môi trường
├── next.config.ts
├── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx            # màn hình chính (flow ghi hình)
│   │   ├── layout.tsx
│   │   └── api/
│   │       └── upload/route.ts # (dùng cho Google Drive sau này)
│   ├── components/
│   │   ├── PermissionGate.tsx  # xin quyền camera/mic
│   │   ├── QuestionCard.tsx    # hiện câu hỏi
│   │   ├── Recorder.tsx        # camera preview + MediaRecorder
│   │   └── UploadStatus.tsx    # trạng thái gửi (đang gửi / xong / lỗi)
│   ├── lib/
│   │   ├── questions.ts        # MẢNG CÂU HỎI CỐ ĐỊNH
│   │   └── storage/
│   │       ├── types.ts        # StorageAdapter, UploadMeta, UploadResult
│   │       ├── index.ts        # factory chọn adapter theo env
│   │       ├── cloudinary.ts   # CloudinaryAdapter
│   │       └── google-drive.ts # GoogleDriveAdapter (placeholder/sau)
│   └── hooks/
│       └── useRecorder.ts      # bọc logic getUserMedia + MediaRecorder
└── ...
```

---

## 5. Luồng người dùng (state machine)

```
idle
  └─(bấm "Cho phép")→ requesting-permission
        └─(ok)→ ready
              └─(bấm "Bắt đầu")→ recording  [GHI LIÊN TỤC 1 lần]
                    │   ├ hiện câu hỏi[i], chạy timer 60s
                    │   ├ hết 60s (hoặc bấm "Câu tiếp") → i++ → đổi câu (KHÔNG dừng ghi)
                    │   └ lặp tới khi hết câu cuối
                    └─(hết câu cuối / bấm "Kết thúc")→ processing  [stop → đóng gói 1 blob]
                          └─→ confirm  [hiện nút "Gửi" — KHÔNG xem lại video]
                                └─(bấm "Gửi")→ uploading  [adapter.upload() — 1 file]
                                      ├─(ok)→ done  ["Đã gửi thành công"]
                                      └─(lỗi)→ error  [retry, hoặc quay lại; blob giữ trong memory]
```

Điểm mấu chốt: **`MediaRecorder` chỉ start 1 lần và stop 1 lần.** Việc đổi câu hỏi chỉ là
thay đổi UI overlay + timer, hoàn toàn không động tới luồng ghi → đảm bảo ra 1 file liền mạch.

Lưu ý kỹ thuật:
- `getUserMedia` + `MediaRecorder` chỉ chạy trên **HTTPS/localhost**.
- iOS Safari: phải mở camera **trong** sự kiện bấm nút (user gesture) → nút "Bắt đầu" thỏa mãn.
- Định dạng: Chrome/Android → `.webm`; Safari/iOS → `.mp4`. Tự dò `MediaRecorder.isTypeSupported`.
- Giữ blob trong memory tới khi upload xong để còn **retry** nếu lỗi mạng.
- (Tùy chọn) đặt giới hạn thời lượng tối đa (vd 5 phút) để chặn file quá nặng.

---

## 6. Câu hỏi cố định

Khai báo trong `src/lib/questions.ts` (5 câu, ~1 phút/câu, tổng ~5 phút):

```
export const QUESTIONS = [
  { id: "q1", text: "Một kỷ niệm hoặc khoảnh khắc bên gia đình mà bạn muốn giữ lại mãi mãi là gì?" },
  { id: "q2", text: "Trong gia đình, bạn thường chia sẻ nhiều nhất với ai? Vì sao?" },
  { id: "q3", text: "Điều gì khiến bạn luôn muốn trở về nhà, dù đi đâu hay làm gì?" },
  { id: "q4", text: "Nếu được nói một câu với gia đình ngay lúc này, bạn sẽ nói gì?" },
  { id: "q5", text: "Sau tất cả, gia đình có ý nghĩa như thế nào đối với bạn?" },
];

export const SECONDS_PER_QUESTION = 60;
```

Flow: ghi 1 video liên tục; mỗi câu hiển thị 60s rồi tự nhảy câu kế; hết câu 5 → dừng → upload 1 file.

---

## 7. Biến môi trường

```
# .env.example
NEXT_PUBLIC_STORAGE_PROVIDER=cloudinary      # cloudinary | google-drive

# Cloudinary (unsigned upload — an toàn để public)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=xxx

# Google Drive (chỉ ở server, KHÔNG public) — dùng sau
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_DRIVE_FOLDER_ID=
```

---

## 8. Các bước triển khai (phases)

- [x] **P0 — Khởi tạo**: Next.js + TS + Tailwind, cấu trúc thư mục, `StorageAdapter`.
- [x] **P1 — Ghi hình**: `useRecorder` (getUserMedia + MediaRecorder), `PermissionGate`, `Recorder`, preview.
- [x] **P2 — Flow câu hỏi**: state machine intro→…→done, `QuestionCard`, câu hỏi cố định.
- [x] **P3 — Upload Cloudinary**: `CloudinaryAdapter`, `UploadStatus`, tên file + metadata, retry.
- [x] **P4 — Hoàn thiện UI**: tông màu ấm, responsive, cảnh báo đóng tab (D1) + rời màn hình (D2).
- [ ] **P5 — Deploy Vercel** (khách tự làm): cấu hình env, kiểm tra HTTPS camera/mic trên điện thoại.
- **P6 (sau) — Google Drive**: viết `GoogleDriveAdapter` + `api/upload/route.ts` (service account, resumable upload), đổi `NEXT_PUBLIC_STORAGE_PROVIDER=google-drive`.

---

## 9. Checklist — ĐÃ CHỐT VỚI KHÁCH

> `[x]` = làm trong MVP · `[~]` = phase sau / không làm.

### Flow lõi
- [x] **1 video liên tục**, câu hỏi tự nhảy mỗi ~1 phút, cuối phiên upload 1 file.
- [x] **5 câu** (xem mục 6), 60s/câu, tổng ~5 phút.

### A. Luồng & tương tác
- [x] **A1. Nút "Câu tiếp"**: có — bấm qua sớm được, vẫn auto sau 60s.
- [x] **A2. Đếm ngược 3-2-1** trước khi ghi.
- [x] **A3. Màn intro** ngắn (đây là gì, ~5 phút, 5 câu).
- [~] **A4. Màn cảm ơn (cầu kỳ + ghi phiên mới)**: PHASE SAU. MVP chỉ hiện thông báo
      "Đã gửi thành công" đơn giản.
- [~] **A5. Đọc câu hỏi bằng TTS**: PHASE SAU.

### B. Người dùng & quyền riêng tư
- [x] **B1. Hỏi TÊN** trước khi bắt đầu (không bắt buộc email) → gắn vào tên file/metadata.
- [x] **B2. Consent**: có thông báo thu + ô tick "Tôi đồng ý" trước khi ghi.
      → **Còn chờ khách cung cấp nội dung thông báo** (mục đích, lưu ở đâu, ai xem, lưu bao lâu).
      → *Tạm dùng văn bản placeholder cho tới khi khách gửi nội dung chính thức.*

### C. Xử lý sau khi ghi
- [x] **C1. KHÔNG xem lại**. Ghi xong hiện 1 nút **"Gửi"** để xác nhận → upload luôn.
- [x] **C2. Upload lỗi**: cho **retry**; nếu vẫn lỗi thì **quay lại** (KHÔNG có nút tải về).

### D. Độ tin cậy & an toàn dữ liệu
- [x] **D1. Cảnh báo đóng tab** khi đang ghi/upload (`beforeunload`).
- [x] **D2. Cảnh báo rời màn hình** trên mobile (khóa máy / cuộc gọi / chuyển tab).
- [x] **D3. Xử lý từ chối quyền / không có camera-mic** (màn hướng dẫn bật lại).

### E. Vận hành & quản lý
- [~] **E1. Mã truy cập**: KHÔNG làm (chỉ là demo).
- [x] **E2. Tên file + metadata**: `{ngày-giờ}_{tên}_{id}.webm` + thời lượng/thiết bị.
- [x] **E3. Camera TRƯỚC** (selfie), ~720p.
- [x] **E4. Lưu ở Cloudinary** (Google Drive để phase sau, đã tách adapter).

### Tóm tắt phạm vi MVP
Làm: A1–A3, B1–B2, C1–C2, D1–D3, E2–E4.
Phase sau: A4 (màn cảm ơn cầu kỳ), A5 (TTS), Google Drive adapter.
Đang chờ khách: **nội dung consent (B2)** — code trước bằng placeholder.

---

## 10. Chi phí & rủi ro

- Toàn bộ **miễn phí** ở quy mô demo/nhỏ (Vercel Hobby + Cloudinary free).
- Rủi ro: Cloudinary free giới hạn ~100MB/file → nếu video > 5 phút cần cân nhắc nén hoặc đổi storage.
- Google Drive (P6) cần setup service account — phức tạp hơn nhưng đã tách adapter nên không ảnh hưởng phần khác.
