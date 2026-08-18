/* はじめての会計フロー：基礎6レッスン ＋ 会計フローの地図 ＋ 勘定科目ガイド（全63科目）。 */
import { ACCOUNTS, DRILL_ACCOUNTS, SCN } from '../engine/engine';
import type { AccountCat, DrillAccount } from '../engine/types';
import { css, cssWith } from '../lib/css';
import { DGUIDE, FLOW_MAP, GUIDE_BASE, LESSONS } from '../state/content';
import { useApp } from '../state/store';

const CATS: AccountCat[] = ['資産', '負債', '純資産', '収益', '費用'];

export default function Learn() {
  const { S, api } = useApp();
  const cur = S.lessonId ? LESSONS.find(l => l.id === S.lessonId) || null : null;

  if (cur) {
    const idx = LESSONS.indexOf(cur);
    const st = S.lessons[cur.id] || {};
    const allAnswered = cur.quiz.every((q, qi) => S.lessonQuizPick[qi] === q.ans || !!(st.quiz && st.quiz[qi]));
    const openLesson = (id: string) => {
      const lessons = { ...S.lessons };
      lessons[id] = { ...lessons[id], seen: true };
      api.persist({ lessonId: id, lessonQuizPick: {}, lessons });
    };
    return (
      <section data-screen-label="はじめての会計フロー" style={css('display:grid;gap:var(--space-4)')}>
        <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
          <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => api.set({ lessonId: null })}>← レッスン一覧</button>
        </div>
        <h1 className="nm-page-title">レッスン{idx + 1}　{cur.title}</h1>
        <div style={css('display:grid;gap:var(--space-4);max-width:44rem')}>
          <ul style={css('margin:0;padding-left:1.3em;display:grid;gap:var(--space-1)')}>
            {cur.points.map((t, i) => <li key={i} style={css('font-size:var(--font-size-body);line-height:1.7')}>{t}</li>)}
          </ul>

          {cur.fig.kind === 'flow' && cur.fig.steps && (
            <div style={css('display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;padding:var(--space-3);border:1px solid var(--border-subtle);border-radius:var(--radius-panel)')}>
              {cur.fig.steps.map((t, i, arr) => (
                <span key={t} style={css('display:inline-flex;align-items:center;gap:var(--space-1)')}>
                  <span style={css('padding:var(--space-1) var(--space-2);border:1px solid var(--brand-300);border-radius:var(--radius-control);font-size:var(--font-size-label);background:var(--brand-50);color:var(--brand-800)')}>{t}</span>
                  <span style={css('color:var(--text-muted)')}>{i < arr.length - 1 ? '→' : ''}</span>
                </span>
              ))}
            </div>
          )}

          {cur.fig.kind === 'cols' && cur.fig.left && cur.fig.right && (
            <div style={css('display:grid;gap:var(--space-1)')}>
              <span className="nm-label">{cur.fig.title}</span>
              <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--border-strong);border-radius:var(--radius-panel);overflow:hidden')}>
                <div style={css('border-right:1px solid var(--border-strong);padding:var(--space-3);display:grid;gap:var(--space-1);align-content:start')}>
                  <span style={css('font-size:var(--font-size-supporting);font-weight:var(--font-weight-bold);color:var(--brand-800)')}>{cur.fig.left.title}</span>
                  {cur.fig.left.rows.map((r, i) => (
                    <span key={i} style={css('font-size:var(--font-size-label);border-bottom:1px dotted var(--border-subtle);padding:2px 0')}>{r}</span>
                  ))}
                </div>
                <div style={css('padding:var(--space-3);display:grid;gap:var(--space-1);align-content:start')}>
                  <span style={css('font-size:var(--font-size-supporting);font-weight:var(--font-weight-bold);color:var(--brand-800)')}>{cur.fig.right.title}</span>
                  {cur.fig.right.rows.map((r, i) => (
                    <span key={i} style={css('font-size:var(--font-size-label);border-bottom:1px dotted var(--border-subtle);padding:2px 0')}>{r}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={css('border-left:2px solid var(--brand-300);padding-left:var(--space-3)')}>
            <span className="nm-label">のりまき商事の例</span>
            <p style={css('margin:var(--space-1) 0 0;font-size:var(--font-size-label);line-height:1.7')}>{cur.example}</p>
          </div>

          <div style={css('display:grid;gap:var(--space-3)')}>
            <h2 className="nm-section-title" style={css('margin:0')}>確認問題</h2>
            {cur.quiz.map((q, qi) => {
              const pick = S.lessonQuizPick[qi];
              return (
                <div key={qi} style={css('display:grid;gap:var(--space-2)')}>
                  <span style={css('font-size:var(--font-size-body)')}>{q.q}</span>
                  <div style={css('display:grid;gap:var(--space-1);max-width:32rem')}>
                    {q.opts.map((o, oi) => (
                      <button
                        key={oi}
                        style={cssWith('text-align:left;padding:var(--space-2) var(--space-3);border-radius:var(--radius-control);cursor:pointer;font:inherit;font-size:var(--font-size-label);min-height:2.75rem', {
                          border: '1px solid ' + (pick === oi ? (oi === q.ans ? 'var(--success)' : 'var(--danger)') : 'var(--border-default)'),
                          background: pick === oi ? (oi === q.ans ? 'var(--success-surface)' : 'var(--danger-surface)') : 'var(--surface-card)'
                        })}
                        onClick={() => {
                          const lessonQuizPick = { ...S.lessonQuizPick }; lessonQuizPick[qi] = oi;
                          if (oi === q.ans) {
                            const lessons = { ...S.lessons };
                            const rec = { quiz: {}, ...lessons[cur.id] };
                            rec.quiz = { ...rec.quiz }; rec.quiz[qi] = true;
                            lessons[cur.id] = rec;
                            api.persist({ lessonQuizPick, lessons });
                          } else api.set({ lessonQuizPick });
                        }}
                      >{o}</button>
                    ))}
                  </div>
                  {pick !== undefined && (
                    <p style={{ margin: 0, fontSize: 'var(--font-size-label)', color: pick === q.ans ? 'var(--success-strong)' : 'var(--danger)' }}>
                      {pick === q.ans ? q.expl : '（もう一度）' + q.expl}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center')}>
            {!st.done && allAnswered && (
              <button
                className="nm-btn nm-btn--primary"
                onClick={() => {
                  const lessons = { ...S.lessons };
                  lessons[cur.id] = { ...lessons[cur.id], seen: true, done: true };
                  api.persist({ lessons, xp: S.xp + 20 });
                  api.showToast('レッスン完了（+20 XP）', 3000);
                }}
              >このレッスンを完了する（+20 XP）</button>
            )}
            {st.done && <span className="nm-badge nm-badge--success">完了済</span>}
            {idx < LESSONS.length - 1 && (
              <button className="nm-btn nm-btn--secondary" onClick={() => openLesson(LESSONS[idx + 1].id)}>次のレッスンへ →</button>
            )}
            {(cur.related || []).map(sid => (
              <button
                key={sid}
                className="bfl-link"
                style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-label);color:var(--brand-700)')}
                onClick={() => api.startScenario(sid, 'lesson')}
              >{SCN[sid] ? '取引で確かめる：' + SCN[sid].title : sid} →</button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ---------- レッスン一覧 ＋ 地図 ＋ 勘定科目ガイド ---------- */
  const recLesson = LESSONS.find(l => !(S.lessons[l.id] && S.lessons[l.id].done));
  const msel = S.mapSel ? FLOW_MAP.find(m => m.key === S.mapSel) || null : null;

  const guide: Record<string, [string, string, string]> = { ...GUIDE_BASE };
  const allAccs: DrillAccount[] = (ACCOUNTS as DrillAccount[])
    .concat(DRILL_ACCOUNTS.filter(a => CATS.indexOf(a.cat) >= 0).map(a => ({ ...a, drill: true })));
  allAccs.forEach(a => {
    if (!guide[a.code] && DGUIDE[a.code]) guide[a.code] = [DGUIDE[a.code][0], '—', 'ドリルの解説で確認'];
  });
  const q = (S.guideQuery || '').trim();

  return (
    <section data-screen-label="はじめての会計フロー" style={css('display:grid;gap:var(--space-4)')}>
      <h1 className="nm-page-title">はじめての会計フロー</h1>
      <p className="nm-supporting-text" style={css('margin:0;max-width:60rem')}>
        簿記がはじめての方向けの基礎レッスンです（全6回・約15分）。受講は任意で、いつでも飛ばして取引から始められます。
      </p>
      <div style={css('display:grid;max-width:44rem')}>
        {LESSONS.map((l, i) => {
          const st = S.lessons[l.id] || {};
          return (
            <button
              key={l.id}
              className="bfl-hv-bg"
              style={cssWith('display:flex;align-items:center;gap:var(--space-3);min-height:2.75rem;padding:var(--space-2) var(--space-2);border:0;border-bottom:1px solid var(--border-subtle);cursor:pointer;font:inherit;text-align:left;width:100%', {
                background: recLesson === l ? 'var(--brand-50)' : 'transparent'
              })}
              onClick={() => {
                const lessons = { ...S.lessons };
                lessons[l.id] = { ...lessons[l.id], seen: true };
                api.persist({ lessonId: l.id, lessonQuizPick: {}, lessons });
              }}
            >
              <span className="nm-number" style={css('color:var(--text-muted);width:1.5rem')}>{i + 1}</span>
              <span style={css('flex:1;font-size:var(--font-size-body)')}>{l.title}</span>
              <span style={css('font-size:var(--font-size-supporting);color:var(--text-muted)')}>約{l.min}分</span>
              <span style={{ fontSize: 'var(--font-size-supporting)', fontWeight: 'var(--font-weight-medium)', color: st.done ? 'var(--success-strong)' : st.seen ? 'var(--brand-800)' : 'var(--text-muted)' }}>
                {st.done ? '完了' : st.seen ? '途中' : '未読'}
              </span>
              <span aria-hidden="true" style={css('color:var(--brand-700)')}>→</span>
            </button>
          );
        })}
      </div>

      <div style={css('display:grid;gap:var(--space-2);max-width:60rem')}>
        <h2 className="nm-section-title" style={css('margin:var(--space-3) 0 0')}>仕訳から財務諸表までの地図</h2>
        <p className="nm-supporting-text" style={css('margin:0')}>各項目を押すと、その帳簿の役割と前後のつながりを確認できます。</p>
        <div style={css('display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap')}>
          {FLOW_MAP.map((m, i) => (
            <span key={m.key} style={css('display:inline-flex;align-items:center;gap:var(--space-1)')}>
              <button
                style={cssWith('padding:var(--space-2) var(--space-3);border-radius:var(--radius-control);cursor:pointer;font:inherit;font-size:var(--font-size-label);min-height:2.75rem', {
                  border: '1px solid ' + (S.mapSel === m.key ? 'var(--brand-500)' : 'var(--border-default)'),
                  background: S.mapSel === m.key ? 'var(--brand-50)' : 'var(--surface-card)'
                })}
                onClick={() => api.set({ mapSel: S.mapSel === m.key ? null : m.key })}
              >{m.label}</button>
              <span style={css('color:var(--text-muted)')}>{i < FLOW_MAP.length - 1 ? '→' : ''}</span>
            </span>
          ))}
        </div>
        {msel && (
          <div style={css('border:1px solid var(--brand-200);border-radius:var(--radius-panel);padding:var(--space-3);display:grid;gap:var(--space-1);max-width:44rem')}>
            <span style={css('font-weight:var(--font-weight-medium)')}>{msel.label}</span>
            <p style={css('margin:0;font-size:var(--font-size-label)')}>{msel.role}</p>
            <span className="nm-supporting-text">前の工程から：{msel.from}</span>
            <span className="nm-supporting-text">次の工程へ：{msel.to}</span>
            <div>
              <button
                className="nm-btn nm-btn--secondary nm-btn--sm"
                style={css('min-height:2.75rem')}
                onClick={() => api.set({ view: msel.view, mapSel: null })}
              >この画面を開く →</button>
            </div>
          </div>
        )}
      </div>

      <div style={css('display:grid;gap:var(--space-2);max-width:60rem')}>
        <h2 className="nm-section-title" style={css('margin:var(--space-3) 0 0')}>勘定科目ガイド</h2>
        <input
          className="nm-input" style={css('max-width:20rem')} placeholder="科目名で検索（例：売掛金）"
          value={S.guideQuery} onChange={e => api.set({ guideQuery: e.target.value })} aria-label="勘定科目を検索"
        />
        {CATS.map(cat => {
          const items = allAccs.filter(a => a.cat === cat && (!q || a.name.indexOf(q) >= 0));
          if (!items.length) return null;
          const isDr = cat === '資産' || cat === '費用';
          return (
            <div key={cat} style={css('display:grid;gap:var(--space-1)')}>
              <span className="nm-label" style={css('color:var(--brand-800)')}>{cat}</span>
              {items.map(a => {
                const g = guide[a.code] || ['', '—', '—'];
                const side = a.contra
                  ? (isDr ? '貸方で増加（控除項目）' : '借方で増加（控除項目）')
                  : isDr ? '借方で増加・貸方で減少' : '貸方で増加・借方で減少';
                return (
                  <div key={a.code} style={css('display:grid;gap:2px;padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle)')}>
                    <div style={css('display:flex;align-items:baseline;gap:var(--space-2);flex-wrap:wrap')}>
                      <span style={css('font-weight:var(--font-weight-medium)')}>{a.name}</span>
                      <span className="nm-badge">{cat === '収益' || cat === '費用' ? 'P/L' : 'B/S'}</span>
                      <span style={css('font-size:var(--font-size-supporting);color:var(--text-muted)')}>{side}</span>
                      <button
                        className="bfl-link"
                        style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--brand-700);margin-left:auto')}
                        onClick={() => a.drill
                          ? api.set({ view: 'drill', drillId: null, mock: null })
                          : api.set({ view: (cat === '収益' || cat === '費用') ? 'fs' : 'gl', glAcc: a.code })}
                      >{a.drill ? 'ドリルで見る →' : '帳簿で見る →'}</button>
                    </div>
                    <span style={css('font-size:var(--font-size-label);color:var(--text-secondary)')}>{g[0]}</span>
                    <span className="nm-supporting-text">相手科目の例：{g[1]}　／　使用例：{g[2]}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
