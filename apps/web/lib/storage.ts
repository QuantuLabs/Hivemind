import { encrypt, decrypt, hashPassword, verifyPasswordHash } from './crypto'
import type { ApiKeys, Conversation } from '@hivemind/core'

const KEYS_STORAGE_KEY = 'hivemind_api_keys'
const PASSWORD_HASH_KEY = 'hivemind_password_hash'
const CONVERSATIONS_KEY = 'hivemind_conversations'

export interface StorageState {
  isLocked: boolean
  hasPassword: boolean
  hasKeys: boolean
}

class SecureStorage {
  private password: string | null = null

  async getState(): Promise<StorageState> {
    const hasPassword = !!localStorage.getItem(PASSWORD_HASH_KEY)
    const hasKeys = !!localStorage.getItem(KEYS_STORAGE_KEY)
    return {
      isLocked: hasPassword && !this.password,
      hasPassword,
      hasKeys,
    }
  }

  async setPassword(password: string): Promise<void> {
    const hash = await hashPassword(password)
    localStorage.setItem(PASSWORD_HASH_KEY, hash)
    this.password = password
  }

  async unlock(password: string): Promise<boolean> {
    const storedHash = localStorage.getItem(PASSWORD_HASH_KEY)
    if (!storedHash) return false

    const isValid = await verifyPasswordHash(password, storedHash)
    if (isValid) {
      this.password = password
    }
    return isValid
  }

  lock(): void {
    this.password = null
  }

  isUnlocked(): boolean {
    return this.password !== null
  }

  async saveApiKeys(keys: ApiKeys): Promise<void> {
    if (!this.password) {
      throw new Error('Storage is locked')
    }

    const encrypted = await encrypt(JSON.stringify(keys), this.password)
    localStorage.setItem(KEYS_STORAGE_KEY, encrypted)
  }

  async getApiKeys(): Promise<ApiKeys | null> {
    if (!this.password) {
      throw new Error('Storage is locked')
    }

    const encrypted = localStorage.getItem(KEYS_STORAGE_KEY)
    if (!encrypted) return null

    try {
      const decrypted = await decrypt(encrypted, this.password)
      return JSON.parse(decrypted)
    } catch {
      return null
    }
  }

  async clearApiKeys(): Promise<void> {
    localStorage.removeItem(KEYS_STORAGE_KEY)
  }

  // Conversations are not encrypted (no sensitive data)
  saveConversations(conversations: Conversation[]): void {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
  }

  getConversations(): Conversation[] {
    const stored = localStorage.getItem(CONVERSATIONS_KEY)
    if (!stored) return []

    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  clearAll(): void {
    localStorage.removeItem(KEYS_STORAGE_KEY)
    localStorage.removeItem(PASSWORD_HASH_KEY)
    localStorage.removeItem(CONVERSATIONS_KEY)
    this.password = null
  }
}

export const storage = new SecureStorage()
