/* 第1問模試：仕訳15問・各3点45点満点・経過タイマー・途中正誤なし → 終了後にまとめて採点。 */
import DrillLines from '../components/DrillLines';
import { css } from '../lib/css';
import { useApp } from '../state/store';

export default function Mock() {
  const { S, api } = useApp();
  const mk = S.mock;
  if (!mk) return null;
  const running = !mk.endT;
  const elapsed = Math.floor(((mk.endT || Date.now()) - mk.startT) / 1000);
  const time = Math.floor(elapsed / 60) + ':' + String(elapsed % 60).padStart(2, '0');

  if (running) {
    const item = mk.items[mk.idx];
    return (
      <section data-screen-label="第1問模試" style={css('display:grid;gap:var(--space-4)')}>
        <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap')}>
          <h1 className="nm-page-title">第1問 模試</h1>
          <span className="nm-badge nm-badge--brand nm-number">問 {mk.idx + 1} / {mk.items.length}</span>
          <span className="nm-badge nm-number">経過 {time}</span>
          <button
            className="nm-btn nm-btn--sm"
            style={css('margin-left:auto;color:var(--danger)')}
            onClick={() => { if (window.confirm('模試を中止しますか？（採点されません）')) api.set({ view: 'drill', mock: null }); }}
          >模試を中止</button>
        </div>
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-3);max-width:46rem')}>
          <div style={css('padding:var(--space-3);border:1px solid var(--border-subtle);border-radius:var(--radius-panel);background:var(--surface-muted)')}>
            {item.q}
          </div>
          <DrillLines form={S.drillForm} opts={item.opts} onChange={f => api.set({ drillForm: f })} />
          <p className="nm-supporting-text" style={css('margin:0')}>本試験と同じく、途中で正誤は表示されません。解答すると次の問題へ進みます。</p>
          <div><button className="nm-btn nm-btn--primary" onClick={() => api.mockAnswer()}>解答して次へ</button></div>
        </div>
      </section>
    );
  }

  const okN = mk.results.filter(x => x.ok).length;
  const score = okN * 3;
  const msg = score >= 36 ? '本試験第1問レベルは十分な得点力です。'
    : score >= 24 ? 'あと一歩です。間違えた論点をドリルで復習しましょう。'
      : '間違いノートから弱点論点を順に復習しましょう。';

  return (
    <section data-screen-label="第1問模試" style={css('display:grid;gap:var(--space-4)')}>
      <h1 className="nm-page-title">第1問 模試 — 採点結果</h1>
      <div className="nm-surface" style={css('border-color:var(--brand-300);padding:var(--space-4);display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap;max-width:46rem')}>
        <span className="nm-number" style={css('font-size:2.25rem;font-weight:var(--font-weight-bold)')}>
          {score} <span style={css('font-size:1rem;color:var(--text-muted)')}>/ 45点</span>
        </span>
        <div style={css('flex:1;min-width:14rem;display:grid;gap:2px')}>
          <span style={css('font-size:var(--font-size-body)')}>正解 {okN} / 15 問　所要 {time}</span>
          <span className="nm-supporting-text">{msg}</span>
        </div>
        <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap')}>
          <button className="nm-btn nm-btn--primary" style={css('min-height:2.75rem')} onClick={() => api.startMock()}>もう一度挑戦</button>
          <button className="nm-btn nm-btn--secondary" style={css('min-height:2.75rem')} onClick={() => api.set({ view: 'drill', mock: null })}>ドリルへ戻る</button>
        </div>
      </div>
      <div style={css('display:grid;gap:var(--space-2);max-width:52rem')}>
        {mk.results.map((r, i) => {
          const it = mk.items[i];
          return (
            <div key={i} className="nm-surface" style={css('padding:var(--space-3);display:grid;gap:var(--space-1)')}>
              <div style={css('display:flex;align-items:flex-start;gap:var(--space-2)')}>
                <span
                  className="nm-number"
                  style={{ fontSize: '1.125rem', fontWeight: 'var(--font-weight-bold)', width: '1.5rem', flex: 'none', color: r.ok ? 'var(--success-strong)' : 'var(--danger)' }}
                >{r.ok ? '○' : '×'}</span>
                <span style={css('flex:1;font-size:var(--font-size-label)')}>問{i + 1}　{it.q}</span>
                <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => api.openDrill(it.id, true)}>復習</button>
              </div>
              <p className="nm-supporting-text" style={css('margin:0 0 0 2rem')}>{it.expl}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
