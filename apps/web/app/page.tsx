'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DeliberationStatus as DeliberationStatusType } from '@quantulabs/hivemind-core'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { ChatLayout } from '@/components/Chat/ChatLayout'
import { useConversationStore } from '@/lib/stores/conversation-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { storage } from '@/lib/storage'
import { useSoloChat } from '@/lib/hooks/use-solo-chat'
import { useHivemindChat } from '@/lib/hooks/use-hivemind-chat'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [deliberationStatus, setDeliberationStatus] = useState<DeliberationStatusType | null>(null)

  const { setApiKeys, setStorageUnlocked } = useSettingsStore()
  const { activeConversationId, createConversation, addMessage } = useConversationStore()

  const { sendSoloMessage } = useSoloChat()
  const { sendHivemindMessage } = useHivemindChat()

  // Load API keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      const state = await storage.getState()
      if (!state.isLocked && state.hasKeys) {
        const keys = await storage.getApiKeys()
        if (keys) {
          setApiKeys(keys)
          setStorageUnlocked(true)
        }
      }
    }
    loadKeys()
  }, [setApiKeys, setStorageUnlocked])

  const handleSendMessage = useCallback(async (content: string, useHivemind: boolean) => {
    let conversationId = activeConversationId
    const messageMode = useHivemind ? 'hivemind' : 'solo'

    // Create new conversation if none exists
    if (!conversationId) {
      conversationId = await createConversation(messageMode)
    }

    // Add user message
    addMessage(conversationId, { role: 'user', content })

    setIsLoading(true)

    try {
      if (!useHivemind) {
        const response = await sendSoloMessage(content, () => {
          // Handle streaming tokens if needed
        })

        addMessage(conversationId, {
          role: 'assistant',
          content: response,
        })
      } else {
        const result = await sendHivemindMessage(content, (status) => {
          setDeliberationStatus(status)
        })

        addMessage(conversationId, {
          role: 'assistant',
          content: result.consensus,
          isConsensus: true,
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage(conversationId, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
      })
    } finally {
      setIsLoading(false)
      setDeliberationStatus(null)
    }
  }, [activeConversationId, createConversation, addMessage, sendSoloMessage, sendHivemindMessage])

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ChatLayout
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          deliberationStatus={deliberationStatus}
        />
      </div>
    </div>
  )
}
