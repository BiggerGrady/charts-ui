# charts-ui / ai-echarts

AI-ECharts：以 **ChartSpec** 为契约的 ECharts 组件库，支持 React / Vue 同一包引入，并接入 DeepSeek 自然语言出图。

## 包入口

```bash
pnpm install
pnpm build
```

```ts
import { compile, generateChartSpec, type ChartSpec } from 'ai-echarts';
import { AiChart } from 'ai-echarts/react';
import { AiChart as VueAiChart } from 'ai-echarts/vue';
```

## Demo

```bash
# 终端 1
pnpm --filter ai-echarts build
pnpm dev:react   # http://localhost:5173

# 或
pnpm dev:vue     # http://localhost:5174
```

在 Demo 页面输入 DeepSeek API Key，或在根目录创建 `.env`：

```bash
cp .env.example .env
# AI_ECHARTS_LLM_API_KEY=sk-...
# AI_ECHARTS_LLM_MODEL=deepseek-v4-flash
```

无 Key 时可点「仅规则推荐」或「AI（失败则规则回退）」。

## 一期范围

- 单包 `ai-echarts`：`/` · `/react` · `/vue` · `/ai`
- 图表：line / bar / area / pie / scatter / table
- AI：DeepSeek `deepseek-v4-flash` / `deepseek-v4-pro`
- 数据：通用 `DataRow[]` + Demo 合成 fixtures

## 文档

- [主方案](./docs/AI-ECharts-组件库与Dashboard方案.md)
- [多框架引入与 Demo 设计](./docs/多框架第三方引入与Demo设计.md)
- [方案评审与 AI 依赖](./docs/方案评审-实现清单与AI依赖.md)
- [决策记录](./docs/决策记录-已确认项.md)

## 开发脚本

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建库 |
| `pnpm test` | 核心单测 |
| `pnpm dev:react` | React Demo |
| `pnpm dev:vue` | Vue Demo |
