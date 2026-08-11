export type {
  ChartEncode,
  ChartSpec,
  ChartStyle,
  ChartType,
  DashboardSpec,
  DashboardWidget,
  DataRow,
  DatasetSchema,
  FieldProfile,
  FieldRoleHint,
  FieldType,
  ThemeName,
  TransformOp,
} from './core/types';

export {
  chartSpecSchema,
  dashboardSpecSchema,
  chartTypeSchema,
  chartEncodeSchema,
} from './core/schema';

export { profileData, compactSchemaForPrompt } from './core/profile';
export { recommendByRules, recommendChartType } from './core/recommend';
export { applyTransforms } from './core/transform';
export { compile, safeCompile, type CompileOptions } from './core/compile';
export { getThemeTokens, type ThemeTokens } from './core/theme';

// AI helpers also available from root for convenience
export {
  generateChartSpec,
  patchChartSpec,
  resolveLlmConfig,
  MissingApiKeyError,
} from './ai';
