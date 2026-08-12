import { compile } from '../core/compile';
import { encodeFieldNames } from '../core/fields';
import { compactSchemaForPrompt, profileData } from '../core/profile';
import { applyTimeDisplayIntent, recommendByRules } from '../core/recommend';
import { chartSpecSchema } from '../core/schema';
import type { ChartSpec, DataRow, DatasetSchema } from '../core/types';
import { chatCompletion, extractJsonObject, type LlmConfig } from './deepseek';
import { buildGenerateUserPrompt, buildPatchUserPrompt, CHART_SYSTEM_PROMPT } from './prompts';

export interface GenerateChartArgs {
  nl: string;
  data: DataRow[];
  schema?: DatasetSchema;
  llm?: LlmConfig;
  /** Only when true: fall back to rules on missing key / LLM / compile failure */
  fallbackToRules?: boolean;
}

export interface GenerateChartResult {
  spec: ChartSpec;
  source: 'llm' | 'rules';
  schema: DatasetSchema;
  raw?: string;
  warnings?: string[];
}

function ensureId(spec: ChartSpec): ChartSpec {
  if (spec.id) return spec;
  return { ...spec, id: `chart_${Math.random().toString(36).slice(2, 9)}` };
}

function unknownFields(spec: ChartSpec, schema: DatasetSchema): string[] {
  const fieldNames = new Set(schema.fields.map((f) => f.name));
  const aliases = new Set<string>();
  for (const t of spec.transform ?? []) {
    if (t.op === 'aggregate') {
      for (const m of t.metrics) {
        aliases.add(m.as ?? `${m.fn}_${m.field}`);
      }
    }
  }
  return encodeFieldNames(spec).filter((u) => !fieldNames.has(u) && !aliases.has(u));
}

function parseSpec(raw: string): ChartSpec {
  return ensureId(chartSpecSchema.parse(extractJsonObject(raw)) as ChartSpec);
}

function validateCompilable(spec: ChartSpec, data: DataRow[]) {
  compile(spec, data);
}

function finalizeSpec(spec: ChartSpec, schema: DatasetSchema, nl: string, data: DataRow[]): ChartSpec {
  const normalized = applyTimeDisplayIntent(ensureId(spec), schema, nl);
  validateCompilable(normalized, data);
  return normalized;
}

async function askModel(
  nl: string,
  schema: DatasetSchema,
  candidates: ChartSpec[],
  llm?: LlmConfig,
  extra?: string,
) {
  const content =
    buildGenerateUserPrompt({
      nl,
      schemaJson: JSON.stringify(compactSchemaForPrompt(schema)),
      candidatesJson: JSON.stringify(candidates),
    }) + (extra ? `\n\n${extra}` : '');

  return chatCompletion(
    [
      { role: 'system', content: CHART_SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    llm,
  );
}

function rulesFallback(schema: DatasetSchema, reason: string, nl?: string): GenerateChartResult {
  const spec = recommendByRules(schema, 1, nl)[0];
  if (!spec) {
    throw new Error(`No rule fallback available: ${reason}`);
  }
  const friendly =
    reason.includes('Missing DeepSeek API key') || reason.includes('API key')
      ? '未配置 API Key，已使用规则推荐'
      : `AI 不可用，已使用规则推荐（${reason}）`;
  return {
    spec: { ...spec, insight: friendly },
    source: 'rules',
    schema,
    warnings: [friendly, reason],
  };
}

export async function generateChartSpec(args: GenerateChartArgs): Promise<GenerateChartResult> {
  const schema = args.schema ?? profileData(args.data);
  const candidates = recommendByRules(schema, 3, args.nl);
  const fallback = Boolean(args.fallbackToRules);

  try {
    let raw = await askModel(args.nl, schema, candidates, args.llm);
    let parsed = parseSpec(raw);

    let missing = unknownFields(parsed, schema);
    if (missing.length) {
      raw = await askModel(
        args.nl,
        schema,
        candidates,
        args.llm,
        `Previous invalid spec used unknown fields: ${missing.join(', ')}. Fix and return JSON only.`,
      );
      parsed = parseSpec(raw);
      missing = unknownFields(parsed, schema);
      if (missing.length) {
        throw new Error(`Spec still references unknown fields: ${missing.join(', ')}`);
      }
    }

    try {
      parsed = finalizeSpec(parsed, schema, args.nl, args.data);
    } catch (compileError) {
      const msg = compileError instanceof Error ? compileError.message : String(compileError);
      raw = await askModel(
        args.nl,
        schema,
        candidates,
        args.llm,
        `Previous spec failed to compile: ${msg}. For timestamps use encode.x=timeField, style.xAxisType="time", style.timeZone="local". Return corrected ChartSpec JSON.`,
      );
      parsed = finalizeSpec(parseSpec(raw), schema, args.nl, args.data);
    }

    return { spec: parsed, source: 'llm', schema, raw };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (fallback) {
      return rulesFallback(schema, message, args.nl);
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function patchChartSpec(args: {
  nl: string;
  spec: ChartSpec;
  data: DataRow[];
  llm?: LlmConfig;
  fallbackToRules?: boolean;
}): Promise<GenerateChartResult> {
  const schema = profileData(args.data);
  try {
    const raw = await chatCompletion(
      [
        { role: 'system', content: CHART_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildPatchUserPrompt({
            nl: args.nl,
            currentSpecJson: JSON.stringify(args.spec),
            schemaJson: JSON.stringify(compactSchemaForPrompt(schema)),
          }),
        },
      ],
      args.llm,
    );
    const parsed = finalizeSpec(parseSpec(raw), schema, args.nl, args.data);
    return { spec: parsed, source: 'llm', schema, raw };
  } catch (error) {
    if (args.fallbackToRules) {
      return rulesFallback(schema, error instanceof Error ? error.message : String(error), args.nl);
    }
    throw error;
  }
}
