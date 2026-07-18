"use client";

import { useState } from "react";

import { ChatToLedger } from "@/components/chat-to-ledger";
import { Button } from "@/components/ui";

export function AssistantWorkspace() {
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [conversationKey, setConversationKey] = useState(0);

  function handleFinancialDataChanged() {
    setRefreshRevision((currentValue) => currentValue + 1);
  }

  function handleNewConversation() {
    setConversationKey((currentValue) => currentValue + 1);
  }

  return (
    <div className="grid h-[calc(100vh-12rem)] min-h-[640px] gap-4 sm:h-[calc(100vh-11rem)] sm:min-h-[680px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-ledger-line bg-ledger-panel shadow-soft">
        <div className="flex flex-col gap-3 border-b border-ledger-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ledger-ink">
              Trợ lý tài chính
            </h2>
            <p className="mt-1 text-sm text-ledger-muted">
              Trợ lý có thể ghi nháp giao dịch hoặc trả lời câu hỏi chi tiêu.
              Sổ tiền chỉ thay đổi sau khi bạn bấm xác nhận.
            </p>
          </div>
          <Button
            onClick={handleNewConversation}
            type="button"
            variant="outline"
          >
            Cuộc trò chuyện mới
          </Button>
        </div>
        <ChatToLedger
          key={conversationKey}
          layout="workspace"
          onTransactionConfirmed={handleFinancialDataChanged}
          refreshSignal={refreshRevision}
        />
      </section>
    </div>
  );
}
