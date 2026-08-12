import type { DataRow } from 'ai-echarts';

/** Synthetic fixture — not a business schema contract */
export const salesRows: DataRow[] = [
  { region: '华东', date: '2026-01-01', sales: 1200, qty: 40, channel: '线上' },
  { region: '华北', date: '2026-01-01', sales: 980, qty: 32, channel: '线下' },
  { region: '华南', date: '2026-01-01', sales: 1100, qty: 36, channel: '线上' },
  { region: '西南', date: '2026-01-01', sales: 760, qty: 22, channel: '线下' },
  { region: '华东', date: '2026-01-02', sales: 1320, qty: 44, channel: '线上' },
  { region: '华北', date: '2026-01-02', sales: 1010, qty: 33, channel: '线下' },
  { region: '华南', date: '2026-01-02', sales: 1180, qty: 38, channel: '线上' },
  { region: '西南', date: '2026-01-02', sales: 810, qty: 24, channel: '线下' },
  { region: '华东', date: '2026-01-03', sales: 1410, qty: 47, channel: '线上' },
  { region: '华北', date: '2026-01-03', sales: 1090, qty: 35, channel: '线下' },
  { region: '华南', date: '2026-01-03', sales: 1250, qty: 41, channel: '线上' },
  { region: '西南', date: '2026-01-03', sales: 860, qty: 26, channel: '线下' },
];

/** Epoch ms series — for local timezone axis demos */
export const tsMsRows: DataRow[] = [
  { ts_ms: 1786092034385, v: 0.0 },
  { ts_ms: 1786092036408, v: 0.0 },
  { ts_ms: 1786092038432, v: 0.0 },
  { ts_ms: 1786092040448, v: 0.0 },
  { ts_ms: 1786092042469, v: 0.0 },
  { ts_ms: 1786092044489, v: 0.0 },
  { ts_ms: 1786092046505, v: 0.0 },
  { ts_ms: 1786092048523, v: 0.0 },
  { ts_ms: 1786092050538, v: 0.0 },
  { ts_ms: 1786092052555, v: 0.0 },
  { ts_ms: 1786092054572, v: 0.0 },
  { ts_ms: 1786092056587, v: 0.0 },
  { ts_ms: 1786092058604, v: 0.0 },
  { ts_ms: 1786092060628, v: 0.0 },
  { ts_ms: 1786092062646, v: 0.0 },
  { ts_ms: 1786092064665, v: 0.0 },
  { ts_ms: 1786092066680, v: 0.0 },
  { ts_ms: 1786092068705, v: 0.0 },
  { ts_ms: 1786092070722, v: 0.0 },
  { ts_ms: 1786092072744, v: 0.0 },
];
