"use client";

import { ClearAiHistory } from "@/components/clear-ai-history";
import { THEME_OPTIONS } from "@/lib/theme";
import { useTheme } from "@/components/theme-provider";

const OLLAMA_MODEL = "qwen3:4b-instruct";

export function SettingsClient() {
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <div className="grid max-w-5xl gap-8">
      <section className="border-b border-ledger-line pb-7">
        <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            <h2 className="text-xl font-semibold text-ledger-ink">
              Giao diện
            </h2>
            <p className="mt-1 text-sm text-ledger-muted">
              Chọn cách Pocket Ledger hiển thị trên thiết bị này.
            </p>
          </div>
          <fieldset>
            <legend className="sr-only">Giao diện</legend>
            <div
              aria-label="Giao diện"
              className="grid gap-2 rounded-md border border-ledger-line bg-ledger-panel p-1 sm:inline-grid sm:grid-cols-3"
              role="radiogroup"
            >
              {THEME_OPTIONS.map((option) => {
                const isSelected = mode === option.value;
                return (
                  <label
                    className={[
                      "flex min-h-10 cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ledger-focus",
                      isSelected
                        ? "border border-ledger-accent bg-ledger-accent-soft text-ledger-accent"
                        : "border border-transparent text-ledger-muted hover:bg-ledger-wash hover:text-ledger-ink",
                    ].join(" ")}
                    key={option.value}
                  >
                    <input
                      checked={isSelected}
                      className="sr-only"
                      name="theme-mode"
                      onChange={() => setMode(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span>{option.label}</span>
                    {isSelected ? (
                      <span className="sr-only">
                        {" "}
                        đang chọn, giao diện hiện là{" "}
                        {resolvedTheme === "dark" ? "tối" : "sáng"}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

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
            <details className="rounded-md border border-ledger-line bg-ledger-panel p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ledger-ink">
                Lệnh chuẩn bị Ollama
              </summary>
              <p className="font-semibold text-ledger-ink">
                Chuẩn bị Ollama trên máy này
              </p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-ledger-code p-3 text-xs text-ledger-ink">
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
            <details className="rounded-md border border-ledger-warning bg-ledger-warning-soft p-4">
              <summary className="cursor-pointer text-sm font-semibold text-ledger-warning">
                Xem cảnh báo kỹ thuật về xóa dữ liệu
              </summary>
              <p className="mt-3 text-sm leading-6 text-ledger-warning">
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
