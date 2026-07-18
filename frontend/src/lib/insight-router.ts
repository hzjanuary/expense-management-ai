import type { SupportedChatIntent } from "@/lib/ai";

export type RoutedChatIntent = Exclude<SupportedChatIntent, "auto"> | "unknown";

export type ChatQuickAction = {
  intent: Exclude<SupportedChatIntent, "auto">;
  label: string;
  example: string;
};

export const CHAT_QUICK_ACTIONS: ChatQuickAction[] = [
  {
    intent: "create_transaction",
    label: "Thêm chi tiêu",
    example: "Hôm nay tôi tiêu 35k vào ăn trưa",
  },
  {
    intent: "query_spending",
    label: "Chi tiêu tháng này",
    example: "Tháng này tôi ăn uống hết bao nhiêu?",
  },
  {
    intent: "budget_remaining",
    label: "Ngân sách còn lại",
    example: "Còn bao nhiêu tiền ăn tháng này?",
  },
  {
    intent: "spending_breakdown",
    label: "Chi nhiều nhất tuần này",
    example: "Tuần này tôi tiêu nhiều nhất vào mục nào?",
  },
];

export function routeChatIntent(
  message: string,
  selectedIntent: SupportedChatIntent,
): RoutedChatIntent {
  if (selectedIntent !== "auto") {
    return selectedIntent;
  }

  const normalized = normalizeMessage(message);

  if (
    includesAny(normalized, [
      "thang nay toi an uong het bao nhieu",
      "thang nay toi an ngoai het bao nhieu",
      "thang nay toi tieu cho food het bao nhieu",
    ])
  ) {
    return "query_spending";
  }

  if (
    normalized.includes("con bao nhieu") &&
    includesAny(normalized, [
      "tien an",
      "ngan sach an",
      "budget food",
      "an uong",
      "an ngoai",
    ])
  ) {
    return "budget_remaining";
  }

  if (
    includesAny(normalized, [
      "tuan nay toi tieu nhieu nhat vao muc nao",
      "tuan nay muc nao toi tieu nhieu nhat",
      "toi chi nhieu nhat vao dau tuan nay",
      "top chi tieu tuan nay",
    ])
  ) {
    return "spending_breakdown";
  }

  if (
    normalized.includes("tieu") &&
    includesAny(normalized, ["35k", "an trua", "hom nay"])
  ) {
    return "create_transaction";
  }

  return "unknown";
}

export function formatIntentLabel(intent: RoutedChatIntent | SupportedChatIntent): string {
  switch (intent) {
    case "create_transaction":
      return "Tạo giao dịch";
    case "query_spending":
      return "Hỏi chi tiêu";
    case "budget_remaining":
      return "Ngân sách còn lại";
    case "spending_breakdown":
      return "Phân tích chi tiêu";
    case "auto":
      return "Tự chọn";
    case "unknown":
      return "Cần làm rõ";
    default:
      return intent;
  }
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function normalizeMessage(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}
