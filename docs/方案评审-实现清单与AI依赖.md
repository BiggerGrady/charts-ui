# 方案评审 · 实现清单 · 你需要提供什么 · 模型与开源 Skills

> 对现有两份设计文档的复审结论，以及开工前的依赖/决策清单。  
> 相关文档：
> - [AI-ECharts-组件库与Dashboard方案.md](./AI-ECharts-组件库与Dashboard方案.md)
> - [多框架第三方引入与Demo设计.md](./多框架第三方引入与Demo设计.md)

---

## 1. 文档复审结论（总体）

| 维度 | 评价 | 说明 |
|------|------|------|
| 方向正确性 | ✅ 高 | Spec 中间层 + LLM 只决策 + core/adapter 分包，与业界共识一致 |
| 可落地性 | ✅ 中高 | Phase 划分清楚；缺「最小可交付切片」与决策闸门 |
| 完整性 | ⚠️ 有缺口 | 缺鉴权/密钥、模型选型、Skills 复用边界、成本与失败策略 |
| 两文档一致性 | ✅ 基本一致 | 包名、ChartSpec、React/Vue 镜像 API 对齐 |
| 过度设计风险 | ⚠️ 需控 | Dashboard + AI + 多端一次铺开会拖慢；必须分轨交付 |

**一句话**：方案能做，但应拆成「无 AI 也能用的组件库」和「可选 AI 增强」两条线；**没有大模型 Key 也能先做出可用的第三方组件库**。

---

## 2. 实现对齐：建议怎么落地（比原文档更硬的切片）

### 2.1 两条交付线（务必分开）

```text
轨道 A（不依赖 LLM，优先）
  core.compile + react/vue AiChart + Demo
  → 用户手写 ChartSpec / 规则推荐即可出图
  → 可 npm 给第三方用

轨道 B（依赖 LLM，可选）
  @ai-echarts/ai：NL → ChartSpec / DashboardSpec
  → 需要你提供模型 API Key（或兼容网关）
```

原文档把 AI 写得很重，容易让人以为「没 Key 就不能开工」。应改成：**A 是产品主体，B 是增值能力**。

### 2.2 推荐实现顺序（修订版）

| 阶段 | 交付物 | 是否要 Key | 验收 |
|------|--------|------------|------|
| P0 | 冻结 ChartSpec Zod + fixtures | 否 | 类型与样例稳定 |
| P1 | `@ai-echarts/core`：profile / recommend(规则) / compile | 否 | 单测：CSV→option |
| P2 | `@ai-echarts/react` + `demo-react` | 否 | npm 本地 link 可渲染 |
| P3 | `@ai-echarts/vue` + `demo-vue` | 否 | 同 Spec 双端一致 |
| P4 | `@ai-echarts/ai`：generate/patch Spec | **是** | NL 出图准确率基线 |
| P5 | DashboardSpec + AiDashboard | 否/可选 AI | 静态看板先于 AI 组合 |
| P6 | MCP / 自有 Skill 包装 | 可选 | Agent 可调用 |

### 2.3 文档里需要收紧的点

1. **ChartSpec 字段要立刻冻结一版 v0**（现在还是草案口吻，实现时最怕反复改契约）。  
2. **禁止默认路径 = LLM 直出 ECharts option**（两文档已写，实现时要写成硬校验）。  
3. **AntV 生态 ≠ ECharts 生态**：开源 Skills 很多基于 AntV/GPT-Vis；可借鉴流程，不能直接当渲染层（见第 5 节）。  
4. **Demo 一期用规则引擎 Mock AI**，避免被 Key/模型卡住联调。  
5. 包名 `@ai-echarts/*` 只是设计名；若 npm 占用或品牌未定，需你确认最终 scope。

---

## 3. 需要你提供什么？

按「必须 / 强烈建议 / 可选」分级。

### 3.1 必须（决定产品边界）

| 项 | 为什么需要 | 你可以怎么回 |
|----|------------|--------------|
| **目标框架优先级** | 先做 React 还是 Vue，或两端并行 | 例：先 React，Vue 镜像 |
| **npm 包 scope / 品牌名** | 发包与文档域名 | 例：`@ai-echarts` 或你们公司 scope |
| **一期图表白名单** | 控制 compile 工作量 | 建议：line/bar/area/pie/scatter/table |
| **是否一期就要 AI NL 出图** | 决定要不要立刻准备 Key | 建议：P1–P3 不做 AI，P4 再上 |

### 3.2 做 AI 能力时必须（轨道 B）

| 项 | 说明 |
|----|------|
| **大模型 API Key** | OpenAI / Anthropic / 国内兼容网关（通义、DeepSeek、智谱、Moonshot 等）任一即可 |
| **API Base URL** | 若走代理或企业网关，需提供 `baseURL` |
| **是否允许数据出域** | 默认只上传 schema + 2～5 行样本；若合规要求「数据不出内网」，需本地/私有化模型 |
| **默认模型名** | 如 `gpt-4.1`、`claude-sonnet-4`、`deepseek-chat`（见第 4 节建议） |

**环境变量设计（实现时建议）**

```bash
# .env.local（勿提交仓库）
AI_ECHARTS_LLM_PROVIDER=openai          # openai | anthropic | openai-compatible
AI_ECHARTS_LLM_API_KEY=sk-...
AI_ECHARTS_LLM_BASE_URL=                # 可选，兼容网关
AI_ECHARTS_LLM_MODEL=gpt-4.1-mini       # 或你选定的模型
AI_ECHARTS_LLM_TIMEOUT_MS=60000
```

> Demo / 服务端读这些变量；**组件库 `@ai-echarts/react|vue` 本身不内置 Key**，避免把密钥打进前端包。

### 3.3 强烈建议提供（提升生成质量）

| 项 | 说明 |
|----|------|
| **1～3 份真实业务样例数据**（可脱敏） | 字段命名、中英混排、脏数据形态直接影响推荐规则与 Prompt |
| **3～10 条典型自然语言需求** | 如「按大区看本月 GMV」「漏斗看注册到付费」——用作评测集 |
| **品牌主题** | 主色、字体偏好、是否必须暗色——写入 theme token |
| **部署形态** | 仅前端 SDK / 是否需要你们自己的 BFF 调模型 |

### 3.4 可选

| 项 | 说明 |
|----|------|
| 已有设计系统 / UI 库 | Demo 是否嵌入 Ant Design / Element Plus |
| 小程序 / uni-app 是否一期 | 建议二期 |
| 企业 MCP / 内网模型地址 | 走私有化时需要 |
| npm 发布权限（机器人 Token） | 真要发公网包时再给 |

### 3.5 你**现在不必**提供的

- 完整 ECharts option 模板库（由 compile 生成）
- 训练自有大模型（ROI 极低；用通用模型 + JSON Schema 约束即可）
- 全量生产数据库直连（一期用上传 CSV/JSON 足够）

---

## 4. 模型怎么选？（生成 ChartSpec 场景）

本项目 LLM 任务本质是：**短上下文 + 严格 JSON + 字段映射**，不是长文写作，也不是写复杂 ECharts 代码。

### 4.1 任务难度分级

| 任务 | 难度 | 模型档位 |
|------|------|----------|
| 单图：NL → ChartSpec（字段已在 schema） | 低～中 | **小/中杯够用** |
| patch：「改成堆叠 / Top10」 | 低 | 小杯 |
| 多图 Dashboard 规划 | 中 | 中杯更稳 |
| 脏字段名/弱意图消歧 | 中～高 | 中杯+，或规则先清洗 |
| 直出完整 ECharts option | 高且不推荐 | — |

### 4.2 推荐组合（务实）

| 场景 | 建议模型 | 理由 |
|------|----------|------|
| **默认生产（性价比）** | `gpt-4.1-mini` / `gpt-4o-mini` 或 `deepseek-chat` / 国内同级 | JSON 遵从好、便宜、延迟低；配合 Zod 重试足够 |
| **看板规划 / 难样本** | `gpt-4.1` / `claude-sonnet-4`（或同级） | 多约束规划更稳 |
| **中国大陆网络/合规** | 通义 `qwen-plus`、DeepSeek、智谱 `glm-4`、Moonshot 等 **OpenAI 兼容接口** | Provider 做成可插拔即可 |
| **数据不能出内网** | 本地/私有化：Qwen2.5-72B/32B 指令版、或公司已有网关 | 仍只传 schema+样本 |
| **开发联调** | 任意便宜模型 + 规则 Mock 开关 | `MOCK_AI=1` 时不消耗 Key |

### 4.3 比「换更大模型」更有效的事

1. **输出 JSON Schema / Zod 约束**（structured output / tool calling）  
2. **候选图类型由规则引擎先算好**，LLM 只做选择与命名  
3. **校验失败自动重试 1 次**（把 error 喂回模型）  
4. **禁止函数/formatter 字符串**  
5. 自建 **20 条黄金评测集**（你提供的 NL + 期望 Spec）

经验上：在「Spec + 校验」架构下，**mini/小杯模型即可达到可用**；盲目上旗舰模型收益有限。

### 4.4 成本与安全提醒

- Key **只放服务端 / BFF**，不要写进发布到 npm 的前端包。  
- 默认请求体：schema + sample(≤5) + intent；可配置 `sendSample: false`。  
- 记录 `model`、`spec`、`latency` 便于回归；勿默认落原始全表。

---

## 5. 可复用的开源 Skills / MCP（怎么用、怎么避坑）

### 5.1 重要边界

| 生态 | 渲染引擎 | 与本项目关系 |
|------|----------|--------------|
| AntV GPT-Vis / mcp-server-chart / chart-visualization-skills | **AntV** | 借鉴「Skill/MCP/推荐流程」；**不能直接当 ECharts 渲染层** |
| Echarts-AI-Skill / echarts-chartpage / claude-skills-echart | **ECharts** | 更贴近本项目；可借鉴 ChartRequest→recommend→generate 流水线 |
| 本项目目标 | **ECharts + 自有 ChartSpec** | 最终应沉淀为自己的 Skill/MCP，而不是长期依赖 AntV 出图 |

### 5.2 推荐清单

#### A. 偏「流程与 Agent 工作流」——AntV（参考价值高）

| 资源 | 地址 | 用途 | 注意 |
|------|------|------|------|
| **chart-visualization-skills** | https://github.com/antvis/chart-visualization-skills | Claude Code 等：`npx skills add antvis/chart-visualization-skills` | 生成的是 AntV/GPT-Vis 体系 |
| **GPT-Vis Chart Skill** | https://github.com/antvis/GPT-Vis（skills/chart-visualization） | 图表推荐 + 语法/代码模式 | 同上 |
| **@antv/mcp-server-chart** | https://github.com/antvis/mcp-server-chart | MCP：25+ 图类型工具调用 | 默认可能走 AntV 云端渲染；可私有化 `VIS_REQUEST_SERVER` |
| **GPT-Vis 库** | https://gpt-vis.antv.vision/ | AI 友好语法、流式、容错 | 若接受换引擎可直接用；本项目坚持 ECharts 则只学设计 |

安装示例：

```bash
# Claude Code / 支持 skills 的 IDE
npx skills add antvis/chart-visualization-skills

# 或从 GPT-Vis 仓库加 skill
npx skills add https://github.com/antvis/GPT-Vis
```

MCP 示例（Cursor / Claude Desktop）：

```json
{
  "mcpServers": {
    "mcp-server-chart": {
      "command": "npx",
      "args": ["-y", "@antv/mcp-server-chart"]
    }
  }
}
```

#### B. 偏「ECharts 确定性生成」——更贴本项目

| 资源 | 地址 | 可借鉴点 |
|------|------|----------|
| **Echarts-AI-Skill** | https://github.com/davaded/Echarts-AI-Skill | NL/请求 → recommend → generate option → HTML/SVG；Skill 工作流 |
| **echarts-chartpage** | https://github.com/RiverThrimp/echarts-chartpage | 白名单图类型、校验、CLI + **MCP**、受控 option |
| **claude-skills-echart** | https://github.com/nealepetrillo/claude-skills-echart | ECharts 设计规范（无障碍色板、零基线等）输出 React/Vue/HTML |
| **EChartify** | https://github.com/grokify/echartify | 非多态 ChartIR + Zod + compile，AI 友好中间层 |

#### C. 偏「Dashboard / GenBI 思路」——产品层参考

| 资源 | 地址 | 可借鉴点 |
|------|------|----------|
| OpenVizAI | https://github.com/jaygajera17/OpenVizAI | LLM 只出 chartSpec，JS 处理全量数据 |
| DataSense | https://github.com/devyanic11/DataSense | Schema 内省 + 多 Agent |
| WrenAI | https://github.com/Canner/WrenAI | 语义层 + Text-to-SQL（接数据库时再看） |

### 5.3 对本项目的建议用法

```text
短期（调研 / 写 Prompt / 搭 Agent 原型）
  → 可安装 AntV skills 或 Echarts-AI-Skill，用来对照「好的推荐话术与步骤」

中期（实现 @ai-echarts/ai）
  → 自研：profile →（规则候选）→ LLM 填 ChartSpec → Zod
  → 不要在生产链路里依赖 AntV 云端出图（引擎不一致）

长期（生态）
  → 发布自己的 MCP：recommend_chart / generate_chart_spec / patch_spec / render
  → 发布自己的 SKILL.md（给 Cursor / Claude Code / Codex）
```

---

## 6. 实现方式复盘（把两份 MD 收成一张图）

```text
[你提供]
  样例数据 + NL 用例 +（可选）LLM Key + 包名/框架优先级
        │
        ▼
┌─────────────────── 轨道 A：组件库 ───────────────────┐
│  ChartSpec → compile → ECharts option                 │
│  @ai-echarts/react | vue  → 第三方 npm 引入           │
│  Demo：手写 Spec / 规则推荐 / Dashboard 静态布局       │
└───────────────────────────────────────────────────────┘
        │ 可选增强
        ▼
┌─────────────────── 轨道 B：AI ───────────────────────┐
│  Schema+Sample+NL → LLM(Key) → ChartSpec/DashboardSpec│
│  校验失败重试 → 仍失败则规则兜底 / table               │
│  Key 仅服务端；前端只收 Spec                          │
└───────────────────────────────────────────────────────┘
```

**第三方使用时：**

- 只用组件库 → **不需要**你的 Key，也不需要用户的 Key。  
- 用你们托管的「NL 出图」服务 → **你方服务端**配置 Key。  
- 用户自带模型 → 文档说明他们配置自己的 `API_KEY` 到自己的 BFF。

---

## 7. 文档问题清单（建议后续改文档时消化）

| # | 问题 | 建议 |
|---|------|------|
| 1 | AI 与组件库耦合叙述偏重 | 明确轨道 A/B；README 置顶「无 Key 可用」 |
| 2 | ChartSpec 仍是草案 | 开实现前贴 v0 JSON Schema 冻结 |
| 3 | 未写密钥与 Provider | 以本文第 3、4 节为准补进主方案 |
| 4 | 开源引用未区分 AntV vs ECharts | 加「可借鉴 / 不可直接依赖」标注 |
| 5 | Demo 与发布包关系略散 | Demo 用 workspace 依赖未发布包；examples 给复制粘贴最小项目 |
| 6 | 缺评测集 | 请你提供 NL 用例后建成 `fixtures/eval/` |

---

## 8. 请你拍板的最小问题单（回复这 6 项即可开工实现）

1. **先做 React、Vue，还是双端一起？**  
2. **npm scope 用什么？**（暂定 `@ai-echarts`？）  
3. **一期图表类型白名单？**（是否同意 line/bar/area/pie/scatter/table）  
4. **一期是否必须上 NL 出图？**（否 = 先不需 Key）  
5. **若上 AI：准备用哪家 API？**（OpenAI / Claude / DeepSeek / 通义 / 其他 + 是否有现成 Key）  
6. **能否提供 1 份脱敏样例数据 + 3 条典型问法？**

---

## 9. 最终建议（给负责人看）

1. **方案成立**，按「core + react/vue 分包 + ChartSpec」推进，第三方引入设计合理。  
2. **你现在最需要提供的不是一堆配置**，而是：框架优先级、包名、图表白名单、是否一期上 AI；上 AI 再补 Key/模型。  
3. **模型**：优先 `*-mini` / DeepSeek 级 + Structured Output；难例再升 Sonnet/4.1。  
4. **开源 Skills**：AntV 的 skill/MCP 适合学流程；ECharts 侧用 Echarts-AI-Skill / echarts-chartpage / EChartify 对齐实现；生产渲染坚持自有 ChartSpec→ECharts。  
5. **没 Key 也能开工**：先把轨道 A 做成可安装组件库与 Demo，再挂轨道 B。
