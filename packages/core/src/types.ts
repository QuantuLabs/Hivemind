export type Provider = 'openai' | 'anthropic' | 'google'

export type ModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'

export interface Model {
  id: ModelId
  name: string
  provider: Provider
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
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude Sonnet', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku', provider: 'anthropic' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
]

export const DEFAULT_HIVEMIND_MODELS: ModelId[] = [
  'gpt-4o',
  'claude-3-5-sonnet-20241022',
  'gemini-2.0-flash-exp',
]
