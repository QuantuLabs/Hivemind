import { describe, it, expect } from 'vitest'
import {
  parseAnalysis,
  formatResponsesForPrompt,
  buildAnalysisPrompt,
  buildRefinementPrompt,
  buildSynthesisPrompt,
  ANALYSIS_PROMPT,
  REFINEMENT_PROMPT,
  SYNTHESIS_PROMPT,
} from '../src/consensus'
import type { ModelResponse, ConsensusAnalysis } from '../src/types'

describe('Consensus', () => {
  const mockResponses: ModelResponse[] = [
    { model: 'gpt-4o', provider: 'openai', content: 'GPT response', timestamp: 1000 },
    { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic', content: 'Claude response', timestamp: 1001 },
    { model: 'gemini-2.0-flash-exp', provider: 'google', content: 'Gemini response', timestamp: 1002 },
  ]

  describe('parseAnalysis', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        hasConsensus: true,
        agreements: ['point1', 'point2'],
        divergences: [],
        confidence: 0.9,
      })

      const result = parseAnalysis(response)

      expect(result.hasConsensus).toBe(true)
      expect(result.agreements).toEqual(['point1', 'point2'])
      expect(result.divergences).toEqual([])
      expect(result.confidence).toBe(0.9)
    })

    it('should extract JSON from text with surrounding content', () => {
      const response = `Here is the analysis:
      {"hasConsensus": false, "agreements": ["a"], "divergences": ["d"], "confidence": 0.5}
      That's my analysis.`

      const result = parseAnalysis(response)

      expect(result.hasConsensus).toBe(false)
      expect(result.agreements).toEqual(['a'])
      expect(result.divergences).toEqual(['d'])
      expect(result.confidence).toBe(0.5)
    })

    it('should return default values for invalid JSON', () => {
      const response = 'This is not valid JSON'

      const result = parseAnalysis(response)

      expect(result.hasConsensus).toBe(false)
      expect(result.agreements).toEqual([])
      expect(result.divergences).toEqual(['Unable to parse analysis'])
      expect(result.confidence).toBe(0)
    })

    it('should handle missing fields with defaults', () => {
      const response = JSON.stringify({ hasConsensus: true })

      const result = parseAnalysis(response)

      expect(result.hasConsensus).toBe(true)
      expect(result.agreements).toEqual([])
      expect(result.divergences).toEqual([])
      expect(result.confidence).toBe(0.5)
    })
  })

  describe('formatResponsesForPrompt', () => {
    it('should format all responses', () => {
      const result = formatResponsesForPrompt(mockResponses)

      expect(result).toContain('[gpt-4o]: GPT response')
      expect(result).toContain('[claude-3-5-sonnet-20241022]: Claude response')
      expect(result).toContain('[gemini-2.0-flash-exp]: Gemini response')
    })

    it('should exclude specified model', () => {
      const result = formatResponsesForPrompt(mockResponses, 'gpt-4o')

      expect(result).not.toContain('[gpt-4o]')
      expect(result).toContain('[claude-3-5-sonnet-20241022]')
      expect(result).toContain('[gemini-2.0-flash-exp]')
    })
  })

  describe('buildAnalysisPrompt', () => {
    it('should include question and responses', () => {
      const question = 'What is the meaning of life?'
      const result = buildAnalysisPrompt(question, mockResponses)

      expect(result).toContain(question)
      expect(result).toContain('GPT response')
      expect(result).toContain('Claude response')
      expect(result).toContain('Gemini response')
    })

    it('should use ANALYSIS_PROMPT template', () => {
      const result = buildAnalysisPrompt('test', mockResponses)
      expect(result).toContain('hasConsensus')
    })
  })

  describe('buildRefinementPrompt', () => {
    it('should include question, previous answer, and divergences', () => {
      const question = 'Test question'
      const previousAnswer = 'My previous answer'
      const divergences = ['Point A', 'Point B']

      const result = buildRefinementPrompt(
        question,
        previousAnswer,
        mockResponses,
        divergences,
        'gpt-4o'
      )

      expect(result).toContain(question)
      expect(result).toContain(previousAnswer)
      expect(result).toContain('Point A')
      expect(result).toContain('Point B')
    })

    it('should exclude current model from other answers', () => {
      const result = buildRefinementPrompt(
        'question',
        'answer',
        mockResponses,
        [],
        'gpt-4o'
      )

      expect(result).not.toContain('[gpt-4o]')
    })
  })

  describe('buildSynthesisPrompt', () => {
    it('should include all required information', () => {
      const question = 'Synthesis question'
      const analysis: ConsensusAnalysis = {
        hasConsensus: true,
        agreements: ['Agreement 1'],
        divergences: ['Divergence 1'],
        confidence: 0.8,
      }

      const result = buildSynthesisPrompt(question, mockResponses, analysis, 2)

      expect(result).toContain(question)
      expect(result).toContain('Agreement 1')
      expect(result).toContain('Divergence 1')
      expect(result).toContain('2')
    })
  })

  describe('Prompt templates', () => {
    it('ANALYSIS_PROMPT should have required placeholders', () => {
      expect(ANALYSIS_PROMPT).toContain('{question}')
      expect(ANALYSIS_PROMPT).toContain('{responses}')
    })

    it('REFINEMENT_PROMPT should have required placeholders', () => {
      expect(REFINEMENT_PROMPT).toContain('{question}')
      expect(REFINEMENT_PROMPT).toContain('{previousAnswer}')
      expect(REFINEMENT_PROMPT).toContain('{otherAnswers}')
      expect(REFINEMENT_PROMPT).toContain('{divergences}')
    })

    it('SYNTHESIS_PROMPT should have required placeholders', () => {
      expect(SYNTHESIS_PROMPT).toContain('{question}')
      expect(SYNTHESIS_PROMPT).toContain('{responses}')
      expect(SYNTHESIS_PROMPT).toContain('{agreements}')
      expect(SYNTHESIS_PROMPT).toContain('{divergences}')
      expect(SYNTHESIS_PROMPT).toContain('{rounds}')
    })
  })
})
