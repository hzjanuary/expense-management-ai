export type AppRoute = {
  description: string;
  href: "/dashboard" | "/transactions" | "/budgets" | "/assistant" | "/settings";
  icon: "home" | "transactions" | "budgets" | "assistant" | "settings";
  label: string;
};

export const APP_ROUTES: AppRoute[] = [
  {
    description: "Xem nhanh số dư, thu chi tháng này và các lối tắt chính.",
    href: "/dashboard",
    icon: "home",
    label: "Tổng quan",
  },
  {
    description: "Xem, lọc, tải xuống và xóa giao dịch sai.",
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
    description: "Ghi giao dịch bằng trợ lý và hỏi nhanh về chi tiêu.",
    href: "/assistant",
    icon: "assistant",
    label: "Trợ lý",
  },
  {
    description: "Xem hướng dẫn AI cục bộ và xóa lịch sử AI khi cần.",
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
