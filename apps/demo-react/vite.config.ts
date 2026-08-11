import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { aiProxyPlugin } from './vite.plugin-ai-proxy';

function applyEnv(env: Record<string, string>) {
  const pairs: Array<[string, string | undefined]> = [
    ['AI_ECHARTS_LLM_API_KEY', env.AI_ECHARTS_LLM_API_KEY || env.DEEPSEEK_API_KEY],
    ['DEEPSEEK_API_KEY', env.DEEPSEEK_API_KEY || env.AI_ECHARTS_LLM_API_KEY],
    ['AI_ECHARTS_LLM_BASE_URL', env.AI_ECHARTS_LLM_BASE_URL],
    ['AI_ECHARTS_LLM_MODEL', env.AI_ECHARTS_LLM_MODEL],
  ];
  for (const [key, value] of pairs) {
    if (value && value.trim() && value.trim() !== 'undefined') {
      process.env[key] = value.trim();
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  applyEnv(env);

  // Clear poisoned string "undefined" from earlier runs in same process
  for (const key of [
    'AI_ECHARTS_LLM_API_KEY',
    'DEEPSEEK_API_KEY',
    'AI_ECHARTS_LLM_BASE_URL',
    'AI_ECHARTS_LLM_MODEL',
  ]) {
    if (process.env[key] === 'undefined') delete process.env[key];
  }

  return {
    plugins: [react(), aiProxyPlugin()],
    server: { port: 5173 },
    resolve: {
      alias: {
        'ai-echarts/react': path.resolve(__dirname, '../../packages/ai-echarts/src/react/index.ts'),
        'ai-echarts/vue': path.resolve(__dirname, '../../packages/ai-echarts/src/vue/index.ts'),
        'ai-echarts/ai': path.resolve(__dirname, '../../packages/ai-echarts/src/ai/index.ts'),
        'ai-echarts': path.resolve(__dirname, '../../packages/ai-echarts/src/index.ts'),
      },
    },
  };
});
