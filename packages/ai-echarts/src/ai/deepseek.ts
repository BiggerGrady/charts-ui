export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro' | (string & {});

export interface LlmConfig {
  apiKey?: string;
  model?: DeepSeekModel;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'Missing DeepSeek API key. Set AI_ECHARTS_LLM_API_KEY or DEEPSEEK_API_KEY in the environment.',
    );
    this.name = 'MissingApiKeyError';
  }
}

function readEnv(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  // Node coerces `process.env.X = undefined` to the literal string "undefined"
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return trimmed;
}

export function resolveLlmConfig(overrides: LlmConfig = {}): {
  apiKey: string | undefined;
  model: DeepSeekModel;
  baseUrl: string;
  timeoutMs: number;
} {
  const apiKey =
    (overrides.apiKey && overrides.apiKey.trim()) ||
    readEnv('AI_ECHARTS_LLM_API_KEY') ||
    readEnv('DEEPSEEK_API_KEY') ||
    undefined;

  const baseUrl =
    (overrides.baseUrl && overrides.baseUrl.trim()) ||
    readEnv('AI_ECHARTS_LLM_BASE_URL') ||
    'https://api.deepseek.com';

  const model = (overrides.model ||
    readEnv('AI_ECHARTS_LLM_MODEL') ||
    'deepseek-v4-flash') as DeepSeekModel;

  const timeoutRaw = overrides.timeoutMs ?? Number(readEnv('AI_ECHARTS_LLM_TIMEOUT_MS') ?? 60000);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 60000;

  return { apiKey, model, baseUrl, timeoutMs };
}

export async function chatCompletion(
  messages: ChatMessage[],
  config: LlmConfig = {},
): Promise<string> {
  const cfg = resolveLlmConfig(config);
  if (!cfg.apiKey) throw new MissingApiKeyError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('DeepSeek returned empty content');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Model response is not valid JSON');
  }
}
