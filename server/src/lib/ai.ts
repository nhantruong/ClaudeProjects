/**
 * ai.ts — AI provider abstraction layer.
 *
 * Supports two backends, controlled by the AI_PROVIDER env var (ADR-003):
 *   - 'anthropic' (default): Anthropic Claude API via @anthropic-ai/sdk
 *   - 'ollama': Local Ollama HTTP API
 *
 * All AI calls are server-side only. API keys never reach the client.
 *
 * Usage:
 *   import { callAi } from './ai.js';
 *   const response = await callAi(systemPrompt, [{ role: 'user', content: '...' }]);
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from './env.js';
import logger from './logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * callAi — dispatches to the configured AI provider.
 *
 * @param systemPrompt - The system-level instruction that defines the AI's persona and task
 * @param messages     - Conversation messages in order (user/assistant alternating)
 * @returns            - The AI's text response
 * @throws             - If the AI provider returns an error or an unexpected response shape
 */
export async function callAi(systemPrompt: string, messages: AiMessage[]): Promise<string> {
  if (env.AI_PROVIDER === 'ollama') {
    return callOllama(systemPrompt, messages);
  }
  return callAnthropic(systemPrompt, messages);
}

// ---------------------------------------------------------------------------
// Anthropic Claude
// ---------------------------------------------------------------------------

async function callAnthropic(systemPrompt: string, messages: AiMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: env.AI_API_KEY });

  logger.debug('Calling Anthropic Claude API', { messageCount: messages.length });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic — expected text block');
  }

  return block.text;
}

// ---------------------------------------------------------------------------
// Ollama (local)
// ---------------------------------------------------------------------------

async function callOllama(systemPrompt: string, messages: AiMessage[]): Promise<string> {
  const baseUrl = env.OLLAMA_URL ?? 'http://localhost:11434';
  const model = env.OLLAMA_MODEL ?? 'llama3.2';
  const url = `${baseUrl}/api/chat`;

  logger.debug('Calling Ollama API', { model, url, messageCount: messages.length });

  const body = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: false,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ollama API error: HTTP ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };

  if (!data.message?.content) {
    throw new Error('Unexpected response shape from Ollama — missing message.content');
  }

  return data.message.content;
}
