"use client";

import { ClearAiHistory } from "@/components/clear-ai-history";

const OLLAMA_MODEL = "qwen3:4b-instruct";

export function SettingsClient() {
  return (
    <div className="grid max-w-5xl gap-8">
      <section className="border-b border-ledger-line pb-7">
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            <h2 className="text-xl font-semibold text-ledger-ink">
              Trợ lý cục bộ
            </h2>
            <p className="mt-1 text-sm text-ledger-muted">
              Ollama là tùy chọn.
            </p>
          </div>
          <div className="grid gap-4 text-base leading-7 text-ledger-muted">
          <p>
            Mặc định ứng dụng không bật Ollama. Khi AI cục bộ chưa bật, các yêu
            cầu AI sẽ báo rõ là trợ lý chưa sẵn sàng, không tự tạo số liệu mẫu.
          </p>
          <p>
            Model đang khuyến nghị:{" "}
            <span className="font-semibold text-ledger-ink">{OLLAMA_MODEL}</span>.
          </p>
          <details className="rounded-md border border-ledger-line bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-ledger-ink">
              Lệnh chuẩn bị Ollama
            </summary>
            <p className="font-semibold text-ledger-ink">
              Chuẩn bị Ollama trên máy này
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-white p-3 text-xs text-ledger-ink">
{`ollama pull ${OLLAMA_MODEL}
ollama list
ollama serve`}
            </pre>
          </details>
          <p>
            Ứng dụng không tự tải model khi build Docker, khởi động, chạy test
            hoặc chạy E2E. Bạn cần tự tải model nếu muốn dùng AI thật.
          </p>
        </div>
        </div>
      </section>

      <section className="border-b border-ledger-line pb-7">
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            <h2 className="text-xl font-semibold text-ledger-ink">
              Dữ liệu cục bộ
            </h2>
            <p className="mt-1 text-sm text-ledger-muted">
              Dữ liệu nằm trên máy này.
            </p>
          </div>
          <div className="grid gap-4 text-base leading-7 text-ledger-muted">
          <p>
            Giao dịch, ngân sách và bản nháp AI được lưu trong SQLite cục bộ
            của ứng dụng. Dừng ứng dụng bình thường sẽ giữ dữ liệu cho lần mở
            tiếp theo.
          </p>
          <details className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-amber-900">
              Xem cảnh báo kỹ thuật về xóa dữ liệu
            </summary>
            <p className="mt-3 text-sm leading-6 text-amber-900">
              Xóa Docker volume sẽ làm mất dữ liệu cục bộ. Chỉ thực hiện theo
              tài liệu xử lý sự cố khi bạn chắc chắn muốn làm trống dữ liệu.
            </p>
          </details>
          <a
            className="font-semibold text-ledger-accent underline-offset-4 hover:underline"
            href="https://github.com/hzjanuary/expense-management-ai/blob/main/docs/TROUBLESHOOTING.md"
            rel="noreferrer"
            target="_blank"
          >
            Xem hướng dẫn xử lý sự cố
          </a>
        </div>
        </div>
      </section>

      <div>
        <ClearAiHistory />
      </div>
    </div>
  );
}
