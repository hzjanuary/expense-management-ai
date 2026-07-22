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

  if (isCreateTransactionMessage(normalized)) {
    return "create_transaction";
  }

  if (isBudgetRemainingMessage(normalized)) {
    return "budget_remaining";
  }

  if (isSpendingBreakdownMessage(normalized)) {
    return "spending_breakdown";
  }

  if (isSpendingQueryMessage(normalized)) {
    return "query_spending";
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

function isSpendingQueryMessage(normalized: string): boolean {
  return mentionsThisMonth(normalized) && hasSpendingLanguage(normalized) && (
    hasTotalLanguage(normalized) || hasCategorySignal(normalized)
  );
}

function isBudgetRemainingMessage(normalized: string): boolean {
  return (
    mentionsThisMonth(normalized) &&
    includesAny(normalized, ["con bao nhieu", "ngan sach", "budget"]) &&
    includesAny(normalized, ["tien an", "an uong", "an ngoai", "food"])
  );
}

function isSpendingBreakdownMessage(normalized: string): boolean {
  if (
    includesAny(normalized, [
      "tuan nay toi tieu nhieu nhat vao muc nao",
      "tuan nay muc nao toi tieu nhieu nhat",
      "toi chi nhieu nhat vao dau tuan nay",
      "top chi tieu tuan nay",
    ])
  ) {
    return true;
  }

  return normalized.includes("tuan nay") && includesAny(normalized, [
    "tieu nhieu nhat",
    "chi nhieu nhat",
    "muc nao",
    "top chi",
  ]);
}

function isCreateTransactionMessage(normalized: string): boolean {
  return (
    hasMoneySignal(normalized) &&
    hasTransactionStatementSignal(normalized) &&
    !hasNonTransactionQuestionSignal(normalized)
  );
}

function mentionsThisMonth(normalized: string): boolean {
  return includesAny(normalized, [
    "thang nay",
    "thang hien tai",
    "dau thang",
    "tu dau thang",
    "ngay dau tien cua thang nay",
    "ke tu ngay dau tien cua thang nay",
    "this month",
  ]);
}

function hasSpendingLanguage(normalized: string): boolean {
  return includesAny(normalized, [
    "chi",
    "chi tieu",
    "chi phi",
    "cac khoan chi",
    "tieu",
    "da tieu",
    "da chi",
    "bao nhieu",
    "het bao nhieu",
    "het tien",
    "tien da tieu",
    "tien da chi",
    "tien roi khoi vi",
    "tien di ra",
    "vi da giam",
  ]);
}

function hasTotalLanguage(normalized: string): boolean {
  return includesAny(normalized, [
    "tong",
    "tong cong",
    "tat ca",
    "cong don",
    "dau thang",
    "aggregate",
    "all expense",
    "bao nhieu trong thang nay",
    "bao nhieu tien da chi",
    "tien da tieu",
    "tien roi khoi vi",
    "tien di ra",
    "vi da giam",
    "cac khoan chi",
    "chi phi trong thang",
    "thang nay het bao nhieu tien",
  ]);
}

function hasCategorySignal(normalized: string): boolean {
  return includesAny(normalized, [
    "an uong",
    "do an",
    "an sang",
    "an trua",
    "an toi",
    "com",
    "nha hang",
    "an ngoai",
    "food",
    "ca phe",
    "cafe",
    "coffee",
    "tra sua",
    "di lai",
    "di chuyen",
    "xang",
    "do xang",
    "taxi",
    "grab",
    "xe buyt",
    "transport",
    "mua sam",
    "quan ao",
    "shopping",
    "hoa don",
    "tien dien",
    "tien nuoc",
    "internet",
    "dien thoai",
    "tien nha",
    "thue nha",
    "tien thue",
    "suc khoe",
    "thuoc",
    "kham benh",
    "benh vien",
    "giao duc",
    "hoc phi",
    "sach vo",
    "khoa hoc",
    "giai tri",
    "xem phim",
    "tro choi",
    "game",
    "khac",
    "linh tinh",
  ]);
}

function hasMoneySignal(normalized: string): boolean {
  return /(^|\s)\d+(?:[.,]\d+)?\s*(k|nghin|ngan|tr|trieu|m)\b/.test(normalized) ||
    /(^|\s)\d{1,3}([ .]\d{3})+($|\s)/.test(normalized);
}

function hasTransactionStatementSignal(normalized: string): boolean {
  return includesAny(normalized, [
    "an",
    "uong",
    "mua",
    "tra",
    "thanh toan",
    "dong tien",
    "do xang",
    "xang",
    "di grab",
    "grab",
    "bat taxi",
    "taxi",
    "xem phim",
    "thue",
    "het",
    "ton",
    "chi",
    "tieu",
    "lam to",
    "quat ly",
    "nhan luong",
    "duoc tra luong",
    "nhan thuong",
    "duoc thuong",
    "nhan tien",
    "duoc cho",
    "tien ve",
    "thu nhap",
  ]);
}

function hasNonTransactionQuestionSignal(normalized: string): boolean {
  return (
    normalized.includes("?") ||
    includesAny(normalized, [
      "bao nhieu",
      "co dat khong",
      "toi con",
      "ngan sach",
      "neu ",
      "moi ngay",
      "thi sao",
    ])
  );
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
