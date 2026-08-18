/* 仕訳帳：全仕訳の時系列記録。未登録（draft）は帳簿・財務諸表に未反映。 */
import { ACC, SCN, sorted } from '../engine/engine';
import { css } from '../lib/css';
import { fmt } from '../lib/format';
import { useApp } from '../state/store';

export default function Journal() {
  const { S, api } = useApp();
  const rows = sorted(S.entries);

  return (
    <section data-screen-label="仕訳帳" style={css('display:grid;gap:var(--space-3)')}>
      <h1 className="nm-page-title">仕訳帳</h1>
      <p className="nm-supporting-text" style={css('margin:0')}>
        全仕訳の時系列記録です。未登録（draft）の仕訳は帳簿・財務諸表に未反映です。「証憑」から元の取引へ戻れます。
      </p>
      <div className="nm-table-wrap">
        <table className="nm-table nm-table--sticky">
          <thead>
            <tr>
              <th>日付</th><th>伝票No</th><th>摘要</th>
              <th>借方科目</th><th className="nm-table__number">借方金額</th>
              <th>貸方科目</th><th className="nm-table__number">貸方金額</th>
              <th>状態</th><th>リンク</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(e => {
              const dL = e.lines.find(l => l.side === 'D')!;
              const cL = e.lines.find(l => l.side === 'C')!;
              const isDraft = e.status === 'draft';
              return (
                <tr
                  key={e.id}
                  style={{ background: S.hlEntry === e.id ? 'var(--success-surface)' : isDraft ? 'var(--warning-surface)' : 'transparent' }}
                >
                  <td className="nm-number">{e.date}</td>
                  <td className="nm-number">{e.no || '—'}</td>
                  <td>{e.memo}</td>
                  <td>{ACC[dL.acc].name}</td>
                  <td className="nm-table__number">{fmt(dL.amount)}</td>
                  <td>{ACC[cL.acc].name}</td>
                  <td className="nm-table__number">{fmt(cL.amount)}</td>
                  <td>
                    <span className={'nm-badge ' + (isDraft ? 'nm-badge--warning' : 'nm-badge--success')}>
                      {isDraft ? '未登録（draft）' : '登録済（posted）'}
                    </span>
                  </td>
                  <td>
                    {e.scenarioId && (
                      <span style={css('display:inline-flex;gap:var(--space-1)')}>
                        <button
                          className="nm-btn nm-btn--tertiary nm-btn--sm bfl-link"
                          onClick={() => {
                            const scnE = SCN[e.scenarioId!];
                            const extra = S.trace.length
                              ? { trace: S.trace.concat([{ label: '証憑（' + scnE.evidence.kind + '）', view: 'journal' as const, hlEntry: e.id }]) }
                              : {};
                            api.set({ evidenceSid: e.scenarioId, ...extra });
                            if (S.trace.length >= 4) api.award('trace');
                          }}
                        >証憑</button>
                        <button
                          className="nm-btn nm-btn--tertiary nm-btn--sm bfl-link"
                          onClick={() => api.startScenario(e.scenarioId!)}
                        >シナリオ</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
