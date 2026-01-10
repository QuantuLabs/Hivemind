export type Provider = 'openai' | 'anthropic' | 'google'

export type ModelId =
  // OpenAI models (GPT-5 series + O4)
  | 'gpt-5.2'
  | 'gpt-5.1'
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'o4-mini'
  // Anthropic models
  | 'claude-opus-4-5-20251101'
  | 'claude-sonnet-4-5-20250514'
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  // Google models (Gemini 3 + 2.5)
  | 'gemini-3-pro-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
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
  // OpenAI models (GPT-5 series + O4)
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', isDefault: true },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai' },
  { id: 'o4-mini', name: 'O4 Mini', provider: 'openai' },
  // Anthropic models
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'anthropic', isDefault: true },
  { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  // Google models (Gemini 3 + 2.5)
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'google', isDefault: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'google' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
]

export const DEFAULT_MODELS: Record<Provider, ModelId> = {
  openai: 'gpt-5.2',
  anthropic: 'claude-opus-4-5-20251101',
  google: 'gemini-3-pro-preview',
}

export const DEFAULT_HIVEMIND_MODELS: ModelId[] = [
  'gpt-5.2',
  'claude-opus-4-5-20251101',
  'gemini-3-pro-preview',
]
