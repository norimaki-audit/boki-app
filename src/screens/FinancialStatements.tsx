/* 財務諸表：B/S と P/L を並列表示。金額クリックで逆引きトレース（P/L → 試算表 → 元帳 → 仕訳 → 証憑）。 */
import { ACC, balanceSheet, profitLoss } from '../engine/engine';
import { css, cssWith } from '../lib/css';
import { fmt } from '../lib/format';
import { flashBg, progress } from '../state/derive';
import { useApp } from '../state/store';

export default function FinancialStatements() {
  const { S, api } = useApp();
  const es = S.entries;
  const bs = balanceSheet(es);
  const pl = profitLoss(es);
  const p = progress(S);

  const traceTo = (code: string | undefined, label: string, src: string) => () => {
    if (!code || code === 'PL') { api.set({ view: 'tb', trace: [] }); return; }
    api.set({
      view: 'tb', flash: [code],
      trace: [
        { label: src + ' ' + label, view: 'fs' },
        { label: '試算表（' + ACC[code].name + '）', view: 'tb' }
      ]
    });
  };

  const rowStyle = (bg: string) =>
    cssWith('display:flex;justify-content:space-between;gap:var(--space-2);padding:var(--space-1) var(--space-2);border:0;border-bottom:1px dotted var(--border-subtle);cursor:pointer;font-size:var(--font-size-label);border-radius:var(--radius-sm)', { background: bg });

  return (
    <section data-screen-label="財務諸表" style={css('display:grid;gap:var(--space-3)')}>
      <h1 className="nm-page-title">財務諸表</h1>
      <p className="nm-supporting-text" style={css('margin:0')}>
        金額をクリックすると 試算表 → 総勘定元帳 → 仕訳 → 証憑 と発生源まで逆にたどれます。直近の登録で動いた行はハイライト表示されます。
      </p>
      <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(22rem,1fr));gap:var(--space-4);align-items:start')}>
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
          <h2 className="nm-section-title">貸借対照表（B/S）</h2>
          <p className="nm-supporting-text" style={css('margin:0;display:flex;justify-content:space-between;gap:var(--space-2)')}>
            <span>{p.fsAsOf}現在</span><span>（単位：円）</span>
          </p>
          <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:var(--space-3);align-items:start')}>
            <div style={css('display:grid;gap:var(--space-1)')}>
              <span className="nm-label" style={css('color:var(--text-muted)')}>資産の部</span>
              {bs.assets.map(r => (
                <button key={r.code} className="bfl-hv-bg" style={rowStyle(flashBg(S, r.code))} onClick={traceTo(r.code, r.name, 'B/S')}>
                  <span>{r.name}{r.contra ? '（控除）' : ''}</span>
                  <span className="nm-number">{fmt(r.v)}</span>
                </button>
              ))}
              <div style={css('display:flex;justify-content:space-between;padding:var(--space-1) var(--space-2);font-weight:var(--font-weight-bold);border-top:1px solid var(--border-strong);font-size:var(--font-size-label)')}>
                <span>資産合計</span><span className="nm-number">{fmt(bs.totalAssets)}</span>
              </div>
            </div>
            <div style={css('display:grid;gap:var(--space-1)')}>
              <span className="nm-label" style={css('color:var(--text-muted)')}>負債・純資産の部</span>
              {bs.liab.concat(bs.equity).map(r => {
                const bg = r.code === 'PL'
                  ? (S.flash.some(c => ACC[c] && (ACC[c].cat === '収益' || ACC[c].cat === '費用')) ? 'var(--success-surface)' : 'transparent')
                  : flashBg(S, r.code);
                return (
                  <button key={r.code} className="bfl-hv-bg" style={rowStyle(bg)} onClick={traceTo(r.code, r.name, 'B/S')}>
                    <span>{r.name}</span><span className="nm-number">{fmt(r.v)}</span>
                  </button>
                );
              })}
              <div style={css('display:flex;justify-content:space-between;padding:var(--space-1) var(--space-2);font-weight:var(--font-weight-bold);border-top:1px solid var(--border-strong);font-size:var(--font-size-label)')}>
                <span>負債・純資産合計</span><span className="nm-number">{fmt(bs.totalLE)}</span>
              </div>
            </div>
          </div>
          <span
            className={'nm-badge ' + (bs.totalAssets === bs.totalLE ? 'nm-badge--success' : 'nm-badge--danger')}
            style={css('justify-self:start')}
          >{bs.totalAssets === bs.totalLE ? '貸借一致 ✓' : '貸借不一致'}</span>
        </div>

        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
          <h2 className="nm-section-title">損益計算書（P/L）</h2>
          <p className="nm-supporting-text" style={css('margin:0;display:flex;justify-content:space-between;gap:var(--space-2)')}>
            <span>{p.plPeriod}</span><span>（単位：円）</span>
          </p>
          <div style={css('display:grid;gap:var(--space-1)')}>
            {pl.rows.map((r, i) => (
              <button
                key={i}
                className="bfl-hv-bg"
                style={cssWith('display:flex;justify-content:space-between;gap:var(--space-2);padding:var(--space-1) var(--space-2);border:0;font-size:var(--font-size-label);border-radius:var(--radius-sm)', {
                  background: r.code ? flashBg(S, r.code) : 'transparent',
                  cursor: r.code ? 'pointer' : 'default',
                  fontWeight: r.total ? 'var(--font-weight-bold)' : 'var(--font-weight-regular)',
                  borderTop: r.total ? '1px solid var(--border-strong)' : '0'
                })}
                onClick={r.code ? traceTo(r.code, r.name, 'P/L') : undefined}
              >
                <span>{r.name}</span><span className="nm-number">{fmt(r.v)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
