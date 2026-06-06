export type Question = { id: string; text: string };

// Câu hỏi cố định — 5 câu, mỗi câu ~60s, tổng ~5 phút.
export const QUESTIONS: Question[] = [
  { id: "q1", text: "Một kỷ niệm hoặc khoảnh khắc bên gia đình mà bạn muốn giữ lại mãi mãi là gì?" },
  { id: "q2", text: "Trong gia đình, bạn thường chia sẻ nhiều nhất với ai? Vì sao?" },
  { id: "q3", text: "Điều gì khiến bạn luôn muốn trở về nhà, dù đi đâu hay làm gì?" },
  { id: "q4", text: "Nếu được nói một câu với gia đình ngay lúc này, bạn sẽ nói gì?" },
  { id: "q5", text: "Sau tất cả, gia đình có ý nghĩa như thế nào đối với bạn?" },
];

export const SECONDS_PER_QUESTION = 60;
