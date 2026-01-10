import { describe, it, expect, beforeEach, mock } from 'bun:test'
import '../../setup'
import { useConversationStore } from '../../../lib/stores/conversation-store'

describe('Conversation Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useConversationStore.setState({
      conversations: [],
      activeConversationId: null,
      isLoading: false,
    })
    // Clear localStorage for clean tests
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should have empty conversations', () => {
      expect(useConversationStore.getState().conversations).toEqual([])
    })

    it('should have no active conversation', () => {
      expect(useConversationStore.getState().activeConversationId).toBeNull()
    })
  })

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const id = await useConversationStore.getState().createConversation('solo')

      expect(typeof id).toBe('string')
      expect(useConversationStore.getState().conversations).toHaveLength(1)
    })

    it('should set created conversation as active', async () => {
      const id = await useConversationStore.getState().createConversation('hivemind')

      expect(useConversationStore.getState().activeConversationId).toBe(id)
    })

    it('should create conversation with correct mode', async () => {
      await useConversationStore.getState().createConversation('hivemind')

      expect(useConversationStore.getState().conversations[0].mode).toBe('hivemind')
    })

    it('should prepend new conversation to list', async () => {
      await useConversationStore.getState().createConversation('solo')
      const firstId = useConversationStore.getState().conversations[0].id

      await useConversationStore.getState().createConversation('hivemind')

      expect(useConversationStore.getState().conversations[0].id).not.toBe(firstId)
      expect(useConversationStore.getState().conversations[1].id).toBe(firstId)
    })
  })

  describe('deleteConversation', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          { id: '1', title: 'Test 1', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' },
          { id: '2', title: 'Test 2', messages: [], createdAt: 2000, updatedAt: 2000, mode: 'solo' },
        ],
        activeConversationId: '1',
      })
    })

    it('should remove conversation from list', async () => {
      await useConversationStore.getState().deleteConversation('1')

      expect(useConversationStore.getState().conversations).toHaveLength(1)
      expect(useConversationStore.getState().conversations[0].id).toBe('2')
    })

    it('should update active conversation if deleted', async () => {
      await useConversationStore.getState().deleteConversation('1')

      expect(useConversationStore.getState().activeConversationId).toBe('2')
    })

    it('should keep active conversation if different one deleted', async () => {
      await useConversationStore.getState().deleteConversation('2')

      expect(useConversationStore.getState().activeConversationId).toBe('1')
    })

    it('should set active to null if all deleted', async () => {
      await useConversationStore.getState().deleteConversation('1')
      await useConversationStore.getState().deleteConversation('2')

      expect(useConversationStore.getState().activeConversationId).toBeNull()
    })
  })

  describe('setActiveConversation', () => {
    it('should update active conversation id', () => {
      useConversationStore.getState().setActiveConversation('test-id')

      expect(useConversationStore.getState().activeConversationId).toBe('test-id')
    })

    it('should allow setting to null', () => {
      useConversationStore.setState({ activeConversationId: 'some-id' })

      useConversationStore.getState().setActiveConversation(null)

      expect(useConversationStore.getState().activeConversationId).toBeNull()
    })
  })

  describe('addMessage', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          { id: '1', title: 'New Chat', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' },
        ],
        activeConversationId: '1',
      })
    })

    it('should add message to conversation', async () => {
      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Hello',
      })

      const conv = useConversationStore.getState().conversations[0]
      expect(conv.messages).toHaveLength(1)
      expect(conv.messages[0].role).toBe('user')
      expect(conv.messages[0].content).toBe('Hello')
    })

    it('should generate message id and timestamp', async () => {
      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Test',
      })

      const msg = useConversationStore.getState().conversations[0].messages[0]
      expect(typeof msg.id).toBe('string')
      expect(typeof msg.timestamp).toBe('number')
    })

    it('should update title from first user message', async () => {
      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'This is my question about something',
      })

      expect(useConversationStore.getState().conversations[0].title).toBe(
        'This is my question about something'
      )
    })

    it('should truncate long titles', async () => {
      const longContent = 'A'.repeat(100)
      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: longContent,
      })

      const title = useConversationStore.getState().conversations[0].title
      expect(title.length).toBeLessThanOrEqual(53) // 50 + '...'
      expect(title).toContain('...')
    })

    it('should not update title from assistant message', async () => {
      await useConversationStore.getState().addMessage('1', {
        role: 'assistant',
        content: 'Hello there!',
      })

      expect(useConversationStore.getState().conversations[0].title).toBe('New Chat')
    })

    it('should not update title after first message', async () => {
      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'First question',
      })
      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Second question',
      })

      expect(useConversationStore.getState().conversations[0].title).toBe('First question')
    })

    it('should update conversation updatedAt', async () => {
      const beforeUpdate = useConversationStore.getState().conversations[0].updatedAt

      await useConversationStore.getState().addMessage('1', {
        role: 'user',
        content: 'Test',
      })

      const afterUpdate = useConversationStore.getState().conversations[0].updatedAt
      expect(afterUpdate).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('updateMessage', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: '1',
            title: 'Test',
            messages: [
              { id: 'msg1', role: 'user', content: 'Original', timestamp: 1000 },
              { id: 'msg2', role: 'assistant', content: 'Response', timestamp: 1001 },
            ],
            createdAt: 1000,
            updatedAt: 1000,
            mode: 'solo',
          },
        ],
        activeConversationId: '1',
      })
    })

    it('should update message content', async () => {
      await useConversationStore.getState().updateMessage('1', 'msg1', 'Updated content')

      const msg = useConversationStore.getState().conversations[0].messages[0]
      expect(msg.content).toBe('Updated content')
    })

    it('should not affect other messages', async () => {
      await useConversationStore.getState().updateMessage('1', 'msg1', 'Updated')

      const msg2 = useConversationStore.getState().conversations[0].messages[1]
      expect(msg2.content).toBe('Response')
    })

    it('should update conversation updatedAt', async () => {
      const beforeUpdate = useConversationStore.getState().conversations[0].updatedAt

      await useConversationStore.getState().updateMessage('1', 'msg1', 'Updated')

      const afterUpdate = useConversationStore.getState().conversations[0].updatedAt
      expect(afterUpdate).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('getActiveConversation', () => {
    it('should return undefined when no active conversation', () => {
      const result = useConversationStore.getState().getActiveConversation()

      expect(result).toBeUndefined()
    })

    it('should return active conversation', () => {
      useConversationStore.setState({
        conversations: [
          { id: '1', title: 'Test 1', messages: [], createdAt: 1000, updatedAt: 1000, mode: 'solo' },
          { id: '2', title: 'Test 2', messages: [], createdAt: 2000, updatedAt: 2000, mode: 'hivemind' },
        ],
        activeConversationId: '2',
      })

      const result = useConversationStore.getState().getActiveConversation()

      expect(result?.id).toBe('2')
      expect(result?.title).toBe('Test 2')
      expect(result?.mode).toBe('hivemind')
    })
  })
})
