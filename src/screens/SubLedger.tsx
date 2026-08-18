/* 補助元帳：得意先別 / 仕入先別 / 固定資産台帳。合計は必ず総勘定元帳の残高と一致する。 */
import { CUSTOMERS, VENDORS, balance, fixedAssets, subLedger } from '../engine/engine';
import { css } from '../lib/css';
import { fmt, yen } from '../lib/format';
import { flashBg } from '../state/derive';
import { useApp } from '../state/store';
import type { SubTab } from '../state/types';

const TABS: [SubTab, string][] = [['ar', '得意先別 売掛金'], ['ap', '仕入先別 買掛金'], ['fa', '固定資産台帳']];

export default function SubLedger() {
  const { S, api } = useApp();
  const es = S.entries;
  const ar = subLedger(es, '110', CUSTOMERS);
  const ap = subLedger(es, '201', VENDORS);
  const fa = fixedAssets(es);
  const arSum = ar.reduce((t, r) => t + r.balance, 0), apSum = ap.reduce((t, r) => t + r.balance, 0);
  const arGl = balance(es, '110'), apGl = -balance(es, '201');

  return (
    <section data-screen-label="補助元帳" style={css('display:grid;gap:var(--space-4)')}>
      <h1 className="nm-page-title">補助元帳</h1>
      <p className="nm-supporting-text" style={css('margin:0')}>
        総勘定元帳の内訳を相手先・資産ごとに管理する帳簿です。補助元帳の合計は必ず元帳残高と一致します（照合）。
      </p>
      <div style={css('display:flex;gap:var(--space-1);flex-wrap:wrap')}>
        {TABS.map(([k, label]) => (
          <button
            key={k}
            className={'nm-btn nm-btn--sm ' + (S.subTab === k ? 'nm-btn--primary' : 'nm-btn--secondary')}
            style={css('min-height:2.75rem')}
            onClick={() => api.set({ subTab: k })}
          >{label}</button>
        ))}
      </div>

      {S.subTab === 'ar' && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
          <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
            <h2 className="nm-section-title" style={css('flex:1')}>得意先別 売掛金</h2>
            <span className={'nm-badge ' + (arSum === arGl ? 'nm-badge--success' : 'nm-badge--danger')}>
              {arSum === arGl ? '元帳と一致' : '不一致'}
            </span>
          </div>
          <div className="nm-table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>得意先</th><th className="nm-table__number">発生（借方）</th>
                  <th className="nm-table__number">回収（貸方）</th><th className="nm-table__number">残高</th>
                </tr>
              </thead>
              <tbody>
                {ar.map(r => (
                  <tr key={r.name} style={{ background: flashBg(S, '110') }}>
                    <td>{r.name}</td>
                    <td className="nm-table__number">{fmt(r.debit)}</td>
                    <td className="nm-table__number">{fmt(r.credit)}</td>
                    <td className="nm-table__number">{fmt(r.balance)}</td>
                  </tr>
                ))}
                {ar.length === 0 && <tr><td colSpan={4} className="nm-table__empty">まだ売掛金の取引がありません</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="nm-supporting-text" style={css('margin:0')}>元帳残高（売掛金）：{yen(arGl)}</p>
        </div>
      )}

      {S.subTab === 'ap' && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
          <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
            <h2 className="nm-section-title" style={css('flex:1')}>仕入先別 買掛金</h2>
            <span className={'nm-badge ' + (apSum === apGl ? 'nm-badge--success' : 'nm-badge--danger')}>
              {apSum === apGl ? '元帳と一致' : '不一致'}
            </span>
          </div>
          <div className="nm-table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>仕入先</th><th className="nm-table__number">支払（借方）</th>
                  <th className="nm-table__number">発生（貸方）</th><th className="nm-table__number">残高</th>
                </tr>
              </thead>
              <tbody>
                {ap.map(r => (
                  <tr key={r.name} style={{ background: flashBg(S, '201') }}>
                    <td>{r.name}</td>
                    <td className="nm-table__number">{fmt(r.debit)}</td>
                    <td className="nm-table__number">{fmt(r.credit)}</td>
                    <td className="nm-table__number">{fmt(r.balance)}</td>
                  </tr>
                ))}
                {ap.length === 0 && <tr><td colSpan={4} className="nm-table__empty">まだ買掛金の取引がありません</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="nm-supporting-text" style={css('margin:0')}>元帳残高（買掛金）：{yen(apGl)}</p>
        </div>
      )}

      {S.subTab === 'fa' && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
          <h2 className="nm-section-title">固定資産台帳</h2>
          {fa.length > 0 ? (
            <div className="nm-table-wrap">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>資産名</th><th>取得日</th><th>償却方法</th>
                    <th className="nm-table__number">取得原価</th><th className="nm-table__number">償却累計</th>
                    <th className="nm-table__number">帳簿価額</th>
                  </tr>
                </thead>
                <tbody>
                  {fa.map(r => (
                    <tr key={r.name} style={{ background: flashBg(S, '150') === 'transparent' ? flashBg(S, '159') : flashBg(S, '150') }}>
                      <td>{r.name}</td>
                      <td className="nm-number">{r.date}</td>
                      <td>{r.method}</td>
                      <td className="nm-table__number">{fmt(r.cost)}</td>
                      <td className="nm-table__number">{fmt(r.accDep)}</td>
                      <td className="nm-table__number">{fmt(r.book)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={css('display:grid;justify-items:center;gap:var(--space-2);padding:var(--space-6) var(--space-4);border:1px dashed var(--border-default);border-radius:var(--radius-panel)')}>
              <span style={css('font-weight:var(--font-weight-medium)')}>まだ固定資産がありません</span>
              <span className="nm-supporting-text" style={css('text-align:center')}>
                備品などの固定資産を取得する取引を登録すると、ここに取得原価・償却累計・帳簿価額が並びます。
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
