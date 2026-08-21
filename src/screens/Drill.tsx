/* 論点別ドリル。1問1答（帳簿には登録しない）。複合仕訳は各側最大4行。 */
import DrillLines from '../components/DrillLines';
import { DRILLS, validateDrill } from '../engine/engine';
import { DUCK_EXPLAINING, asset } from '../lib/asset';
import { css } from '../lib/css';
import { allDrillItems } from '../state/derive';
import { useApp } from '../state/store';

export default function Drill() {
  const { S, api } = useApp();
  const items = allDrillItems();
  const drItem = S.drillId ? items.find(it => it.id === S.drillId) || null : null;
  const drTopic = drItem ? DRILLS.find(t => t.items.some(it => it.id === drItem.id)) || null : null;
  const solvedCount = Object.keys(S.drillDone).length;

  const judge = () => {
    if (!drItem || !drTopic) return;
    const blank = (x: string) => !String(x || '').trim();
    const complete = (lines: { acc: string; amt: string }[]) =>
      lines.some(l => l.acc && !blank(l.amt)) && !lines.some(l => (l.acc && blank(l.amt)) || (!l.acc && !blank(l.amt)));
    if (!complete(S.drillForm.dLines) || !complete(S.drillForm.cLines)) {
      api.set({ drillJudged: { correct: false, incomplete: true } });
      return;
    }
    const r = validateDrill(drItem, S.drillForm);
    if (r.correct) {
      const already = !!S.drillDone[drItem.id];
      const firstTry = !S.attempts[drItem.id];
      const gain = already ? 0 : 30 + (firstTry ? 10 : 0);
      const drillDone = { ...S.drillDone }; drillDone[drItem.id] = true;
      api.persist({ drillDone, xp: S.xp + gain, drillJudged: { correct: true, gain } });
    } else {
      const attempts = { ...S.attempts };
      attempts[drItem.id] = (attempts[drItem.id] || 0) + 1;
      api.persist({
        attempts, drillJudged: { correct: false, diagnoses: r.diagnoses }, guide: { open: true, kind: 'wrong' },
        wrongLog: api.wrongOf(drItem.id, 'drill',
          drTopic.topic + '：' + drItem.q.slice(0, 26) + (drItem.q.length > 26 ? '…' : ''), r.diagnoses[0])
      });
    }
  };

  const nextItem = drItem && drTopic
    ? (drTopic.items.find(it => !S.drillDone[it.id] && it.id !== drItem.id)
      || items.find(it => !S.drillDone[it.id] && it.id !== drItem.id) || null)
    : null;

  return (
    <section data-screen-label="論点別ドリル" style={css('display:grid;gap:var(--space-4)')}>
      <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap')}>
        {S.guideOn && (
          <img
            src={asset(DUCK_EXPLAINING)} alt="" width={56} height={56} loading="lazy" decoding="async"
            style={css('width:3.5rem;height:3.5rem;border-radius:50%;object-fit:cover;flex:none')}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <h1 className="nm-page-title">論点別ドリル</h1>
        <span className="nm-badge nm-badge--brand">正解 {solvedCount} / {items.length}</span>
      </div>
      <p className="nm-supporting-text" style={css('margin:0')}>
        日商簿記３級の頻出論点を1問1答で練習します（出題区分表準拠のオリジナル問題）。ここでの仕訳はサンプル会社の帳簿には登録されません。1問正解 +30 XP（一発正解 +10 XP）。
      </p>

      {!drItem && (
        <>
          <div className="nm-surface" style={css('border-color:var(--brand-300);padding:var(--space-4);display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap')}>
            <div style={css('flex:1;min-width:14rem;display:grid;gap:2px')}>
              <span style={css('font-weight:var(--font-weight-medium)')}>本試験 第1問 模試（仕訳15問）</span>
              <span className="nm-supporting-text">各3点・45点満点。途中の正誤表示なし・タイマー付き。終了後にまとめて採点と解説が出ます。</span>
            </div>
            <button className="nm-btn nm-btn--primary" style={css('min-height:2.75rem')} onClick={() => api.startMock()}>模試を開始</button>
          </div>
          <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:var(--space-3)')}>
            {DRILLS.map(t => {
              const solved = t.items.filter(it => S.drillDone[it.id]).length;
              const next = t.items.find(it => !S.drillDone[it.id]);
              const full = solved === t.items.length;
              return (
                <div key={t.topic} className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2);align-content:start')}>
                  <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
                    <h2 className="nm-section-title" style={css('flex:1')}>{t.topic}</h2>
                    <span className={'nm-badge ' + (full ? 'nm-badge--success' : '')}>{solved} / {t.items.length}</span>
                  </div>
                  <p className="nm-supporting-text" style={css('margin:0')}>{t.desc}</p>
                  <div style={css('display:flex;gap:var(--space-1)')}>
                    {t.items.map(it => (
                      <span
                        key={it.id}
                        style={{
                          width: '0.625rem', height: '0.625rem', borderRadius: '50%',
                          background: S.drillDone[it.id] ? 'var(--success)' : 'var(--surface-card)',
                          border: '1px solid var(--border-strong)'
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <button
                      className={'nm-btn ' + (full ? 'nm-btn--secondary' : 'nm-btn--primary')}
                      style={css('min-height:2.75rem')}
                      onClick={() => api.openDrill((next || t.items[0]).id)}
                    >{full ? '復習する' : solved ? '続きから' : '練習する'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {drItem && drTopic && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-3);max-width:46rem')}>
          <div style={css('display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap')}>
            <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => api.set({ drillId: null, drillJudged: null })}>← ドリル一覧</button>
            <h2 className="nm-section-title" style={css('flex:1')}>
              {drTopic.topic}　問{drTopic.items.indexOf(drItem) + 1}／{drTopic.items.length}
            </h2>
            {S.drillDone[drItem.id] && <span className="nm-badge nm-badge--success">正解済</span>}
          </div>
          <div style={css('padding:var(--space-3);border:1px solid var(--border-subtle);border-radius:var(--radius-panel);background:var(--surface-muted)')}>
            {drItem.q}
          </div>
          <p className="nm-supporting-text" style={css('margin:0')}>
            複合仕訳（借方・貸方が複数行になる仕訳）の問題もあります。必要に応じて「＋行を追加」を使ってください（各側最大4行）。
          </p>
          <DrillLines form={S.drillForm} opts={drItem.opts} onChange={f => api.set({ drillForm: f })} />
          <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap')}>
            <button className="nm-btn nm-btn--primary" onClick={judge}>回答を判定する</button>
            <button
              className="nm-btn nm-btn--tertiary nm-btn--sm"
              onClick={() => api.set({ drillId: null, drillJudged: null })}
            >ここで中断してドリル一覧へ</button>
          </div>
          {S.drillJudged && S.drillJudged.incomplete && (
            <div className="nm-alert nm-alert--warning">
              <strong className="nm-alert__title">未入力の項目があります</strong>
              <p>借方・貸方それぞれ、科目と金額をセットで入力してください。未入力のままでは採点せず、誤答にもなりません。</p>
            </div>
          )}
          {S.drillJudged && !S.drillJudged.correct && !S.drillJudged.incomplete && (
            <div className="nm-alert nm-alert--danger">
              <div style={css('display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-1)')}>
                <strong className="nm-alert__title" style={css('margin:0')}>不正解 — 原因の診断</strong>
              </div>
              <ul style={css('margin:0;padding-left:1.2em;display:grid;gap:var(--space-1)')}>
                {(S.drillJudged.diagnoses || []).map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
          {S.drillJudged && S.drillJudged.correct && (
            <>
              <div className="nm-alert nm-alert--success">
                <div style={css('display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-1)')}>
                  {S.guideOn && (
                    <img
                      src={asset(DUCK_EXPLAINING)} alt="" width={32} height={32} loading="lazy" decoding="async"
                      style={css('width:2rem;height:2rem;border-radius:50%;object-fit:cover;flex:none')}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <strong className="nm-alert__title" style={css('margin:0')}>
                    正解！　{S.drillJudged.gain ? '+' + S.drillJudged.gain + ' XP' : '復習（XP加算なし）'}
                  </strong>
                </div>
                <p>{drItem.expl}</p>
              </div>
              <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap')}>
                <button
                  className="nm-btn nm-btn--primary"
                  onClick={() => { if (nextItem) api.openDrill(nextItem.id); else api.set({ drillId: null, drillJudged: null }); }}
                >{nextItem ? '次の問題へ' : 'ドリル一覧へ戻る'}</button>
                {nextItem && (
                  <button className="nm-btn nm-btn--secondary" onClick={() => api.set({ drillId: null, drillJudged: null })}>
                    今日はここまで — ドリル一覧へ
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
