'use client'

import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConversationList } from './ConversationList'
import { useConversationStore } from '@/lib/stores/conversation-store'
import { useSettingsStore } from '@/lib/stores/settings-store'

export function Sidebar() {
  const { loadConversations, createConversation } = useConversationStore()
  const { mode } = useSettingsStore()

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleNewChat = () => {
    createConversation(mode)
  }

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <ConversationList />
      </ScrollArea>
    </aside>
  )
}
