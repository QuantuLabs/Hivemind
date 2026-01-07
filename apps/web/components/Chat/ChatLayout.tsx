'use client'

import { useConversationStore } from '@/lib/stores/conversation-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { DeliberationStatus } from './DeliberationStatus'
import type { DeliberationStatus as DeliberationStatusType } from '@hivemind/core'

interface ChatLayoutProps {
  onSendMessage: (message: string, useHivemind: boolean) => void
  isLoading: boolean
  deliberationStatus: DeliberationStatusType | null
}

export function ChatLayout({ onSendMessage, isLoading, deliberationStatus }: ChatLayoutProps) {
  const conversation = useConversationStore((state) => state.getActiveConversation())
  const { hasRequiredKeys } = useSettingsStore()

  const canSend = hasRequiredKeys() && !isLoading

  return (
    <div className="flex-1 flex flex-col">
      <ChatMessages messages={conversation?.messages || []} />

      {deliberationStatus && deliberationStatus.phase !== 'complete' && (
        <DeliberationStatus status={deliberationStatus} />
      )}

      <ChatInput onSend={onSendMessage} disabled={!canSend} />
    </div>
  )
}
