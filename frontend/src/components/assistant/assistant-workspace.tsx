"use client";

import { useState } from "react";

import { ChatToLedger } from "@/components/chat-to-ledger";
import { Button } from "@/components/ui";

export function AssistantWorkspace() {
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [conversationKey, setConversationKey] = useState(0);
  const [hasConversation, setHasConversation] = useState(false);

  function handleFinancialDataChanged() {
    setRefreshRevision((currentValue) => currentValue + 1);
  }

  function handleNewConversation() {
    setConversationKey((currentValue) => currentValue + 1);
    setHasConversation(false);
  }

  return (
    <section
      aria-labelledby="assistant-workspace-heading"
      className="flex h-[calc(100vh-8.75rem)] min-h-[620px] min-w-0 flex-col overflow-hidden sm:h-[calc(100vh-8rem)]"
    >
      <div
        className={
          hasConversation
            ? "hidden gap-3 border-b border-ledger-line pb-4 sm:flex sm:flex-row sm:items-center sm:justify-between"
            : "flex flex-col gap-3 border-b border-ledger-line pb-4 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <div>
          <p
            className="text-sm text-ledger-muted"
            id="assistant-workspace-heading"
          >
            Bản nháp chỉ được lưu sau khi bạn xác nhận.
          </p>
        </div>
        {hasConversation ? (
          <Button
            onClick={handleNewConversation}
            size="small"
            type="button"
            variant="ghost"
          >
            Cuộc trò chuyện mới
          </Button>
        ) : null}
      </div>
      <ChatToLedger
        key={conversationKey}
        layout="workspace"
        onConversationStateChange={setHasConversation}
        onTransactionConfirmed={handleFinancialDataChanged}
        refreshSignal={refreshRevision}
      />
    </section>
  );
}
