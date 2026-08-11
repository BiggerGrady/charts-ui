import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
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
  for (const key of pairs.map(([k]) => k)) {
    if (process.env[key] === 'undefined') delete process.env[key];
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  applyEnv(env);

  return {
    plugins: [vue(), aiProxyPlugin()],
    server: { port: 5174 },
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
