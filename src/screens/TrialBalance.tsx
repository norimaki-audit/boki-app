/* 合計残高試算表：本試験と同じ様式（外側=残高／内側=合計）。登録済み（posted）の仕訳のみ集計。 */
import { trialBalance } from '../engine/engine';
import { css } from '../lib/css';
import { fmt } from '../lib/format';
import { flashBg, progress } from '../state/derive';
import { useApp } from '../state/store';

export default function TrialBalance() {
  const { S, api } = useApp();
  const tb = trialBalance(S.entries);
  const p = progress(S);

  return (
    <section data-screen-label="試算表" style={css('display:grid;gap:var(--space-3)')}>
      <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap')}>
        <h1 className="nm-page-title">合計残高試算表</h1>
        <span className={'nm-badge ' + (tb.balanced ? 'nm-badge--success' : 'nm-badge--danger')}>
          {tb.balanced ? '貸借一致 ✓' : '貸借不一致'}
        </span>
      </div>
      <p className="nm-supporting-text" style={css('margin:0')}>
        {p.fsAsOf}現在　—　日商簿記の本試験と同じ様式です。登録済み（posted）の仕訳のみ集計。科目名をクリックすると総勘定元帳へ移動します。
      </p>
      <div className="nm-table-wrap">
        <table className="nm-table nm-table--sticky">
          <thead>
            <tr>
              <th colSpan={2} style={css('text-align:center;border-right:1px solid var(--border-default)')}>借　方</th>
              <th rowSpan={2} style={css('text-align:center;vertical-align:middle')}>勘定科目</th>
              <th colSpan={2} style={css('text-align:center;border-left:1px solid var(--border-default)')}>貸　方</th>
            </tr>
            <tr>
              <th className="nm-table__number">残高</th>
              <th className="nm-table__number" style={css('border-left:1px dashed var(--border-default);border-right:1px solid var(--border-default);background:var(--surface-muted)')}>合計</th>
              <th className="nm-table__number" style={css('border-left:1px solid var(--border-default);border-right:1px dashed var(--border-default);background:var(--surface-muted)')}>合計</th>
              <th className="nm-table__number">残高</th>
            </tr>
          </thead>
          <tbody>
            {tb.rows.map(r => {
              const dSum = (r.oD || 0) + (r.pD || 0);
              const cSum = (r.oC || 0) + (r.pC || 0);
              return (
                <tr key={r.code} style={{ background: flashBg(S, r.code) }}>
                  <td className="nm-table__number">{r.cD ? fmt(r.cD) : ''}</td>
                  <td className="nm-table__number" style={css('border-left:1px dashed var(--border-subtle);border-right:1px solid var(--border-subtle);background:var(--surface-muted);color:var(--text-secondary)')}>
                    {dSum ? fmt(dSum) : ''}
                  </td>
                  <td style={css('text-align:center')}>
                    <button
                      className="nm-btn nm-btn--tertiary nm-btn--sm bfl-link"
                      style={css('padding:var(--space-1) var(--space-2);min-height:var(--control-height-sm)')}
                      onClick={() => {
                        const base = S.trace.length ? S.trace : [{ label: '試算表', view: 'tb' as const }];
                        api.set({
                          view: 'gl', glAcc: r.code,
                          trace: base.concat([{ label: '総勘定元帳（' + r.name + '）', view: 'gl' as const, glAcc: r.code }])
                        });
                      }}
                    >{r.name}</button>
                  </td>
                  <td className="nm-table__number" style={css('border-left:1px solid var(--border-subtle);border-right:1px dashed var(--border-subtle);background:var(--surface-muted);color:var(--text-secondary)')}>
                    {cSum ? fmt(cSum) : ''}
                  </td>
                  <td className="nm-table__number">{r.cC ? fmt(r.cC) : ''}</td>
                </tr>
              );
            })}
            <tr style={css('background:var(--surface-muted);font-weight:var(--font-weight-bold)')}>
              <td className="nm-table__number">{fmt(tb.tot.cD)}</td>
              <td className="nm-table__number" style={css('border-left:1px dashed var(--border-subtle);border-right:1px solid var(--border-subtle);color:var(--text-secondary)')}>
                {fmt(tb.tot.oD + tb.tot.pD)}
              </td>
              <td style={css('text-align:center')}>合計</td>
              <td className="nm-table__number" style={css('border-left:1px solid var(--border-subtle);border-right:1px dashed var(--border-subtle);color:var(--text-secondary)')}>
                {fmt(tb.tot.oC + tb.tot.pC)}
              </td>
              <td className="nm-table__number">{fmt(tb.tot.cC)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="nm-supporting-text" style={css('margin:0')}>
        「合計」は期首残高を含む借方・貸方の総額、「残高」は差し引き後の期末残高です。
      </p>
    </section>
  );
}
