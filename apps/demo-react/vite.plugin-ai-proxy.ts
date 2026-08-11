import type { Plugin } from 'vite';
import { generateChartSpec } from '../../packages/ai-echarts/src/ai/generate';
import { resolveLlmConfig, MissingApiKeyError } from '../../packages/ai-echarts/src/ai/deepseek';
import type { DataRow } from '../../packages/ai-echarts/src/core/types';

/**
 * Local BFF: keeps DeepSeek key on the Vite server process.
 * POST /api/generate-chart { nl, data, model?, fallbackToRules?, apiKey? }
 */
export function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-echarts-demo-proxy',
    configureServer(server) {
      server.middlewares.use('/api/generate-chart', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            nl?: string;
            data?: DataRow[];
            model?: string;
            fallbackToRules?: boolean;
            apiKey?: string;
          };

          const llm = resolveLlmConfig({
            apiKey: body.apiKey,
            model: body.model,
            baseUrl: process.env.AI_ECHARTS_LLM_BASE_URL,
          });

          if (!llm.apiKey && !body.fallbackToRules) {
            throw new MissingApiKeyError();
          }

          const result = await generateChartSpec({
            nl: body.nl || '',
            data: Array.isArray(body.data) ? body.data : [],
            fallbackToRules: Boolean(body.fallbackToRules),
            llm: {
              apiKey: llm.apiKey,
              model: llm.model,
              baseUrl: llm.baseUrl,
            },
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status =
            error instanceof MissingApiKeyError || message.includes('Missing DeepSeek API key')
              ? 401
              : 500;
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
