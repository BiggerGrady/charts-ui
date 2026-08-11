<script setup lang="ts">
import { computed, ref } from 'vue';
import { recommendByRules, type ChartSpec, type DataRow } from 'ai-echarts';
import { AiChart } from 'ai-echarts/vue';

const salesRows: DataRow[] = [
  { region: '华东', date: '2026-01-01', sales: 1200, qty: 40, channel: '线上' },
  { region: '华北', date: '2026-01-01', sales: 980, qty: 32, channel: '线下' },
  { region: '华南', date: '2026-01-01', sales: 1100, qty: 36, channel: '线上' },
  { region: '西南', date: '2026-01-01', sales: 760, qty: 22, channel: '线下' },
  { region: '华东', date: '2026-01-02', sales: 1320, qty: 44, channel: '线上' },
  { region: '华北', date: '2026-01-02', sales: 1010, qty: 33, channel: '线下' },
  { region: '华南', date: '2026-01-02', sales: 1180, qty: 38, channel: '线上' },
  { region: '西南', date: '2026-01-02', sales: 810, qty: 24, channel: '线下' },
];

const KEY_STORAGE = 'ai-echarts.demo.deepseekKey';
const dataText = ref(JSON.stringify(salesRows, null, 2));
const nl = ref('看一下销售额随日期的变化趋势');
const apiKey = ref(sessionStorage.getItem(KEY_STORAGE) ?? '');
const model = ref<'deepseek-v4-flash' | 'deepseek-v4-pro'>('deepseek-v4-flash');
const theme = ref<'light' | 'dark' | 'brand'>('brand');
const spec = ref<ChartSpec | null>(null);
const source = ref<'llm' | 'rules' | null>(null);
const status = ref('Vue Demo：BFF /api/generate-chart');
const error = ref('');
const loading = ref(false);

const data = computed(() => {
  try {
    const parsed = JSON.parse(dataText.value) as DataRow[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
});

async function onGenerate(fallbackToRules: boolean) {
  error.value = '';
  if (!data.value) {
    error.value = 'JSON 数据解析失败';
    return;
  }
  if (apiKey.value) sessionStorage.setItem(KEY_STORAGE, apiKey.value);
  loading.value = true;
  try {
    const res = await fetch('/api/generate-chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nl: nl.value,
        data: data.value,
        model: model.value,
        fallbackToRules,
        apiKey: apiKey.value || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    spec.value = json.spec;
    source.value = json.source;
    status.value =
      json.source === 'llm'
        ? `DeepSeek (${model.value}) via BFF 已生成`
        : `规则回退：${json.warnings?.[0] ?? 'AI unavailable'}`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

function onRulesOnly() {
  if (!data.value) {
    error.value = 'JSON 数据解析失败';
    return;
  }
  spec.value = recommendByRules(data.value, 1, nl.value)[0] ?? null;
  source.value = 'rules';
  status.value = `已使用本地规则推荐（参考意图：${nl.value}）`;
}
</script>

<template>
  <div class="app">
    <h1 class="brand">ai-echarts</h1>
    <p class="lead">Vue 入口：<code>import { AiChart } from 'ai-echarts/vue'</code></p>
    <div class="layout">
      <aside class="panel">
        <h2>Controls</h2>
        <label>DeepSeek API Key</label>
        <input v-model="apiKey" type="password" placeholder="sk-... 或 .env" autocomplete="off" />
        <label>Model</label>
        <select v-model="model">
          <option value="deepseek-v4-flash">deepseek-v4-flash</option>
          <option value="deepseek-v4-pro">deepseek-v4-pro</option>
        </select>
        <label>Theme</label>
        <select v-model="theme">
          <option value="light">light</option>
          <option value="dark">dark</option>
          <option value="brand">brand</option>
        </select>
        <label>Natural language</label>
        <textarea v-model="nl" />
        <label>Data (JSON array)</label>
        <textarea v-model="dataText" />
        <div class="actions">
          <button data-testid="btn-ai" :disabled="loading" @click="onGenerate(false)">AI 生成图表</button>
          <button data-testid="btn-ai-fallback" class="secondary" :disabled="loading" @click="onGenerate(true)">
            AI（可回退）
          </button>
          <button data-testid="btn-rules" class="secondary" :disabled="loading" @click="onRulesOnly">
            仅规则推荐
          </button>
        </div>
        <p data-testid="status" class="status" :class="{ error: !!error }">{{ error || status }}</p>
      </aside>
      <main class="panel">
        <h2>Preview {{ source ? `· ${source}` : '' }}</h2>
        <AiChart v-if="spec && data" :spec="spec" :data="data" :theme="theme" :height="420" />
        <p v-else class="status">生成后将在此渲染图表。</p>
        <pre v-if="spec" data-testid="spec-box" class="spec-box">{{ JSON.stringify(spec, null, 2) }}</pre>
      </main>
    </div>
  </div>
</template>
