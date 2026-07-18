"use client";

import { ClearAiHistory } from "@/components/clear-ai-history";
import { panelClassName } from "@/components/ui";

const OLLAMA_MODEL = "qwen3:4b-instruct";

export function SettingsClient() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
      <section className={panelClassName}>
        <h2 className="text-lg font-semibold text-ledger-ink">
          AI cục bộ và Ollama
        </h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-ledger-muted">
          <p>
            Mặc định ứng dụng không bật Ollama. Khi AI cục bộ chưa bật, các yêu
            cầu AI sẽ báo rõ là trợ lý chưa sẵn sàng, không tự tạo số liệu mẫu.
          </p>
          <p>
            Model đang khuyến nghị:{" "}
            <span className="font-semibold text-ledger-ink">{OLLAMA_MODEL}</span>.
          </p>
          <div className="rounded-md border border-ledger-line bg-ledger-wash p-3">
            <p className="font-semibold text-ledger-ink">
              Chuẩn bị Ollama trên máy này
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-white p-3 text-xs text-ledger-ink">
{`ollama pull ${OLLAMA_MODEL}
ollama list
ollama serve`}
            </pre>
          </div>
          <p>
            Ứng dụng không tự tải model khi build Docker, khởi động, chạy test
            hoặc chạy E2E. Bạn cần tự tải model nếu muốn dùng AI thật.
          </p>
        </div>
      </section>

      <section className={panelClassName}>
        <h2 className="text-lg font-semibold text-ledger-ink">
          Dữ liệu cục bộ
        </h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-ledger-muted">
          <p>
            SQLite được lưu trong Docker volume cục bộ. Lệnh{" "}
            <code className="rounded bg-ledger-wash px-1 py-0.5">
              docker compose down
            </code>{" "}
            giữ dữ liệu.
          </p>
          <p>
            Lệnh{" "}
            <code className="rounded bg-ledger-wash px-1 py-0.5">
              docker compose down -v
            </code>{" "}
            là thao tác phá hủy volume và xóa dữ liệu cục bộ. Chỉ chạy lệnh này
            khi bạn chắc chắn muốn làm trống dữ liệu trên máy.
          </p>
          <a
            className="font-semibold text-ledger-accent underline-offset-4 hover:underline"
            href="https://github.com/hzjanuary/expense-management-ai/blob/main/docs/TROUBLESHOOTING.md"
            rel="noreferrer"
            target="_blank"
          >
            Xem hướng dẫn xử lý sự cố
          </a>
        </div>
      </section>

      <div className="xl:col-span-2">
        <ClearAiHistory />
      </div>
    </div>
  );
}
