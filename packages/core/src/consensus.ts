import type { ConsensusAnalysis, ModelResponse } from './types'

export const ANALYSIS_PROMPT = `You are an impartial analyst. Analyze the following responses from different AI models to the same question.

Question: {question}

Responses:
{responses}

Analyze these responses and output ONLY valid JSON (no markdown, no explanation):
{
  "hasConsensus": boolean,
  "agreements": ["point1", "point2"],
  "divergences": ["divergence1", "divergence2"],
  "confidence": number between 0 and 1
}

hasConsensus is true if all models substantially agree on the core answer.`

export const REFINEMENT_PROMPT = `You previously answered a question, but there are divergences with other AI models.

Original question: {question}

Your previous answer: {previousAnswer}

Other models' perspectives:
{otherAnswers}

Key divergences identified: {divergences}

Please reconsider your answer taking into account the other perspectives. If you believe your original answer was correct, explain why. If you see merit in the other perspectives, incorporate them. Provide your refined answer.`

export const SYNTHESIS_PROMPT = `You are synthesizing a consensus from multiple AI model responses.

Original question: {question}

Final responses from models:
{responses}

Agreements: {agreements}
Divergences: {divergences}
Rounds of deliberation: {rounds}

Create a final, comprehensive answer that:
1. Synthesizes the agreed-upon points
2. Addresses any remaining divergences fairly
3. Presents the most accurate and helpful response

Provide the synthesized consensus answer directly, without preamble.`

export function parseAnalysis(response: string): ConsensusAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        hasConsensus: Boolean(parsed.hasConsensus),
        agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
        divergences: Array.isArray(parsed.divergences) ? parsed.divergences : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    hasConsensus: false,
    agreements: [],
    divergences: ['Unable to parse analysis'],
    confidence: 0,
  }
}

export function formatResponsesForPrompt(
  responses: ModelResponse[],
  excludeModel?: string
): string {
  return responses
    .filter((r) => r.model !== excludeModel)
    .map((r) => `[${r.model}]: ${r.content}`)
    .join('\n\n')
}

export function buildAnalysisPrompt(
  question: string,
  responses: ModelResponse[]
): string {
  return ANALYSIS_PROMPT
    .replace('{question}', question)
    .replace('{responses}', formatResponsesForPrompt(responses))
}

export function buildRefinementPrompt(
  question: string,
  previousAnswer: string,
  responses: ModelResponse[],
  divergences: string[],
  currentModel: string
): string {
  return REFINEMENT_PROMPT
    .replace('{question}', question)
    .replace('{previousAnswer}', previousAnswer)
    .replace('{otherAnswers}', formatResponsesForPrompt(responses, currentModel))
    .replace('{divergences}', divergences.join('\n- '))
}

export function buildSynthesisPrompt(
  question: string,
  responses: ModelResponse[],
  analysis: ConsensusAnalysis,
  rounds: number
): string {
  return SYNTHESIS_PROMPT
    .replace('{question}', question)
    .replace('{responses}', formatResponsesForPrompt(responses))
    .replace('{agreements}', analysis.agreements.join('\n- '))
    .replace('{divergences}', analysis.divergences.join('\n- '))
    .replace('{rounds}', rounds.toString())
}
