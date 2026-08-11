# 多框架第三方引入兼容框架 & Demo 页面设计

> 状态：**仅设计，暂不实现**  
> 结论：**可以**作为 React / Vue 的第三方组件库直接 `npm install` 使用；同时提供框架无关的 `core`，供纯 JS / 其他运行时复用。

---

## 0. 一句话答案

**可以。** 采用「**一个 Core + 多框架 Adapter 分包发布**」：

| 包名 | 给谁用 | 安装方式 |
|------|--------|----------|
| `@ai-echarts/core` | 任意 TS/JS 项目、Node、Worker | `npm i @ai-echarts/core echarts` |
| `@ai-echarts/react` | React 18+ | `npm i @ai-echarts/react echarts` |
| `@ai-echarts/vue` | Vue 3 | `npm i @ai-echarts/vue echarts` |
| `@ai-echarts/ai`（可选） | 需要 NL→图 的应用 | 再装 AI 适配层 |

业务侧**不绑死单一框架**：同一份 `ChartSpec` + 同一份 `data`，在 React / Vue / 纯 JS 里行为一致。

---

## 1. 兼容框架总览

```text
                    ┌──────────────────────────┐
                    │     消费方业务应用        │
                    │  React App / Vue App /   │
                    │  Node 导出 / Agent MCP   │
                    └────────────┬─────────────┘
                                 │  npm 引入
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
   @ai-echarts/react      @ai-echarts/vue         @ai-echarts/core
   (JSX 组件)             (SFC / 组合式 API)      (纯函数 / 类型)
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 ▼
                        ChartSpec + compile()
                                 ▼
                           Apache ECharts
```

### 1.1 设计原则

1. **框架只做壳**：生命周期、ref、事件桥接；业务逻辑全在 `core`。
2. **peerDependencies 外置**：`react` / `vue` / `echarts` 由消费方提供，避免多实例与体积膨胀。
3. **API 镜像对齐**：React / Vue 的 props、事件、默认行为尽量同名同义，降低迁移成本。
4. **双入口形态**：
   - **声明式**：`<AiChart spec data />`（推荐，AI/看板主路径）
   - **命令式/糖衣**：`<LineChart x y />`（手写场景）
5. **可树摇**：按需导出组件与 chart builders，不强制全量 ECharts。

---

## 2. 发包与工程结构（兼容框架）

### 2.1 Monorepo 布局

```text
ai-echarts/
├── packages/
│   ├── core/                 # @ai-echarts/core
│   ├── react/                # @ai-echarts/react
│   ├── vue/                  # @ai-echarts/vue
│   ├── ai/                   # @ai-echarts/ai（可选二期）
│   └── shared-styles/        # 可选：容器/loading 基础样式
├── apps/
│   ├── demo-react/           # React 使用 Demo（对外展示 + 本地联调）
│   ├── demo-vue/             # Vue 使用 Demo
│   └── docs-site/            # 文档站（VitePress，内嵌双端示例）
├── examples/
│   ├── react-vite/           # 最小接入示例（给文档复制）
│   └── vue-vite/
└── fixtures/                 # 共享 ChartSpec / CSV 样例数据
```

### 2.2 各包职责边界

| 包 | 包含 | 禁止包含 |
|----|------|----------|
| `core` | ChartSpec 类型、Zod、profile、recommend、compile、theme、transforms | React/Vue/DOM 专有 API |
| `react` | `AiChart` / `AiDashboard` / hooks / Provider | 推荐算法、编译逻辑（调用 core） |
| `vue` | 同名组件 + `provide/inject` 主题 | 同上 |
| `ai` | LLM provider、generate/patch Spec | UI 渲染 |

### 2.3 package.json 约定（设计稿）

**`@ai-echarts/react`**

```json
{
  "name": "@ai-echarts/react",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "echarts": ">=5.5.0"
  },
  "dependencies": {
    "@ai-echarts/core": "^0.1.0"
  },
  "sideEffects": false
}
```

**`@ai-echarts/vue`**

```json
{
  "name": "@ai-echarts/vue",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "vue": "^3.4.0",
    "echarts": ">=5.5.0"
  },
  "dependencies": {
    "@ai-echarts/core": "^0.1.0"
  },
  "sideEffects": false
}
```

**构建要点（设计约束）**

- Vite library mode + `vite-plugin-dts`
- `external`: `react` / `react/jsx-runtime` / `vue` / `echarts` / `@ai-echarts/core`
- 输出 **ESM 优先**（现代脚手架默认）；如需 CDN 再补 UMD/IIFE 次要产物
- 发布工具：Changesets；版本：core 与 adapter **同 major 对齐**

### 2.4 版本与兼容矩阵

| 消费方 | 最低版本 | 备注 |
|--------|----------|------|
| React | 18.0 | 支持 Concurrent；不主动支持 React 17 |
| Vue | 3.4 | Composition API；不做 Vue 2 |
| ECharts | 5.5 / 6.x | peer 范围写宽，compile 层做兼容测试 |
| TypeScript | 5.0+ | 发布完整 `.d.ts` |
| 打包器 | Vite / Webpack 5 / Rspack / Next.js | Next 需 `transpilePackages` 说明 |

---

## 3. 统一公共 API（跨框架镜像）

### 3.1 核心类型（来自 core，两端共用）

```ts
import type { ChartSpec, DashboardSpec, DatasetSchema } from '@ai-echarts/core';
```

### 3.2 组件清单（React / Vue 同名）

| 组件 | 作用 | 必填 props |
|------|------|------------|
| `AiChart` | Spec + data → 单图 | `spec`, `data` |
| `AiDashboard` | 多图看板 | `spec`, `data` 或 `dataSources` |
| `BaseChart` | 直接吃 ECharts option（高级逃逸舱） | `option` |
| `ChartProvider` | 主题 / 默认 locale / echarts 实例注入 | `theme?` |
| 糖衣组件（可选） | `LineChart` `BarChart` `PieChart`… | 字段映射 props |

### 3.3 Props / Events 对齐表

| 能力 | React | Vue 3 |
|------|-------|-------|
| Spec | `spec={...}` | `:spec="..."` |
| 数据 | `data={rows}` | `:data="rows"` |
| 主题 | `theme="brand"` | `theme="brand"` |
| 加载 | `loading` | `loading` |
| 高度 | `height={360}` | `height={360}` / `height="360px"` |
| 就绪回调 | `onReady(instance)` | `@ready="onReady"` |
| 点击 | `onChartClick(params)` | `@chart-click="..."` |
| Spec 非法 | `onSpecInvalid(errors)` | `@spec-invalid="..."` |
| 获取实例 | `ref` → `getEchartsInstance()` | `ref` → 同名方法 |
| 全局配置 | `<ChartProvider theme>` | `provide(CHART_THEME_KEY)` 或 `<ChartProvider>` |

**约定**：事件语义一致；仅命名风格跟随框架惯例（React `onXxx` / Vue `@xxx`）。

### 3.4 消费方最小接入（设计示例，非实现）

**React**

```tsx
import { AiChart } from '@ai-echarts/react';
import type { ChartSpec } from '@ai-echarts/core';

const spec: ChartSpec = {
  id: 'sales-by-region',
  chartType: 'bar',
  title: '地区销售额',
  encode: { x: 'region', y: 'sales' },
};

export function SalesChart({ rows }) {
  return <AiChart spec={spec} data={rows} height={360} theme="light" />;
}
```

**Vue**

```vue
<script setup lang="ts">
import { AiChart } from '@ai-echarts/vue';
import type { ChartSpec } from '@ai-echarts/core';

const spec: ChartSpec = {
  id: 'sales-by-region',
  chartType: 'bar',
  title: '地区销售额',
  encode: { x: 'region', y: 'sales' },
};
defineProps<{ rows: Record<string, unknown>[] }>();
</script>

<template>
  <AiChart :spec="spec" :data="rows" :height="360" theme="light" />
</template>
```

**纯 Core（无 UI 框架）**

```ts
import { compile } from '@ai-echarts/core';
import * as echarts from 'echarts';

const option = compile(spec, rows, { theme: 'light' });
const chart = echarts.init(dom);
chart.setOption(option);
```

### 3.5 与 AI 层的衔接（可选依赖）

```ts
// 业务后端或 BFF
import { generateChartSpec } from '@ai-echarts/ai';
import { AiChart } from '@ai-echarts/react'; // 或 vue

const spec = await generateChartSpec({ nl: userText, data: rows });
// 前端只负责渲染，不关心模型
<AiChart spec={spec} data={rows} />
```

**关键**：AI 包产出 Spec；UI 包只渲染 Spec——两端框架可随时替换。

---

## 4. 运行时兼容细节（设计决策）

| 主题 | 决策 |
|------|------|
| SSR（Next / Nuxt） | 默认 CSR；提供 `ssr: false` 动态导入指引；服务端出图走 `@ai-echarts/server`（二期） |
| 多 echarts 副本 | peer + 文档强调「应用只装一份 echarts」 |
| 按需注册 | `core` 提供 `registerPreset('basic' \| 'all')`；或消费方自行 `echarts.use` |
| 样式 | 图表本身 canvas/svg；仅容器/loading 提供极薄 CSS，可关闭 |
| 暗色主题 | `ChartProvider` / props `theme`；与业务 CSS 变量桥接在 adapter 文档说明 |
| 国际化 | `locale` 走 Provider；tooltip 文案字典放 core |
| 严格 CSP | 不注入任意 JS formatter；白名单 formatter id |

---

## 5. Demo 页面设计（先设计，不实现）

目标：证明「第三方引入即可用」，并覆盖 **手写 Spec / 糖衣组件 / Dashboard /（可选）NL 生成** 四条路径；React 与 Vue **各有一份镜像 Demo**，共享同一套 fixtures。

### 5.1 Demo 产品定位

- 不是营销官网，是 **组件使用说明书的可运行版**
- 左侧导航能力场景，右侧实时预览 + 可复制代码
- 顶部可切换 **React Demo / Vue Demo**（两个 app 或同一 docs 站双 Tab）

### 5.2 信息架构（IA）

```text
Demo Site
├── 概览 Overview
│   ├── 安装方式（npm）
│   ├── 三分钟最小示例
│   └── 架构示意（core / react / vue）
├── 单图 Charts
│   ├── AiChart + ChartSpec
│   ├── Line / Bar / Pie / Scatter …
│   ├── 主题切换
│   └── 事件与实例方法
├── 看板 Dashboard
│   ├── AiDashboard 静态 Spec
│   ├── 栅格布局与筛选联动
│   └── 多数据源 dataSources
├── AI 生成（可选开关）
│   ├── 上传 CSV / 粘贴 JSON
│   ├── 自然语言出图
│   └── 对话式 patch（「改成堆叠」「Top10」）
├── 高级
│   ├── BaseChart 原生 option
│   ├── 大数据 / loading
│   └── 非法 Spec 降级 table
└── 对比 Playground
    └── 同一 Spec 在「代码面板」显示 React / Vue 双端用法
```

### 5.3 页面线框（首屏与核心页）

#### A. Overview 首屏

```text
┌────────────────────────────────────────────────────────────┐
│  AI-ECharts Demo          [React] [Vue]     Docs  GitHub   │
├──────────┬─────────────────────────────────────────────────┤
│ 概览     │  AI-ECharts                                     │
│ 单图     │  一套 Spec，React / Vue 直接 npm 引入           │
│ 看板     │                                                 │
│ AI       │  [ npm i @ai-echarts/react echarts ]            │
│ 高级     │                                                 │
│          │  ┌─────────────────┐  ┌──────────────────────┐  │
│          │  │  实时预览图      │  │  最小代码（可切换     │  │
│          │  │  (bar 示例)     │  │   React | Vue)       │  │
│          │  └─────────────────┘  └──────────────────────┘  │
└──────────┴─────────────────────────────────────────────────┘
```

设计约束（呼应落地页规范，Demo 偏工具向可略收敛）：

- 首屏只做一件事：**说明如何引入 + 看到一张能跑的图**
- 不做统计条、多卡片堆砌；预览区全宽图表平面，代码区次级
- 字体与背景用文档站统一主题 token，避免默认 Inter + 紫渐变套路

#### B. 单图页 `Charts / AiChart`

```text
┌────────────────────────────────────────────────────────────┐
│ 左侧：控件                              右侧：预览         │
│ ┌ chartType 选择 ─────────┐            ┌──────────────┐   │
│ │ line bar pie scatter…   │            │              │   │
│ └─────────────────────────┘            │   AiChart    │   │
│ xField [region ▼] yField [sales ▼]     │              │   │
│ theme  ( light | dark | brand )        └──────────────┘   │
│ stacked [ ] smooth [ ]                                     │
│ ┌ 生成的 ChartSpec JSON（只读/可编辑）──────────────────┐ │
│ │ { chartType, encode, ... }                            │ │
│ └───────────────────────────────────────────────────────┘ │
│ ┌ 框架代码 Tab：React | Vue ────────────────────────────┐ │
│ │ 自动根据当前 Spec 生成接入代码，一键复制               │ │
│ └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

交互：

1. 改控件 → Spec 更新 → 预览即时重绘  
2. 直接改 Spec JSON → 校验 → 合法则回写控件与预览  
3. 切换 React/Vue 代码 Tab **不改变预览数据**，只切换「如何引入」的示例字符串  

#### C. Dashboard 页

```text
┌────────────────────────────────────────────────────────────┐
│ 筛选条：地区 [全部▼]  时间范围 [....]   [重置]             │
├────────────────────────────────────────────────────────────┤
│  KPI  KPI  KPI  KPI                                        │
│  ┌──────── trend (8列) ────────┐ ┌── compare (4列) ──┐    │
│  │                             │ │                   │    │
│  └─────────────────────────────┘ └───────────────────┘    │
│  ┌── composition ──┐  ┌──────── table ──────────────┐     │
│  │                 │  │                             │     │
│  └─────────────────┘  └─────────────────────────────┘     │
├────────────────────────────────────────────────────────────┤
│ DashboardSpec JSON + 接入代码（React/Vue）                 │
└────────────────────────────────────────────────────────────┘
```

#### D. AI 生成页（可 Mock）

```text
┌────────────────────────────────────────────────────────────┐
│ ① 数据：拖拽 CSV / 粘贴 JSON / 使用内置样例                │
│ ② Schema 卡片：字段类型、角色提示（只读）                  │
│ ③ 输入：「按地区对比销售额，并给出趋势看板」               │
│    [生成单图]  [生成看板]                                  │
│ ④ 结果：预览 + Spec + 「改成饼图」快捷 patch chips         │
└────────────────────────────────────────────────────────────┘
```

一期 Demo 可用 **规则推荐 Mock AI**（不接真模型），二期再接 `@ai-echarts/ai`。

### 5.4 Demo 技术选型（设计层）

| 项 | 建议 | 理由 |
|----|------|------|
| `apps/demo-react` | Vite + React + TS | 与库构建链一致，HMR 快 |
| `apps/demo-vue` | Vite + Vue 3 + TS | 镜像页面，共享 fixtures |
| 文档站 | VitePress | 可内嵌双端代码组；适合第三方库文档 |
| 样例数据 | `fixtures/sales.json` 等 | 两 Demo 与单测共用 |
| 代码展示 | Shiki / 自带 highlighter | 复制 npm 用法 |
| 路由 | 按 IA 分页面，而非单页长滚动堆功能 | 一页一职责 |

**不建议**：用 Storybook 作为对外唯一 Demo（对「第三方引入教程」不如 VitePress + Playground 直观）；Storybook 可作内部组件开发辅具。

### 5.5 Demo 必须覆盖的验收场景

| # | 场景 | 通过标准 |
|---|------|----------|
| 1 | npm 最小示例 | 复制 Overview 代码到空白 Vite 项目可跑通（文档写清） |
| 2 | Spec 驱动单图 | 切换类型/字段，预览与 JSON 同步 |
| 3 | 主题 | light/dark/brand 三套可见差异 |
| 4 | 事件 | click 打出 category/value |
| 5 | Dashboard | 筛选联动多图 |
| 6 | 非法 Spec | 提示错误或降级 table，不白屏 |
| 7 | 双端代码 | 同一 Spec 展示 React / Vue 引入片段 |
| 8 | （可选）NL | Mock 或真模型生成可用 Spec |

### 5.6 Demo 与文档站关系

```text
docs-site (VitePress)
  ├─ Guide: 安装 / React 接入 / Vue 接入 / ChartSpec 协议
  ├─ 内嵌 CodeGroup（react | vue）
  └─ 链接到「在线 Demo」→ demo-react / demo-vue 部署地址

demo-react / demo-vue
  └─ 重交互 Playground（改 Spec、上传数据、看板）
```

部署形态（后期）：

- `docs.ai-echarts.dev` → 文档  
- `demo.ai-echarts.dev/react` · `/vue` → 双 Demo  
或 monorepo 同域子路径。

---

## 6. 消费方接入检查清单（给未来 README 用）

**React 项目**

1. `npm i @ai-echarts/react echarts`  
2. 用 `AiChart` 传入 `spec` + `data`  
3. 容器父级有明确高度，或传 `height`  
4. Next.js：`transpilePackages: ['@ai-echarts/react', '@ai-echarts/core']`，图表组件 `dynamic(..., { ssr:false })`

**Vue 项目**

1. `npm i @ai-echarts/vue echarts`  
2. `<AiChart :spec :data />`  
3. Nuxt：客户端组件 / `<ClientOnly>` 包裹  
4. 可选：全局 `app.use` 注册（非必须，推荐按需 import）

**两端共通**

1. 不要再装一份不同 major 的 echarts  
2. 大数据先聚合再喂 `data`，或使用 Spec `transform`  
3. AI 场景只把 Spec 存库/传前端，不要存完整 option（难维护）

---

## 7. 与主方案文档的关系

| 文档 | 焦点 |
|------|------|
| [AI-ECharts-组件库与Dashboard方案.md](./AI-ECharts-组件库与Dashboard方案.md) | 产品能力、AI 管线、ChartSpec、跨端原则 |
| **本文** | **如何作为第三方库被 React/Vue 引入**、包边界、API 镜像、Demo IA/线框 |

实现阶段建议顺序：

1. 冻结本文 API 对齐表与包名  
2. 实现 `core` → `react` → `demo-react`  
3. 镜像实现 `vue` → `demo-vue`  
4. 再补文档站与（可选）AI Demo  

---

## 8. 设计结论

1. **可以**作为 React / Vue 第三方组件库直接使用，且应 **分包发布**，而不是一个包强行混装两套框架运行时。  
2. **兼容框架** = `core`（契约与编译）+ `react`/`vue`（薄 Adapter）+ 对齐 API + peerDependencies。  
3. **Demo** 用双应用镜像（或文档站双 Tab）证明「同一 Spec，两端引入」；首期用 fixtures + 规则引擎即可，不必先接真 LLM。

---

## 9. 相关文档

- [方案评审 · 实现清单 · AI 依赖与开源 Skills](./方案评审-实现清单与AI依赖.md)：开工前你需要提供什么、模型与 Key、可复用 Skills。
