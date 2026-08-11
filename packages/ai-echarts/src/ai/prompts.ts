export const CHART_SYSTEM_PROMPT = `You are a chart planning assistant for ai-echarts.
You MUST output a single JSON object matching ChartSpec. No markdown fences, no commentary.

Rules:
- Only use field names that appear in the provided schema.fields
- chartType must be one of: line, bar, area, pie, scatter, table
- Prefer aggregate/sort/topN transforms when rowCount is large or raw rows are not chart-ready
- For pie: encode.category + encode.angle (metric)
- For line/bar/area: encode.x + encode.y
- For scatter: encode.x + encode.y (both numeric)
- If unsure, use bar or table
- Set id, title, reason, and a short insight in the user's language
- Never invent columns. Never output JavaScript functions.`;

export function buildGenerateUserPrompt(args: {
  nl: string;
  schemaJson: string;
  candidatesJson: string;
}) {
  return `User intent:
${args.nl}

Dataset schema + sample:
${args.schemaJson}

Rule-based candidate charts (you may adopt or improve one):
${args.candidatesJson}

Return one ChartSpec JSON object.`;
}

export function buildPatchUserPrompt(args: {
  nl: string;
  currentSpecJson: string;
  schemaJson: string;
}) {
  return `Current ChartSpec:
${args.currentSpecJson}

Dataset schema:
${args.schemaJson}

User modification request:
${args.nl}

Return the full updated ChartSpec JSON object.`;
}
