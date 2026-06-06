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
                          └─→ uploading  [adapter.upload() — 1 file]
                                ├─(ok)→ done
                                └─(lỗi)→ error  [cho retry upload, blob giữ trong memory]
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

- **P0 — Khởi tạo**: tạo Next.js + TS + Tailwind, dựng cấu trúc thư mục, định nghĩa `StorageAdapter`.
- **P1 — Ghi hình**: `useRecorder` (getUserMedia + MediaRecorder), `PermissionGate`, `Recorder`, preview.
- **P2 — Flow câu hỏi**: state machine idle→…→done, `QuestionCard`, danh sách câu hỏi cố định.
- **P3 — Upload Cloudinary**: `CloudinaryAdapter`, `UploadStatus`, retry khi lỗi.
- **P4 — Hoàn thiện UI**: styling theo demo, responsive, mobile (iOS) check.
- **P5 — Deploy Vercel**: cấu hình env, kiểm tra HTTPS camera/mic thật trên điện thoại.
- **P6 (sau) — Google Drive**: viết `GoogleDriveAdapter` + `api/upload/route.ts` (service account, resumable upload), đổi `NEXT_PUBLIC_STORAGE_PROVIDER=google-drive`.

---

## 9. Checklist chốt với khách hàng

> Mỗi mục có **Đề xuất** sẵn — khách chỉ cần duyệt hoặc đổi. `[x]` = đã chốt, `[ ]` = chờ chốt.

### Đã chốt
- [x] **Flow câu hỏi**: 1 video liên tục, câu hỏi tự nhảy mỗi ~1 phút, cuối phiên upload 1 file.
- [x] **Số câu + nội dung**: 5 câu (xem mục 6), 60s/câu, tổng ~5 phút.

### A. Luồng & tương tác
- [ ] **A1. Nút "Câu tiếp"**: 60s tự nhảy — có cho bấm qua sớm không?
      → *Đề xuất: CÓ nút "Câu tiếp" (trả lời xong qua luôn, vẫn auto sau 60s).*
- [ ] **A2. Đếm ngược trước khi ghi**: hiện 3-2-1 cho người ta sẵn sàng?
      → *Đề xuất: CÓ, đếm ngược 3 giây.*
- [ ] **A3. Màn intro**: giới thiệu "đây là gì, mất ~5 phút, 5 câu" trước khi bắt đầu?
      → *Đề xuất: CÓ, 1 màn hình intro ngắn.*
- [ ] **A4. Màn cảm ơn**: sau khi gửi xong hiện lời cảm ơn + cho ghi phiên mới?
      → *Đề xuất: CÓ.*
- [ ] **A5. Đọc câu hỏi bằng giọng nói (TTS)**: vì người nhìn camera, không nhìn màn hình.
      → *Đề xuất: PHASE SAU (nice-to-have).*

### B. Người dùng & quyền riêng tư
- [ ] **B1. Thu thông tin người dùng**: ẩn danh, hay hỏi tên/email trước?
      → *Đề xuất: hỏi TÊN (không bắt buộc email) để gắn vào tên file/metadata.*
- [ ] **B2. Đồng ý & quyền riêng tư (consent)**: thông báo thu để làm gì + ô tick "Tôi đồng ý"?
      → *Đề xuất: CÓ (thu video nhận diện danh tính → nên có về mặt pháp lý/tin tưởng).*
      → **Cần khách cung cấp**: nội dung thông báo (mục đích thu, lưu ở đâu, ai xem, lưu bao lâu).

### C. Xử lý sau khi ghi
- [ ] **C1. Xem lại trước khi gửi**: cho xem lại + "Ghi lại"/"Gửi", hay ghi xong gửi luôn?
      → *Đề xuất: CÓ xem lại trước khi gửi.*
- [ ] **C2. Fallback khi upload lỗi**: cho tải video về máy nếu mạng lỗi?
      → *Đề xuất: CÓ (retry + nút tải về) — tránh mất công ghi.*

### D. Độ tin cậy & an toàn dữ liệu (kỹ thuật)
- [ ] **D1. Cảnh báo đóng tab khi đang ghi/upload** (`beforeunload`).
      → *Đề xuất: CÓ — bắt buộc, tránh mất video.*
- [ ] **D2. Phát hiện rời màn hình trên mobile** (khóa máy / cuộc gọi / chuyển tab làm dừng ghi).
      → *Đề xuất: CÓ cảnh báo "đừng rời màn hình khi đang ghi".*
- [ ] **D3. Xử lý từ chối quyền / không có camera-mic**: màn hướng dẫn bật lại quyền.
      → *Đề xuất: CÓ — bắt buộc.*

### E. Vận hành & quản lý
- [ ] **E1. Mã truy cập (access code)**: chặn người lạ upload làm đầy storage free?
      → *Đề xuất: CÓ 1 mã đơn giản nếu link công khai; bỏ nếu chỉ dùng nội bộ/sự kiện.*
- [ ] **E2. Quy ước tên file + metadata**: `{ngày-giờ}_{tên}_{id}.webm` + thời lượng/thiết bị.
      → *Đề xuất: theo mẫu trên.*
- [ ] **E3. Camera mặc định**: trước (selfie) hay sau?
      → *Đề xuất: camera TRƯỚC, ~720p để cân bằng dung lượng.*
- [ ] **E4. Nơi lưu chính thức**: Cloudinary (mặc định) hay bắt buộc Google Drive?
      → *Đề xuất: Cloudinary cho MVP; Google Drive làm phase sau (đã tách adapter).*

### Tóm tắt phạm vi MVP (đề xuất)
Làm: A1–A4, B1–B2, C1–C2, D1–D3, E2–E3 (+ E1 nếu link công khai).
Để phase sau: A5 (TTS), E4 (Google Drive), metadata nâng cao.

---

## 10. Chi phí & rủi ro

- Toàn bộ **miễn phí** ở quy mô demo/nhỏ (Vercel Hobby + Cloudinary free).
- Rủi ro: Cloudinary free giới hạn ~100MB/file → nếu video > 5 phút cần cân nhắc nén hoặc đổi storage.
- Google Drive (P6) cần setup service account — phức tạp hơn nhưng đã tách adapter nên không ảnh hưởng phần khác.
