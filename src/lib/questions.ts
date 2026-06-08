export type Question = { id: string; text: string };
export type Role = "parent" | "child";

export const CHILD_QUESTIONS: Question[] = [
  { id: "c1", text: "Một kỷ niệm hoặc khoảnh khắc bên gia đình mà bạn muốn giữ lại mãi mãi là gì?" },
  { id: "c2", text: "Trong gia đình, bạn thường chia sẻ nhiều nhất với ai? Vì sao?" },
  { id: "c3", text: "Điều gì khiến bạn luôn muốn trở về nhà, dù đi đâu hay làm gì?" },
  { id: "c4", text: "Nếu được nói một câu với gia đình ngay lúc này, bạn sẽ nói gì?" },
  { id: "c5", text: "Sau tất cả, gia đình có ý nghĩa như thế nào đối với bạn?" },
];

export const PARENT_QUESTIONS: Question[] = [
  { id: "p1", text: "Khi nghĩ đến con, điều gì hiện lên đầu tiên trong tâm trí bạn?" },
  { id: "p2", text: "Điều gì khiến bạn tự hào nhất về con?" },
  { id: "p3", text: "Điều gì ở con mà bây giờ khiến bạn yên tâm hơn trước đây?" },
  { id: "p4", text: "Có lời nào bạn luôn muốn nói với con nhưng chưa từng nói ra?" },
  { id: "p5", text: "Điều bạn mong con luôn ghi nhớ trên hành trình trưởng thành là gì?" },
];

export const SECONDS_PER_QUESTION = 60;
