export type AppRoute = {
  description: string;
  href: "/dashboard" | "/transactions" | "/budgets" | "/assistant" | "/settings";
  icon: "home" | "transactions" | "budgets" | "assistant" | "settings";
  label: string;
};

export const APP_ROUTES: AppRoute[] = [
  {
    description: "Số dư, thu chi tháng này và các lối tắt chính.",
    href: "/dashboard",
    icon: "home",
    label: "Tổng quan",
  },
  {
    description: "Danh sách, xuất dữ liệu và xóa mềm giao dịch.",
    href: "/transactions",
    icon: "transactions",
    label: "Giao dịch",
  },
  {
    description: "Thiết lập và theo dõi ngân sách tháng.",
    href: "/budgets",
    icon: "budgets",
    label: "Ngân sách",
  },
  {
    description: "Nhập giao dịch bằng AI và hỏi các câu insight.",
    href: "/assistant",
    icon: "assistant",
    label: "Trợ lý AI",
  },
  {
    description: "Cấu hình AI cục bộ và quyền riêng tư lịch sử AI.",
    href: "/settings",
    icon: "settings",
    label: "Cài đặt",
  },
];

export function findAppRoute(pathname: string): AppRoute {
  return (
    APP_ROUTES.find((route) => pathname.startsWith(route.href)) ?? APP_ROUTES[0]
  );
}
