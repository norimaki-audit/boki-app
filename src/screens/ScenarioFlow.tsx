/* 取引フロー（5ステップ）。①証憑確認 → ②取引分析 → ③仕訳入力 → ④仕訳プレビュー → ⑤登録完了。
 * 3学習モード：理解 / 書いて覚える（紙に書く→転記）/ ネット試験入力（分析スキップ・カモ非表示）。 */
import { ACC, ACCOUNTS, CUSTOMERS, SCN, VENDORS, metrics } from '../engine/engine';
import { css, cssWith } from '../lib/css';
import { fmt, fmtIn, yen } from '../lib/format';
import { printWorksheet } from '../lib/print';
import { BRIEFS } from '../state/content';
import { level, nextBadgeHint, progress, stageLabel, xpInLevel, xpPct } from '../state/derive';
import { useApp } from '../state/store';

export default function ScenarioFlow() {
  const { S, api } = useApp();
  if (!S.sid) return null;
  const scn = SCN[S.sid];
  const p = progress(S);
  const es = S.entries;
  const exam = S.mode === 'exam';
  const guideScn = S.guideOn && !exam;
  const attemptCount = S.attempts[S.sid] || 0;
  const learnPos = Math.max(1, p.seq.findIndex(x => x.id === S.sid) + 1);
  const hudMb = S.mode === 'write' ? 20 : exam ? 30 : 0;

  const stepDefs: [number, string][] = exam
    ? [[1, '証憑確認'], [3, '解答入力'], [4, '登録'], [5, '影響確認']]
    : [[1, '証憑確認'], [2, '取引分析'], [3, S.mode === 'write' ? '紙に書く・転記' : '仕訳入力'], [4, '登録'], [5, '影響確認']];

  const picked = S.anaPick >= 0 ? scn.analysis[S.anaPick] : null;
  const showGate = S.mode === 'write' && !S.wroteDone;
  const setF = (k: keyof typeof S.form) => (e: { target: { value: string } }) =>
    api.set({ form: { ...S.form, [k]: (k === 'dAmt' || k === 'cAmt') ? fmtIn(e.target.value) : e.target.value } });

  const draftEntry = es.find(e => e.id === 'e-' + S.sid);
  const subOpts = scn.subKind === 'customer' ? CUSTOMERS
    : scn.subKind === 'vendor' ? VENDORS
      : scn.subKind === 'asset' ? ['業務用ノートPC'] : [];

  const nextScn = p.remaining[0];
  const imgErr = (e: { target: EventTarget | null }) => { (e.target as HTMLImageElement).style.display = 'none'; };

  /* 取引前ブリーフィング（理解モードのみ） */
  const brief = (S.step === 1 && S.mode === 'understand' && BRIEFS[S.sid] && !S.briefOff) ? BRIEFS[S.sid] : null;

  return (
    <section data-screen-label="取引シナリオ学習" style={css('display:grid;gap:var(--space-4)')}>
      <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap')}>
        <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => api.set({ view: 'scnList' })}>← 取引一覧</button>
        <h1 className="nm-page-title">学習 {learnPos}件目／{p.total}　{scn.title}</h1>
        <span className="nm-badge">取引No.{scn.order}</span>
        <span className="nm-badge">20X6年{scn.date}</span>
        <span className="nm-badge nm-badge--brand">日商簿記{scn.level}</span>
        {attemptCount > 0 && <span className="nm-badge nm-badge--warning">誤答 {attemptCount} 回</span>}
      </div>

      <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;padding:var(--space-2) var(--space-3);border:1px solid var(--brand-200);border-radius:var(--radius-panel);background:var(--brand-50);font-size:var(--font-size-supporting)')}>
        <span className="nm-badge nm-badge--brand">{stageLabel(S)}</span>
        <span className="nm-number" style={css('font-weight:var(--font-weight-bold)')}>LV.{level(S.xp)}</span>
        <div style={css('width:5.5rem;height:0.3rem;border-radius:var(--radius-pill);background:var(--gray-200);overflow:hidden')}>
          <div style={cssWith('height:100%;background:var(--brand-500);border-radius:var(--radius-pill)', { width: xpPct(S.xp) })} />
        </div>
        <span className="nm-number" style={css('color:var(--text-secondary)')}>{xpInLevel(S.xp)} / 500 XP</span>
        <span className="nm-badge">バッジ {Object.keys(S.badges).length}/10</span>
        <span style={css('color:var(--text-secondary)')}>今回の報酬：最大 +{100 + (attemptCount ? 0 : 50) + hudMb} XP</span>
        <span style={css('margin-left:auto;color:var(--brand-800)')}>{nextBadgeHint(S)}</span>
      </div>

      <div style={css('display:flex;gap:var(--space-1);flex-wrap:wrap')} aria-label="学習ステップ">
        {stepDefs.map(([code, label], i) => {
          const cur = code === S.step, past = S.step > code;
          return (
            <div
              key={code}
              style={cssWith('display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) var(--space-3);border-radius:var(--radius-pill)', {
                border: '1px solid ' + (cur ? 'var(--brand-500)' : 'var(--border-default)'),
                background: cur ? 'var(--brand-50)' : past ? 'var(--surface-muted)' : 'var(--surface-card)'
              })}
            >
              <span className="nm-number" style={cssWith('display:inline-grid;place-items:center;width:1.25rem;height:1.25rem;border-radius:50%;font-size:0.6875rem', {
                background: cur || past ? 'var(--brand-600)' : 'var(--gray-200)',
                color: cur || past ? '#fff' : 'var(--text-secondary)'
              })}>{i + 1}</span>
              <span style={cssWith('font-size:var(--font-size-supporting)', { color: cur ? 'var(--brand-800)' : 'var(--text-secondary)' })}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* ① 証憑確認 */}
      {S.step === 1 && (
        <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:var(--space-4);align-items:start')}>
          <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
            {brief && (
              <div style={css('border:1px solid var(--brand-200);border-radius:var(--radius-panel);padding:var(--space-3);display:grid;gap:var(--space-2);margin-bottom:var(--space-2)')}>
                <span className="nm-label" style={css('color:var(--brand-800)')}>取引前ブリーフィング — {brief.title}</span>
                <ul style={css('margin:0;padding-left:1.3em;display:grid;gap:2px')}>
                  {brief.points.map((t, i) => <li key={i} style={css('font-size:var(--font-size-label);line-height:1.6')}>{t}</li>)}
                </ul>
                {S.briefMore && (
                  <p style={css('margin:0;font-size:var(--font-size-label);color:var(--text-secondary);line-height:1.7')}>{brief.more}</p>
                )}
                <div style={css('display:flex;gap:var(--space-3);align-items:center')}>
                  <button
                    className="bfl-link"
                    style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--brand-700)')}
                    onClick={() => api.set({ briefMore: !S.briefMore })}
                  >{S.briefMore ? '閉じる' : '詳しく理解する'}</button>
                  <button
                    className="bfl-link"
                    style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--text-muted)')}
                    onClick={() => api.persist({ briefOff: true })}
                  >次回から省略する</button>
                </div>
              </div>
            )}
            <h2 className="nm-section-title">取引内容</h2>
            <p style={css('margin:0')}>{scn.story}</p>
            <p className="nm-supporting-text">証憑（右）と突き合わせて、日付・相手先・金額を確認してください。実務では必ず証憑から記帳します。</p>
            <div>
              <button className="nm-btn nm-btn--primary" onClick={() => api.set({ step: exam ? 3 : 2 })}>
                {exam ? '確認した — 解答へ進む' : '確認した — 取引分析へ進む'}
              </button>
            </div>
          </div>
          <div className="nm-surface" style={css('padding:var(--space-4);background:var(--surface-muted);display:grid;gap:var(--space-2)')}>
            <div style={css('display:flex;justify-content:space-between;align-items:baseline')}>
              <span className="nm-badge nm-badge--brand">{scn.evidence.kind}</span>
            </div>
            <div style={css('border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--surface-card);padding:var(--space-4);display:grid;gap:var(--space-2)')}>
              <div style={css('text-align:center;font-weight:var(--font-weight-bold);letter-spacing:0.2em;border-bottom:1px solid var(--border-default);padding-bottom:var(--space-2)')}>
                {scn.evidence.title}
              </div>
              {scn.evidence.rows.map(([k, v], i) => (
                <div key={i} style={css('display:flex;justify-content:space-between;gap:var(--space-3);font-size:var(--font-size-label);border-bottom:1px dotted var(--border-subtle);padding-bottom:2px')}>
                  <span style={css('color:var(--text-muted)')}>{k}</span>
                  <span className="nm-number" style={css('font-weight:var(--font-weight-medium)')}>{v}</span>
                </div>
              ))}
              {scn.evidence.note && <p className="nm-supporting-text" style={css('margin:0')}>{scn.evidence.note}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ② 取引分析 */}
      {S.step === 2 && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-3);max-width:46rem')}>
          <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
            <h2 className="nm-section-title" style={css('flex:1')}>取引分析 — 何が増減し、5要素のどれに当たるか</h2>
            <button className="nm-btn nm-btn--secondary nm-btn--sm" onClick={() => api.set({ evidenceSid: S.sid })}>証憑を確認</button>
            <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => api.set({ step: 1 })}>← 証憑確認へ戻る</button>
          </div>
          <p className="nm-supporting-text" style={css('margin:0')}>簿記の5要素：資産・負債・純資産・収益・費用。この取引に当てはまる分析を選んでください。</p>
          <div style={css('display:grid;gap:var(--space-2)')}>
            {scn.analysis.map((o, i) => (
              <button
                key={i}
                className="bfl-hv-border"
                style={cssWith('text-align:left;padding:var(--space-3);border-radius:var(--radius-control);cursor:pointer;font-size:var(--font-size-body);color:var(--text-primary)', {
                  border: '1px solid ' + (S.anaPick === i ? (o.ok ? 'var(--success)' : 'var(--danger)') : 'var(--border-strong)'),
                  background: S.anaPick === i ? (o.ok ? 'var(--success-surface)' : 'var(--danger-surface)') : 'var(--surface-card)'
                })}
                onClick={() => api.set({
                  anaPick: i, anaMsg: o.ok ? null : o.diag || null,
                  guide: o.ok ? S.guide : { open: true, kind: 'wrong' }
                })}
              >{o.t}</button>
            ))}
          </div>
          {picked && !picked.ok && (
            <div className="nm-alert nm-alert--danger">
              <strong className="nm-alert__title">分析を見直しましょう</strong>
              <p>{S.anaMsg || ''}</p>
            </div>
          )}
          {picked && picked.ok && (
            <>
              <div className="nm-alert nm-alert--success">
                <strong className="nm-alert__title">正しい分析です</strong>
                <p>この分析を仕訳の形（借方／貸方）に置き換えます。資産・費用の増加は借方、負債・純資産・収益の増加は貸方です。</p>
              </div>
              <div>
                <button className="nm-btn nm-btn--primary" onClick={() => api.set({ step: 3 })}>
                  {S.mode === 'write' ? '紙に書くへ進む' : '仕訳入力へ進む'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ③ 仕訳入力（書いて覚えるモードでは先に紙へ書く） */}
      {S.step === 3 && showGate && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap;max-width:46rem')}>
          <div style={css('flex:1;min-width:16rem;display:grid;gap:var(--space-3)')}>
            <h2 className="nm-section-title">まず紙に書く</h2>
            <p style={css('margin:0')}>
              日商簿記の本番は、統一試験・ネット試験とも紙の計算用紙に仕訳や計算を書きながら解きます。お手元の紙に、この取引の
              <strong>借方・貸方の科目と金額</strong>（計算が必要な取引は途中計算も）を書いてください。
            </p>
            <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap')}>
              <button className="nm-btn nm-btn--primary" onClick={() => api.set({ wroteDone: true })}>書き終わった — PCへ転記する</button>
              <button className="nm-btn nm-btn--secondary" onClick={printWorksheet}>A4 仕訳・計算用紙を印刷する</button>
            </div>
          </div>
          {guideScn && (
            <img
              src="/assets/duck-guide-struggling.png" alt="" width={1254} height={1254} loading="lazy" decoding="async"
              style={css('width:clamp(4.5rem,9vw,7rem);height:auto;aspect-ratio:1/1;object-fit:contain;border-radius:var(--radius-lg);flex:none')}
              onError={imgErr}
            />
          )}
        </div>
      )}

      {S.step === 3 && !showGate && (
        <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-4);max-width:46rem')}>
          <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
            <h2 className="nm-section-title" style={css('flex:1')}>
              {S.mode === 'write' ? '仕訳入力（紙からの転記）' : exam ? '仕訳入力（ネット試験形式）' : '仕訳入力'}
            </h2>
            <button className="nm-btn nm-btn--secondary nm-btn--sm" onClick={() => api.set({ evidenceSid: S.sid })}>証憑を確認</button>
          </div>
          <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:var(--space-4)')}>
            <div style={css('display:grid;gap:var(--space-2);padding:var(--space-3);border:1px solid var(--border-subtle);border-radius:var(--radius-panel)')}>
              <span className="nm-label" style={css('color:var(--brand-800)')}>借方（左）</span>
              <div className="nm-field">
                <label className="nm-label" htmlFor="dacc">勘定科目</label>
                <select id="dacc" className="nm-select" value={S.form.dAcc} onChange={setF('dAcc')}>
                  <option value="">選択してください</option>
                  {ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.code} {a.name}（{a.cat}）</option>)}
                </select>
              </div>
              <div className="nm-field">
                <label className="nm-label" htmlFor="damt">金額（円）</label>
                <input id="damt" className="nm-input nm-number" inputMode="numeric" placeholder="0" value={S.form.dAmt} onChange={setF('dAmt')} />
              </div>
            </div>
            <div style={css('display:grid;gap:var(--space-2);padding:var(--space-3);border:1px solid var(--border-subtle);border-radius:var(--radius-panel)')}>
              <span className="nm-label" style={css('color:var(--brand-800)')}>貸方（右）</span>
              <div className="nm-field">
                <label className="nm-label" htmlFor="cacc">勘定科目</label>
                <select id="cacc" className="nm-select" value={S.form.cAcc} onChange={setF('cAcc')}>
                  <option value="">選択してください</option>
                  {ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.code} {a.name}（{a.cat}）</option>)}
                </select>
              </div>
              <div className="nm-field">
                <label className="nm-label" htmlFor="camt">金額（円）</label>
                <input id="camt" className="nm-input nm-number" inputMode="numeric" placeholder="0" value={S.form.cAmt} onChange={setF('cAmt')} />
              </div>
            </div>
          </div>
          {scn.subKind && (
            <div className="nm-field" style={css('max-width:20rem')}>
              <label className="nm-label" htmlFor="sub">補助科目（{scn.subLabel || ''}）<span className="nm-required">必須</span></label>
              <select id="sub" className="nm-select" value={S.form.sub} onChange={setF('sub')}>
                <option value="">選択してください</option>
                {subOpts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <p className="nm-field__support">売掛金・買掛金・固定資産は、相手先・対象ごとに補助元帳で管理します。</p>
            </div>
          )}
          {S.mode === 'understand' && picked && picked.ok && (
            <p className="nm-supporting-text" style={css('margin:0')}>
              ヒント：選んだ分析「{picked.t}」を、借方＝資産・費用の増加（または負債・純資産の減少）、貸方＝その逆、に当てはめます。
            </p>
          )}
          {scn.calc && (
            <div style={css('display:grid;gap:var(--space-2);padding:var(--space-3);border:1px dashed var(--border-strong);border-radius:var(--radius-panel)')}>
              <span className="nm-label">{scn.calc.title} — 途中計算も判定対象です</span>
              <div style={css('display:flex;gap:var(--space-3);flex-wrap:wrap')}>
                {scn.calc.parts.map(c => (
                  <div key={c.k} className="nm-field" style={css('min-width:13rem;flex:1')}>
                    <label className="nm-label">{c.label}</label>
                    <input
                      className="nm-input nm-number" inputMode="numeric" placeholder="0"
                      value={S.calcVals[c.k] || ''}
                      onChange={e => api.set({ calcVals: { ...S.calcVals, [c.k]: fmtIn(e.target.value) } })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={css('display:flex;gap:var(--space-2);align-items:center')}>
            <button className="nm-btn nm-btn--primary" onClick={() => api.judge()}>回答を判定する</button>
            <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => api.set({ step: exam ? 1 : 2 })}>← 取引分析へ戻る</button>
          </div>
          {S.judged && S.judged.incomplete && (
            <div className="nm-alert nm-alert--warning">
              <strong className="nm-alert__title">未入力の項目があります</strong>
              <p>すべての欄を入力してから「回答を判定する」を押してください。未入力のままでは採点せず、誤答にもなりません。</p>
            </div>
          )}
          {S.judged && !S.judged.correct && !S.judged.incomplete && (
            <div className="nm-alert nm-alert--danger">
              <div style={css('display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-1)')}>
                <strong className="nm-alert__title" style={css('margin:0')}>不正解 — 原因の診断</strong>
              </div>
              <ul style={css('margin:0;padding-left:1.2em;display:grid;gap:var(--space-1)')}>
                {(S.judged.diagnoses || []).map((d, i) => <li key={i}>{d}</li>)}
              </ul>
              {guideScn && (
                <p style={css('margin:var(--space-2) 0 0;font-size:var(--font-size-label)')}>
                  大丈夫。証憑に戻って、増えたものと減ったものを一つずつ確認しましょう。
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ④ 仕訳プレビュー（draft） */}
      {S.step === 4 && (
        <div style={css('display:grid;gap:var(--space-4);max-width:46rem')}>
          <div className="nm-alert nm-alert--success">
            <div style={css('display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-1)')}>
              {guideScn && (
                <img
                  src="/assets/duck-guide-explaining.png" alt="" width={32} height={32} loading="lazy" decoding="async"
                  style={css('width:2rem;height:2rem;border-radius:50%;object-fit:cover;flex:none')} onError={imgErr}
                />
              )}
              <strong className="nm-alert__title" style={css('margin:0')}>正解です</strong>
            </div>
            <p>仕訳は下書き（draft）として仕訳帳に保存されました。draft のままでは帳簿・財務諸表には反映されません。登録（posted）して初めて反映されます。</p>
          </div>

          {exam && (
            <div className="nm-surface" style={css('padding:var(--space-3);display:grid;gap:var(--space-2)')}>
              <span className="nm-label" style={css('color:var(--brand-800)')}>理解チェック — なぜこの仕訳になりますか？（任意・1回だけ）</span>
              <div style={css('display:grid;gap:var(--space-1)')}>
                {scn.analysis.map((o, i) => (
                  <button
                    key={i}
                    style={cssWith('text-align:left;padding:var(--space-2) var(--space-3);border-radius:var(--radius-panel);cursor:pointer;font-size:var(--font-size-label);color:var(--text-primary)', {
                      border: '1px solid ' + (S.whyPick === i ? (o.ok ? 'var(--success)' : 'var(--danger)') : 'var(--border-default)'),
                      background: S.whyPick === i ? (o.ok ? 'var(--success-surface)' : 'var(--danger-surface)') : 'var(--surface-card)'
                    })}
                    onClick={() => api.set({ whyPick: i })}
                  >{o.t}</button>
                ))}
              </div>
              {S.whyPick >= 0 && !scn.analysis[S.whyPick].ok && (
                <p className="nm-supporting-text" style={css('margin:0;color:var(--danger)')}>{scn.analysis[S.whyPick].diag}</p>
              )}
              {S.whyPick >= 0 && scn.analysis[S.whyPick].ok && (
                <p className="nm-supporting-text" style={css('margin:0;color:var(--success-strong)')}>その通りです。取引の性質から仕訳を導けています。</p>
              )}
            </div>
          )}

          <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-3)')}>
            <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
              <h2 className="nm-section-title" style={css('flex:1')}>仕訳プレビュー</h2>
              <span className="nm-badge nm-badge--warning">未登録（draft）</span>
            </div>
            <div className="nm-table-wrap">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>日付</th><th>借方科目</th><th className="nm-table__number">金額</th>
                    <th>貸方科目</th><th className="nm-table__number">金額</th><th>補助</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="nm-number">{draftEntry ? scn.date : ''}</td>
                    <td>{draftEntry ? ACC[draftEntry.lines[0].acc].name : ''}</td>
                    <td className="nm-table__number">{draftEntry ? fmt(draftEntry.lines[0].amount) : ''}</td>
                    <td>{draftEntry ? ACC[draftEntry.lines[1].acc].name : ''}</td>
                    <td className="nm-table__number">{draftEntry ? fmt(draftEntry.lines[1].amount) : ''}</td>
                    <td>{draftEntry ? (draftEntry.lines[0].sub || draftEntry.lines[1].sub || '—') : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 className="nm-subsection-title">登録すると何が変わるか（登録前 → 登録後）</h3>
            <div className="nm-table-wrap">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>指標</th><th className="nm-table__number">登録前</th>
                    <th className="nm-table__number">登録後</th><th className="nm-table__number">増減</th>
                  </tr>
                </thead>
                <tbody>
                  {draftEntry && (() => {
                    const before = metrics(es.filter(e => e.id !== draftEntry.id));
                    const after = metrics(es.map(e => e.id === draftEntry.id ? { ...e, status: 'posted' as const } : e));
                    const keys: [string, keyof typeof before][] = [
                      ['現金預金', 'cash'], ['売掛金', 'ar'], ['買掛金', 'ap'], ['累計利益', 'profit']
                    ];
                    return keys.map(([label, k]) => {
                      const d = after[k] - before[k];
                      return (
                        <tr key={k}>
                          <td>{label}</td>
                          <td className="nm-table__number">{yen(before[k])}</td>
                          <td className="nm-table__number">{yen(after[k])}</td>
                          <td className="nm-table__number" style={{ color: d > 0 ? 'var(--success-strong)' : d < 0 ? 'var(--danger-strong)' : 'var(--text-muted)' }}>
                            {d === 0 ? '±0' : (d > 0 ? '+' : '−') + fmt(Math.abs(d))}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <div>
              <button className="nm-btn nm-btn--primary nm-btn--lg" onClick={() => api.post()}>会計システムへ登録する（posted）</button>
            </div>
          </div>
        </div>
      )}

      {/* ⑤ 登録完了 */}
      {S.step === 5 && (
        <div style={css('display:grid;gap:var(--space-4);max-width:46rem')}>
          <div className="nm-alert nm-alert--success">
            <strong className="nm-alert__title">登録完了（posted）</strong>
            <p>この1本の仕訳が、以下の順で各帳簿と財務諸表に伝播しました。各行をクリックすると、該当箇所がハイライト表示された帳簿へ移動します。</p>
          </div>
          <div className="nm-surface" style={css('padding:var(--space-4);display:grid;gap:var(--space-2)')}>
            <h2 className="nm-section-title">影響の流れ</h2>
            <ol style={css('margin:0;padding:0;list-style:none;display:grid;gap:var(--space-2)')}>
              {scn.impacts.map((imp, i) => (
                <li key={i}>
                  <button
                    className="bfl-hv-row"
                    style={css('width:100%;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border:1px solid var(--border-default);border-radius:var(--radius-control);background:var(--surface-card);cursor:pointer;text-align:left;font-size:var(--font-size-body)')}
                    onClick={() => api.gotoImpact(imp, scn)}
                  >
                    <span className="nm-number" style={css('display:inline-grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--brand-100);color:var(--brand-800);font-size:0.75rem;flex:none')}>{i + 1}</span>
                    <span style={css('flex:1;font-weight:var(--font-weight-medium)')}>{imp.label}</span>
                    <span className="nm-number" style={css('color:var(--text-secondary);font-size:var(--font-size-label)')}>{imp.detail}</span>
                    <span style={css('color:var(--brand-700)')}>→</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="nm-alert"><p>{scn.note}</p></div>
            <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap')}>
              <button
                className="nm-btn nm-btn--primary"
                onClick={() => { if (nextScn) api.startScenario(nextScn.id); else api.set({ view: 'dash' }); }}
              >{nextScn ? '次の取引へ（' + nextScn.title + '）' : '月次決算 完了 — ダッシュボードへ'}</button>
              <button className="nm-btn nm-btn--secondary" onClick={() => api.set({ view: 'fs' })}>財務諸表を見る</button>
              <button className="nm-btn nm-btn--tertiary" onClick={() => api.set({ view: 'dash', hlEntry: null, trace: [] })}>⌂ ダッシュボードへ戻る</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
