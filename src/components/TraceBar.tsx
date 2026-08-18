import { css } from '../lib/css';
import { useApp } from '../state/store';

/** 逆引きトレースのパンくず（P/L → 試算表 → 元帳 → 仕訳 → 証憑） */
export default function TraceBar() {
  const { S, api } = useApp();
  if (S.trace.length === 0) return null;
  return (
    <div style={css('display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;padding:var(--space-2) var(--space-4);background:var(--brand-50);border-bottom:1px solid var(--brand-200)')}>
      <span className="nm-badge nm-badge--brand">逆引きトレース</span>
      {S.trace.map((c, i) => (
        <span key={i} style={css('display:inline-flex;align-items:center;gap:var(--space-2)')}>
          <button
            className="nm-btn nm-btn--tertiary nm-btn--sm"
            onClick={() => api.set({
              view: c.view, glAcc: c.glAcc || S.glAcc, hlEntry: c.hlEntry || null, trace: S.trace.slice(0, i + 1)
            })}
          >{c.label}</button>
          <span style={css('color:var(--brand-700)')}>{i < S.trace.length - 1 ? '→' : ''}</span>
        </span>
      ))}
      <button className="nm-btn nm-btn--sm" style={css('margin-left:auto')} onClick={() => api.set({ trace: [] })}>
        トレースを終了
      </button>
    </div>
  );
}
