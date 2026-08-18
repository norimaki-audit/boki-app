/* 総勘定元帳：科目別の増減と残高。行から元の仕訳へドリルダウンできる。 */
import { ACC, ACCOUNTS, ledger } from '../engine/engine';
import { css } from '../lib/css';
import { fmt, yen } from '../lib/format';
import { flashBg } from '../state/derive';
import { useApp } from '../state/store';

export default function GeneralLedger() {
  const { S, api } = useApp();
  const es = S.entries;
  const activeAccs = ACCOUNTS.filter(a => ledger(es, a.code).length || a.code === S.glAcc);
  const glA = ACC[S.glAcc];
  const rows = ledger(es, S.glAcc);

  return (
    <section data-screen-label="総勘定元帳" style={css('display:grid;gap:var(--space-3)')}>
      <h1 className="nm-page-title">総勘定元帳</h1>
      <div style={css('display:flex;gap:var(--space-1);flex-wrap:wrap')}>
        {activeAccs.map(a => (
          <button
            key={a.code}
            className={'nm-btn nm-btn--sm ' + (a.code === S.glAcc ? 'nm-btn--primary' : 'nm-btn--secondary')}
            onClick={() => api.set({ glAcc: a.code })}
          >{a.code} {a.name}</button>
        ))}
      </div>
      <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
        <div style={css('display:flex;align-items:baseline;gap:var(--space-3);flex-wrap:wrap')}>
          <h2 className="nm-section-title">{glA.code} {glA.name}</h2>
          <span className="nm-badge">{glA.cat}・{glA.normal === 'D' ? '借方' : '貸方'}残高</span>
          <span className="nm-number" style={css('margin-left:auto;font-size:var(--font-size-body)')}>
            残高 {yen(rows.length ? rows[rows.length - 1].balance : 0)}
          </span>
        </div>
        <div className="nm-table-wrap">
          <table className="nm-table">
            <thead>
              <tr>
                <th>日付</th><th>伝票No</th><th>摘要</th><th>相手科目</th>
                <th className="nm-table__number">借方</th><th className="nm-table__number">貸方</th>
                <th className="nm-table__number">残高</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: flashBg(S, S.glAcc) }}>
                  <td className="nm-number">{r.date}</td>
                  <td className="nm-number">{r.no}</td>
                  <td>{r.memo}</td>
                  <td>{r.counter}</td>
                  <td className="nm-table__number">{r.debit ? fmt(r.debit) : ''}</td>
                  <td className="nm-table__number">{r.credit ? fmt(r.credit) : ''}</td>
                  <td className="nm-table__number">{fmt(r.balance)}</td>
                  <td>
                    <button
                      className="nm-btn nm-btn--tertiary nm-btn--sm bfl-link"
                      onClick={() => {
                        const base = S.trace.length
                          ? S.trace
                          : [{ label: '総勘定元帳（' + glA.name + '）', view: 'gl' as const, glAcc: S.glAcc }];
                        api.set({
                          view: 'journal', hlEntry: r.entryId,
                          trace: base.concat([{ label: '仕訳 ' + r.no, view: 'journal' as const, hlEntry: r.entryId }])
                        });
                      }}
                    >仕訳へ →</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="nm-table__empty">この科目にはまだ記帳がありません</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="nm-supporting-text" style={css('margin:0')}>
          各行は仕訳帳の1仕訳に対応します。「仕訳へ」で元の仕訳（さらに証憑・シナリオ）までドリルダウンできます。
        </p>
      </div>
    </section>
  );
}
