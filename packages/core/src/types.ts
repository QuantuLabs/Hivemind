export type Provider = 'openai' | 'anthropic' | 'google'

export type ModelId =
  // OpenAI models
  | 'gpt-4.1'
  | 'gpt-4.1-mini'
  | 'gpt-4.1-nano'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  // Anthropic models
  | 'claude-opus-4-5-20251124'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  // Google models
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash'

export interface Model {
  id: ModelId
  name: string
  provider: Provider
  isDefault?: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model?: ModelId
  isConsensus?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  mode: 'solo' | 'hivemind'
}

export interface ApiKeys {
  openai?: string
  anthropic?: string
  google?: string
}

export interface ModelResponse {
  model: ModelId
  provider: Provider
  content: string
  timestamp: number
}

export interface DeliberationStatus {
  phase: 'initial' | 'analysis' | 'deliberation' | 'synthesis' | 'complete' | 'error'
  message: string
  round?: number
  maxRounds?: number
  modelStatuses?: Record<Provider, 'pending' | 'loading' | 'done' | 'error'>
  progress?: number
}

export interface ConsensusAnalysis {
  hasConsensus: boolean
  agreements: string[]
  divergences: string[]
  confidence: number
}

export interface HivemindResult {
  consensus: string
  rounds: number
  modelResponses: ModelResponse[]
  analysis: ConsensusAnalysis
}

export const MODELS: Model[] = [
  // OpenAI models (latest first)
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', isDefault: true },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  // Anthropic models (latest first)
  { id: 'claude-opus-4-5-20251124', name: 'Claude Opus 4.5', provider: 'anthropic', isDefault: true },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  // Google models (latest first)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', isDefault: true },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
]

export const DEFAULT_MODELS: Record<Provider, ModelId> = {
  openai: 'gpt-4.1',
  anthropic: 'claude-opus-4-5-20251124',
  google: 'gemini-2.5-pro',
}

export const DEFAULT_HIVEMIND_MODELS: ModelId[] = [
  'gpt-4.1',
  'claude-opus-4-5-20251124',
  'gemini-2.5-pro',
]
