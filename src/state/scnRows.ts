/* 取引一覧の行データ。ダッシュボードの「取引状況」と取引一覧画面で共有する。 */
import * as B from '../engine/engine';
import { monthOf, progress } from './derive';
import type { Api } from './store';
import type { AppState } from './types';

export interface ScnRow {
  id: string;
  order: number;
  day: string;
  title: string;
  story: string;
  level: string;
  badge: string;
  badgeCls: string;
  btnLabel: string;
  btnCls: string;
  rowBg: string;
  /** 次に取り組む1件の左線 */
  blc: string;
  open: () => void;
}

export function scnRows(S: AppState, api: Api): ScnRow[] {
  const p = progress(S);
  const rows: ScnRow[] = B.SCENARIOS.map(s => {
    const isDone = S.completed.indexOf(s.id) >= 0;
    const hasDraft = S.entries.some(e => e.id === 'e-' + s.id && e.status === 'draft');
    return {
      id: s.id, order: s.order, day: s.date, title: s.title, story: s.story, level: s.level,
      badge: isDone ? '登録済' : hasDraft ? '未登録（draft）' : '未処理',
      badgeCls: isDone ? 'nm-badge--success' : hasDraft ? 'nm-badge--warning' : '',
      btnLabel: isDone ? '復習する' : hasDraft ? '続きから' : '開始',
      btnCls: isDone ? 'nm-btn--secondary' : 'nm-btn--primary',
      rowBg: isDone ? 'var(--surface-muted)' : 'var(--surface-card)',
      blc: 'transparent',
      open: () => api.startScenario(s.id)
    };
  });
  /* 5月は4月の月次決算を完走するまでロック */
  rows.forEach(r => {
    if (monthOf(B.SCN[r.id]) === '5' && !p.aprilDone) {
      r.badge = 'ロック中'; r.badgeCls = ''; r.btnLabel = 'ロック中'; r.btnCls = 'nm-btn--secondary';
      r.open = () => api.showToast('5月の取引は、4月の月次決算を完走すると解放されます。', 3500);
    }
  });
  if (p.remaining.length) {
    const next = rows.find(r => r.id === p.remaining[0].id);
    if (next) { next.rowBg = 'var(--brand-50)'; next.blc = 'var(--brand-500)'; }
  }
  return rows;
}
