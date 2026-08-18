/* 間違いノート：誤答した取引・ドリル・模試を診断文つきで自動記録する弱点帳。 */
import { css } from '../lib/css';
import { useApp } from '../state/store';

export default function Notes() {
  const { S, api } = useApp();
  const rows = Object.keys(S.wrongLog)
    .map(k => ({ id: k, ...S.wrongLog[k] }))
    .sort((a, b) => b.t - a.t);

  return (
    <section data-screen-label="間違いノート" style={css('display:grid;gap:var(--space-4)')}>
      <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap')}>
        <h1 className="nm-page-title">間違いノート</h1>
        <span className="nm-badge nm-badge--brand">{rows.length} 件</span>
      </div>
      <p className="nm-supporting-text" style={css('margin:0;max-width:60rem')}>
        間違えた問題と診断が自動で貯まる、あなた専用の弱点帳です。試験直前はここから順に復習するのが最短です。
      </p>
      {rows.length === 0 && (
        <div style={css('display:grid;justify-items:center;gap:var(--space-2);padding:var(--space-6) var(--space-4);border:1px dashed var(--border-default);border-radius:var(--radius-panel)')}>
          <span style={css('font-weight:var(--font-weight-medium)')}>まだ間違いの記録がありません</span>
          <span className="nm-supporting-text" style={css('text-align:center')}>
            取引やドリルで誤答すると、問題と診断がここに自動で記録されます。間違いは弱点発見のチャンスです。
          </span>
        </div>
      )}
      <div style={css('display:grid;gap:var(--space-2);max-width:52rem')}>
        {rows.map(n => (
          <div key={n.id} className="nm-surface" style={css('padding:var(--space-3);display:grid;gap:var(--space-1)')}>
            <div style={css('display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap')}>
              <span className="nm-badge">{n.kind === 'drill' ? 'ドリル' : '取引'}</span>
              <span style={css('flex:1;font-weight:var(--font-weight-medium);font-size:var(--font-size-body)')}>{n.title}</span>
              <span className="nm-badge nm-badge--warning">誤答 {n.n} 回</span>
              <span className="nm-supporting-text nm-number">{new Date(n.t).toLocaleDateString('ja-JP')}</span>
            </div>
            <p className="nm-supporting-text" style={css('margin:0')}>{n.diag || '（診断の記録なし）'}</p>
            <div>
              <button
                className="nm-btn nm-btn--secondary nm-btn--sm"
                style={css('min-height:2.75rem')}
                onClick={() => { if (n.kind === 'drill') api.openDrill(n.id, true); else api.startScenario(n.id, 'review'); }}
              >もう一度解く</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
