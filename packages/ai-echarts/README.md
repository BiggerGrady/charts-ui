# ai-echarts

AI-friendly Apache ECharts library with a shared **ChartSpec**, React/Vue adapters, and DeepSeek natural-language chart generation.

## Install

```bash
npm i ai-echarts echarts
# React apps also need react / react-dom
# Vue apps also need vue
```

## Usage

```ts
import { compile, type ChartSpec } from 'ai-echarts'; // core only
import { AiChart } from 'ai-echarts/react'; // or 'ai-echarts/vue'
import { generateChartSpec } from 'ai-echarts/ai'; // keep AI off the UI bundle root
```

### React

```tsx
import { AiChart } from 'ai-echarts/react';

<AiChart spec={spec} data={rows} height={360} theme="light" />
```

### Vue

```vue
<script setup>
import { AiChart } from 'ai-echarts/vue';
</script>
<template>
  <AiChart :spec="spec" :data="rows" :height="360" theme="light" />
</template>
```

### AI (DeepSeek)

```ts
import { generateChartSpec } from 'ai-echarts/ai';

const { spec, source } = await generateChartSpec({
  nl: '按地区对比销售额',
  data: rows,
  fallbackToRules: true, // if no API key, use rule recommend
});
```

Environment variables:

```bash
AI_ECHARTS_LLM_API_KEY=sk-...
AI_ECHARTS_LLM_MODEL=deepseek-v4-flash   # or deepseek-v4-pro
AI_ECHARTS_LLM_BASE_URL=https://api.deepseek.com
```

`DEEPSEEK_API_KEY` is also accepted.

## Chart types (v0.1)

`line` · `bar` · `area` · `pie` · `scatter` · `table`
