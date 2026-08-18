import { COMPANY } from '../engine/engine';
import { css, cssWith } from '../lib/css';
import { scnRows } from '../state/scnRows';
import { useApp } from '../state/store';

/** 取引一覧。次に取り組む1件を薄緑背景＋左線で強調し、5月は4月完走までロック。 */
export default function ScenarioList() {
  const { S, api } = useApp();
  const rows = scnRows(S, api);
  return (
    <section data-screen-label="取引シナリオ一覧" style={css('display:grid;gap:var(--space-4)')}>
      <h1 className="nm-page-title">取引シナリオ</h1>
      <p className="nm-supporting-text" style={css('margin:0')}>
        {S.companyName || COMPANY.name}の20X6年4月〜5月・2か月分の取引です。1件ずつ仕訳して会計システムへ登録します（5月は4月の月次決算完走で解放）。
      </p>
      <div style={css('display:grid;gap:var(--space-2)')}>
        {rows.map(s => (
          <div
            key={s.id}
            style={cssWith('display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--border-default);border-radius:var(--radius-panel)', {
              borderLeft: '3px solid ' + s.blc, background: s.rowBg
            })}
          >
            <span className="nm-number" style={css('color:var(--text-muted);width:3rem')}>{s.day}</span>
            <div style={css('flex:1;display:grid;gap:2px')}>
              <span style={css('font-weight:var(--font-weight-medium)')}>
                {s.order}. {s.title}　<span className="nm-badge">{s.level}</span>
              </span>
              <span className="nm-supporting-text">{s.story}</span>
            </div>
            <span className={'nm-badge ' + s.badgeCls}>{s.badge}</span>
            <button className={'nm-btn ' + s.btnCls} style={css('min-height:2.75rem')} onClick={s.open}>{s.btnLabel}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
