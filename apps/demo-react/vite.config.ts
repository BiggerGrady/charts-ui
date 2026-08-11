import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      'ai-echarts/react': path.resolve(__dirname, '../../packages/ai-echarts/src/react/index.ts'),
      'ai-echarts/vue': path.resolve(__dirname, '../../packages/ai-echarts/src/vue/index.ts'),
      'ai-echarts/ai': path.resolve(__dirname, '../../packages/ai-echarts/src/ai/index.ts'),
      'ai-echarts': path.resolve(__dirname, '../../packages/ai-echarts/src/index.ts'),
    },
  },
});
