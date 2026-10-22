import { logger } from './logger';

export interface TokenHarborChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TokenHarborCompletionOptions {
  messages: TokenHarborChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

export interface TokenHarborResult {
  content: string;
}

/**
 * Calls Token Harbor OpenAI-compatible endpoint.
 */
export async function callTokenHarbor(
  options: TokenHarborCompletionOptions
): Promise<TokenHarborResult> {
  const apiKey = process.env.TOKENHARBOR_API_KEY;
  if (!apiKey) {
    throw new Error('TOKENHARBOR_API_KEY is not configured');
  }

  const baseUrl = process.env.TOKENHARBOR_BASE_URL || 'https://tokenharbor.ai/v1';
  const model = process.env.TOKENHARBOR_MODEL || 'mimo-v2.6-flash:free';

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  };

  if (options.responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let parsedMessage = errorBody;
    try {
      const json = JSON.parse(errorBody);
      parsedMessage = json.error?.message || json.message || errorBody;
    } catch {
      // ignore
    }
    throw new Error(`Token Harbor API error (${res.status}): ${parsedMessage}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Token Harbor returned an empty response choice.');
  }

  return { content };
}
