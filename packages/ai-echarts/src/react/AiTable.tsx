import type { CSSProperties } from 'react';
import type { DataRow } from '../core/types';

export interface AiTableProps {
  rows: DataRow[];
  columns?: string[];
  maxRows?: number;
  style?: CSSProperties;
  className?: string;
}

export function AiTable({ rows, columns, maxRows = 50, style, className }: AiTableProps) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const visible = rows.slice(0, maxRows);

  return (
    <div className={className} style={{ overflow: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderBottom: '1px solid #d0d7de',
                  position: 'sticky',
                  top: 0,
                  background: '#f6f8fa',
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} style={{ padding: '8px 10px', borderBottom: '1px solid #eef2f6' }}>
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > maxRows ? (
        <div style={{ padding: 8, color: '#667', fontSize: 12 }}>
          Showing {maxRows} / {rows.length} rows
        </div>
      ) : null}
    </div>
  );
}
