import { afterEach, describe, expect, it } from 'vitest';
import { MissingApiKeyError, chatCompletion, resolveLlmConfig } from './deepseek';

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe('resolveLlmConfig', () => {
  it('ignores poisoned string undefined from process.env', () => {
    process.env.AI_ECHARTS_LLM_API_KEY = 'undefined';
    process.env.AI_ECHARTS_LLM_BASE_URL = 'undefined';
    process.env.AI_ECHARTS_LLM_MODEL = 'undefined';
    const cfg = resolveLlmConfig();
    expect(cfg.apiKey).toBeUndefined();
    expect(cfg.baseUrl).toBe('https://api.deepseek.com');
    expect(cfg.model).toBe('deepseek-v4-flash');
  });

  it('prefers explicit overrides', () => {
    const cfg = resolveLlmConfig({
      apiKey: ' sk-test ',
      model: 'deepseek-v4-pro',
      baseUrl: 'https://example.com/',
    });
    expect(cfg.apiKey).toBe('sk-test');
    expect(cfg.model).toBe('deepseek-v4-pro');
    expect(cfg.baseUrl).toBe('https://example.com/');
  });
});

describe('chatCompletion', () => {
  it('throws MissingApiKeyError when key absent', async () => {
    delete process.env.AI_ECHARTS_LLM_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    await expect(chatCompletion([{ role: 'user', content: 'hi' }], { apiKey: '' })).rejects.toBeInstanceOf(
      MissingApiKeyError,
    );
  });
});
