import { beforeEach, mock, spyOn } from 'bun:test'

// Create mock functions
const createMockFn = <T = unknown>() => {
  const calls: unknown[][] = []
  const fn = mock((...args: unknown[]) => {
    calls.push(args)
    return undefined as T
  })
  ;(fn as typeof fn & { calls: unknown[][] }).calls = calls
  return fn
}

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}

  return {
    getItem: mock((key: string) => store[key] || null),
    setItem: mock((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: mock((key: string) => {
      delete store[key]
    }),
    clear: mock(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: mock((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
}

const localStorageMock = createLocalStorageMock()
const sessionStorageMock = createLocalStorageMock()

// Set up localStorage mock on globalThis
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
})

// Mock window if it doesn't exist
if (typeof window === 'undefined') {
  ;(globalThis as typeof globalThis & { window: typeof globalThis }).window = globalThis
}

Object.defineProperty(globalThis.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis.window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
})

// Mock crypto.subtle for Web Crypto API
const mockCrypto = {
  getRandomValues: mock((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
  subtle: {
    importKey: mock(async () => ({ type: 'secret' })),
    deriveKey: mock(async () => ({ type: 'secret', algorithm: { name: 'AES-GCM' } })),
    encrypt: mock(async (_algorithm: unknown, _key: unknown, data: ArrayBuffer) => {
      // Simple mock: just return the data with a prefix
      const prefix = new Uint8Array([1, 2, 3, 4])
      const combined = new Uint8Array(prefix.length + data.byteLength)
      combined.set(prefix)
      combined.set(new Uint8Array(data), prefix.length)
      return combined.buffer
    }),
    decrypt: mock(async (_algorithm: unknown, _key: unknown, data: ArrayBuffer) => {
      // Simple mock: return data without prefix
      const arr = new Uint8Array(data)
      return arr.slice(4).buffer
    }),
    digest: mock(async (_algorithm: unknown, data: ArrayBuffer) => {
      // Simple mock hash
      const arr = new Uint8Array(data)
      const hash = new Uint8Array(32)
      for (let i = 0; i < arr.length; i++) {
        hash[i % 32] ^= arr[i]
      }
      return hash.buffer
    }),
    deriveBits: mock(async (_algorithm: unknown, _key: unknown, length: number) => {
      // Return mock derived bits
      const bytes = length / 8
      const result = new Uint8Array(bytes)
      for (let i = 0; i < bytes; i++) {
        result[i] = i % 256
      }
      return result.buffer
    }),
  },
}

Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true,
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: mockCrypto,
    writable: true,
    configurable: true,
  })
}

// Export mocks for tests to use
export const mocks = {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  crypto: mockCrypto,
  clearAllMocks: () => {
    localStorageMock.clear()
    sessionStorageMock.clear()
  },
}

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.clear()
  sessionStorageMock.clear()
})
