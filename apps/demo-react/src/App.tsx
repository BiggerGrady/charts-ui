import { useMemo, useState } from 'react';
import {
  generateChartSpec,
  recommendByRules,
  type ChartSpec,
  type DataRow,
} from 'ai-echarts';
import { AiChart } from 'ai-echarts/react';
import { salesRows } from './fixtures/sales';

const KEY_STORAGE = 'ai-echarts.demo.deepseekKey';

function loadKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function App() {
  const [dataText, setDataText] = useState(() => JSON.stringify(salesRows, null, 2));
  const [nl, setNl] = useState('按地区对比销售额，用柱状图');
  const [apiKey, setApiKey] = useState(loadKey);
  const [model, setModel] = useState<'deepseek-v4-flash' | 'deepseek-v4-pro'>('deepseek-v4-flash');
  const [spec, setSpec] = useState<ChartSpec | null>(null);
  const [source, setSource] = useState<'llm' | 'rules' | null>(null);
  const [status, setStatus] = useState('上传/使用合成数据，输入一句话后生成图表。');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'brand'>('brand');

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

    setLoading(true);
    try {
      const result = await generateChartSpec({
        nl,
        data,
        fallbackToRules,
        llm: {
          apiKey: apiKey || undefined,
          model,
        },
      });
      setSpec(result.spec);
      setSource(result.source);
      setStatus(
        result.source === 'llm'
          ? `DeepSeek (${model}) 已生成 ChartSpec`
          : '已使用规则推荐（未配置 Key 或模型调用失败时的回退）',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const onRulesOnly = () => {
    setError('');
    if (!data) {
      setError('JSON 数据解析失败，请提供对象数组。');
      return;
    }
    const next = recommendByRules(data, 1)[0];
    setSpec(next);
    setSource('rules');
    setStatus('已使用本地规则推荐（不调用大模型）');
  };

  return (
    <div className="app">
      <h1 className="brand">ai-echarts</h1>
      <p className="lead">
        一套 ChartSpec，React / Vue 都能引入。下方 Demo 支持合成数据 + 自然语言出图（DeepSeek）。
      </p>

      <div className="layout">
        <aside className="panel">
          <h2>Controls</h2>

          <label>DeepSeek API Key（仅存 sessionStorage，不入库）</label>
          <input
            type="password"
            placeholder="sk-... 稍后可自行补充"
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
          <textarea value={dataText} onChange={(e) => setDataText(e.target.value)} />

          <div className="actions">
            <button disabled={loading} onClick={() => onGenerate(false)}>
              {loading ? 'Generating…' : 'AI 生成图表'}
            </button>
            <button className="secondary" disabled={loading} onClick={() => onGenerate(true)}>
              AI（失败则规则回退）
            </button>
            <button className="secondary" disabled={loading} onClick={onRulesOnly}>
              仅规则推荐
            </button>
          </div>

          <p className={`status${error ? ' error' : ''}`}>{error || status}</p>
          <p className="hint">
            也可在项目根目录配置 <code>.env</code>：
            <code>AI_ECHARTS_LLM_API_KEY</code>（Demo 内仍以输入框优先）。
          </p>
        </aside>

        <main className="panel chart-shell">
          <h2>Preview {source ? `· ${source}` : ''}</h2>
          {spec && data ? (
            <AiChart spec={spec} data={data} theme={theme} height={420} />
          ) : (
            <p className="status">生成后将在此渲染图表。</p>
          )}
          {spec ? <pre className="spec-box">{JSON.stringify(spec, null, 2)}</pre> : null}
        </main>
      </div>
    </div>
  );
}
