import { compactSchemaForPrompt, profileData } from '../core/profile';
import { recommendByRules } from '../core/recommend';
import { chartSpecSchema } from '../core/schema';
import type { ChartSpec, DataRow, DatasetSchema } from '../core/types';
import {
  chatCompletion,
  extractJsonObject,
  type LlmConfig,
  MissingApiKeyError,
} from './deepseek';
import { buildGenerateUserPrompt, buildPatchUserPrompt, CHART_SYSTEM_PROMPT } from './prompts';

export interface GenerateChartArgs {
  nl: string;
  data: DataRow[];
  schema?: DatasetSchema;
  llm?: LlmConfig;
  /** If true and no API key, fall back to rule recommend instead of throwing */
  fallbackToRules?: boolean;
}

export interface GenerateChartResult {
  spec: ChartSpec;
  source: 'llm' | 'rules';
  schema: DatasetSchema;
  raw?: string;
}

function ensureId(spec: ChartSpec): ChartSpec {
  if (spec.id) return spec;
  return { ...spec, id: `chart_${Math.random().toString(36).slice(2, 9)}` };
}

export async function generateChartSpec(args: GenerateChartArgs): Promise<GenerateChartResult> {
  const schema = args.schema ?? profileData(args.data);
  const candidates = recommendByRules(schema, 3);

  try {
    const raw = await chatCompletion(
      [
        { role: 'system', content: CHART_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildGenerateUserPrompt({
            nl: args.nl,
            schemaJson: JSON.stringify(compactSchemaForPrompt(schema), null, 2),
            candidatesJson: JSON.stringify(candidates, null, 2),
          }),
        },
      ],
      args.llm,
    );

    let parsed = chartSpecSchema.parse(extractJsonObject(raw)) as ChartSpec;
    parsed = ensureId(parsed);

    // one retry on field mismatch soft validation
    const fieldNames = new Set(schema.fields.map((f) => f.name));
    const used = [
      parsed.encode.x,
      parsed.encode.category,
      parsed.encode.angle,
      parsed.encode.color,
      ...(Array.isArray(parsed.encode.y) ? parsed.encode.y : parsed.encode.y ? [parsed.encode.y] : []),
    ].filter(Boolean) as string[];

    const missing = used.filter((u) => !fieldNames.has(u));
    if (missing.length) {
      const retryRaw = await chatCompletion(
        [
          { role: 'system', content: CHART_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${buildGenerateUserPrompt({
              nl: args.nl,
              schemaJson: JSON.stringify(compactSchemaForPrompt(schema), null, 2),
              candidatesJson: JSON.stringify(candidates, null, 2),
            })}\n\nPrevious invalid spec used unknown fields: ${missing.join(', ')}. Fix and return JSON only.`,
          },
        ],
        args.llm,
      );
      parsed = ensureId(chartSpecSchema.parse(extractJsonObject(retryRaw)) as ChartSpec);
    }

    return { spec: parsed, source: 'llm', schema, raw };
  } catch (error) {
    if (args.fallbackToRules || error instanceof MissingApiKeyError) {
      const spec = candidates[0];
      if (!spec) throw error;
      return {
        spec: {
          ...spec,
          insight: `规则推荐（AI 不可用：${error instanceof Error ? error.message : String(error)}）`,
        },
        source: 'rules',
        schema,
      };
    }
    throw error;
  }
}

export async function patchChartSpec(args: {
  nl: string;
  spec: ChartSpec;
  data: DataRow[];
  llm?: LlmConfig;
}): Promise<GenerateChartResult> {
  const schema = profileData(args.data);
  const raw = await chatCompletion(
    [
      { role: 'system', content: CHART_SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildPatchUserPrompt({
          nl: args.nl,
          currentSpecJson: JSON.stringify(args.spec, null, 2),
          schemaJson: JSON.stringify(compactSchemaForPrompt(schema), null, 2),
        }),
      },
    ],
    args.llm,
  );
  const parsed = ensureId(chartSpecSchema.parse(extractJsonObject(raw)) as ChartSpec);
  return { spec: parsed, source: 'llm', schema, raw };
}
