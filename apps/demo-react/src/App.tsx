import { useMemo, useRef, useState } from 'react';
import { recommendByRules, type ChartSpec, type DataRow } from 'ai-echarts';
import { AiChart } from 'ai-echarts/react';
import { salesRows, tsMsRows } from './fixtures/sales';

const KEY_STORAGE = 'ai-echarts.demo.deepseekKey';

function loadKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

async function generateViaBff(payload: {
  nl: string;
  data: DataRow[];
  model: string;
  fallbackToRules: boolean;
  apiKey?: string;
}) {
  const res = await fetch('/api/generate-chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as {
    error?: string;
    spec?: ChartSpec;
    source?: 'llm' | 'rules';
    warnings?: string[];
  };
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as { spec: ChartSpec; source: 'llm' | 'rules'; warnings?: string[] };
}

export function App() {
  const [dataText, setDataText] = useState(() => JSON.stringify(salesRows, null, 2));
  const [nl, setNl] = useState('按地区对比销售额，用柱状图');
  const [apiKey, setApiKey] = useState(loadKey);
  const [model, setModel] = useState<'deepseek-v4-flash' | 'deepseek-v4-pro'>('deepseek-v4-flash');
  const [spec, setSpec] = useState<ChartSpec | null>(null);
  const [source, setSource] = useState<'llm' | 'rules' | null>(null);
  const [status, setStatus] = useState('通过本地 BFF(/api/generate-chart) 生成图表；Key 优先读服务端环境变量。');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'brand'>('brand');
  const [clickInfo, setClickInfo] = useState('');
  const requestSeq = useRef(0);

  const data = useMemo(() => {
    try {
      const parsed = JSON.parse(dataText) as DataRow[];
      if (!Array.isArray(parsed)) throw new Error('data must be an array');
      return parsed;
    } catch {
      return null;
    }
  }, [dataText]);

  const onGenerate = async (fallbackToRules: boolean) => {
    setError('');
    setClickInfo('');
    if (!data) {
      setError('JSON 数据解析失败，请提供对象数组。');
      return;
    }
    if (apiKey) {
      try {
        sessionStorage.setItem(KEY_STORAGE, apiKey);
      } catch {
        /* ignore */
      }
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const result = await generateViaBff({
        nl,
        data,
        model,
        fallbackToRules,
        apiKey: apiKey || undefined,
      });
      if (seq !== requestSeq.current) return;
      setSpec(result.spec);
      setSource(result.source);
      setStatus(
        result.source === 'llm'
          ? `DeepSeek (${model}) via BFF 已生成 ChartSpec`
          : `规则回退：${result.warnings?.[0] ?? 'AI unavailable'}`,
      );
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const onRulesOnly = () => {
    setError('');
    setClickInfo('');
    if (!data) {
      setError('JSON 数据解析失败，请提供对象数组。');
      return;
    }
    const next = recommendByRules(data, 1, nl)[0];
    setSpec(next);
    setSource('rules');
    setStatus(`已使用本地规则推荐（参考意图：${nl}）`);
  };

  return (
    <div className="app">
      <h1 className="brand">ai-echarts</h1>
      <p className="lead">
        React Demo · ChartSpec 渲染 + 本地 BFF 调 DeepSeek。无 Key 可先点「仅规则推荐」。
      </p>

      <div className="layout">
        <aside className="panel">
          <h2>Controls</h2>

          <label>DeepSeek API Key（可选；更推荐根目录 .env）</label>
          <input
            type="password"
            placeholder="sk-... 或配置 AI_ECHARTS_LLM_API_KEY"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />

          <label>Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value as typeof model)}>
            <option value="deepseek-v4-flash">deepseek-v4-flash</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
          </select>

          <label>Theme</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
            <option value="light">light</option>
            <option value="dark">dark</option>
            <option value="brand">brand</option>
          </select>

          <label>Natural language</label>
          <textarea value={nl} onChange={(e) => setNl(e.target.value)} />

          <label>Data (JSON array)</label>
          <div className="actions" style={{ marginTop: 0, marginBottom: 8 }}>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setDataText(JSON.stringify(salesRows, null, 2));
                setNl('按地区对比销售额，用柱状图');
              }}
            >
              样例：销售
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setDataText(JSON.stringify(tsMsRows, null, 2));
                setNl('根据时间戳数据，横坐标展示为当前时区时间，画折线图');
              }}
            >
              样例：时间戳
            </button>
          </div>
          <textarea value={dataText} onChange={(e) => setDataText(e.target.value)} />

          <div className="actions">
            <button disabled={loading} onClick={() => onGenerate(false)} data-testid="btn-ai">
              {loading ? 'Generating…' : 'AI 生成图表'}
            </button>
            <button
              className="secondary"
              disabled={loading}
              onClick={() => onGenerate(true)}
              data-testid="btn-ai-fallback"
            >
              AI（失败则规则回退）
            </button>
            <button className="secondary" disabled={loading} onClick={onRulesOnly} data-testid="btn-rules">
              仅规则推荐
            </button>
          </div>

          <p className={`status${error ? ' error' : ''}`} data-testid="status">
            {error || status}
          </p>
          {clickInfo ? <p className="status">click: {clickInfo}</p> : null}
          <p className="hint">
            AI 请求走 <code>/api/generate-chart</code>，避免浏览器直连模型。
          </p>
        </aside>

        <main className="panel chart-shell">
          <h2>Preview {source ? `· ${source}` : ''}</h2>
          {spec && data ? (
            <AiChart
              data-testid="chart"
              spec={spec}
              data={data}
              theme={theme}
              height={420}
              onChartClick={(params) => {
                const p = params as { name?: string; value?: unknown };
                setClickInfo(`${p.name ?? ''} ${String(p.value ?? '')}`.trim());
              }}
              onSpecInvalid={(msg) => setError(msg)}
            />
          ) : (
            <p className="status">生成后将在此渲染图表。</p>
          )}
          {spec ? (
            <pre className="spec-box" data-testid="spec-box">
              {JSON.stringify(spec, null, 2)}
            </pre>
          ) : null}
        </main>
      </div>
    </div>
  );
}
