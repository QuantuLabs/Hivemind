import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock crypto.subtle for Web Crypto API
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  subtle: {
    importKey: vi.fn(async () => ({ type: 'secret' })),
    deriveKey: vi.fn(async () => ({ type: 'secret', algorithm: { name: 'AES-GCM' } })),
    encrypt: vi.fn(async (_algorithm, _key, data: ArrayBuffer) => {
      // Simple mock: just return the data with a prefix
      const prefix = new Uint8Array([1, 2, 3, 4])
      const combined = new Uint8Array(prefix.length + data.byteLength)
      combined.set(prefix)
      combined.set(new Uint8Array(data), prefix.length)
      return combined.buffer
    }),
    decrypt: vi.fn(async (_algorithm, _key, data: ArrayBuffer) => {
      // Simple mock: return data without prefix
      const arr = new Uint8Array(data)
      return arr.slice(4).buffer
    }),
    digest: vi.fn(async (_algorithm, data: ArrayBuffer) => {
      // Simple mock hash
      const arr = new Uint8Array(data)
      const hash = new Uint8Array(32)
      for (let i = 0; i < arr.length; i++) {
        hash[i % 32] ^= arr[i]
      }
      return hash.buffer
    }),
  },
}

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
})

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})
