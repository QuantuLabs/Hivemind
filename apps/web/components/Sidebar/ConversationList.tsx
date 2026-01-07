'use client'

import { useConversationStore } from '@/lib/stores/conversation-store'
import { ConversationItem } from './ConversationItem'

export function ConversationList() {
  const { conversations, activeConversationId, setActiveConversation, deleteConversation } =
    useConversationStore()

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    )
  }

  return (
    <div className="px-2 py-2 space-y-1">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeConversationId}
          onSelect={() => setActiveConversation(conversation.id)}
          onDelete={() => deleteConversation(conversation.id)}
        />
      ))}
    </div>
  )
}
