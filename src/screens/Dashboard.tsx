/* ダッシュボード（学習の拠点）。「今日の学習」→「仕訳の結果」→「学習プロフィール」の3本立て。 */
import { ACC, COMPANY, DRILLS, balance, openingEntries } from '../engine/engine';
import type { Entry } from '../engine/types';
import { css, cssWith } from '../lib/css';
import { fmt, todayStr } from '../lib/format';
import { printWorksheet } from '../lib/print';
import { BADGES, LESSONS, MODES } from '../state/content';
import type { Lesson } from '../state/content';
import {
  allDrillItems, badgeRows, lessonsDone, level, progress, xpPct, xpToNext
} from '../state/derive';
import { scnRows } from '../state/scnRows';
import { useApp } from '../state/store';

export default function Dashboard() {
  const { S, api } = useApp();
  const p = progress(S);
  const es = S.entries;
  const companyName = S.companyName || COMPANY.name;
  const rows = scnRows(S, api);
  const lsDone = lessonsDone(S);
  const lsNext = LESSONS.find(l => !(S.lessons[l.id] && S.lessons[l.id].done));
  const drillDoneN = Object.keys(S.drillDone).length;
  const drillTotalN = allDrillItems().length;
  const drUnlearned = DRILLS.reduce((t, tp) => t + tp.items.filter(it => !S.drillDone[it.id]).length, 0);
  const badges = badgeRows(S);
  const sortedBadges = badges.slice().sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0));
  const wrongList = Object.keys(S.wrongLog).map(k => ({ id: k, ...S.wrongLog[k] })).sort((a, b) => b.t - a.t);
  const wrongTotal = wrongList.reduce((t, x) => t + x.n, 0);

  const openLesson = (l: Lesson) => {
    const lessons = { ...S.lessons };
    lessons[l.id] = { ...lessons[l.id], seen: true };
    api.persist({ view: 'learn', lessonId: l.id, lessonQuizPick: {}, lessons });
  };

  /* ---------- 今日の学習：進捗に応じて主要CTAを1つに絞る ---------- */
  let todayMsg: string, nextTitle: string, nextReward = '', ctaLabel: string, goNext: () => void;
  if (lsNext) {
    const li = LESSONS.indexOf(lsNext) + 1;
    const brandNew = lsDone === 0 && S.completed.length === 0 && Object.keys(S.drillDone).length === 0;
    todayMsg = brandNew ? 'はじめまして。まずは会計の全体像から始めましょう。'
      : lsDone === 0 ? '基礎レッスンが追加されました。実務で触れた流れを、ここで整理しましょう。'
        : '基礎レッスンの途中です。続きから再開しましょう。';
    nextTitle = 'はじめての会計フロー　レッスン' + li + '「' + lsNext.title + '」';
    nextReward = '完了で +20 XP（約' + lsNext.min + '分）';
    ctaLabel = lsDone === 0 ? 'まずは基礎レッスン1を始める →' : '基礎レッスンの続きから →';
    goNext = () => openLesson(lsNext);
  } else if (p.remaining.length) {
    todayMsg = '次の取引が待っています。証憑の確認から始めましょう。';
    nextTitle = p.remaining[0].title + '（取引No.' + p.remaining[0].order + '）';
    ctaLabel = '次の取引を開始する →';
    goNext = () => api.startScenario(p.remaining[0].id);
    /* 次の取引で得られる最大XPと解除見込みのバッジ */
    const mb = S.mode === 'write' ? 20 : S.mode === 'exam' ? 30 : 0;
    let reward = 100 + 50 + mb;
    const prospect: string[] = [];
    const nx = p.remaining[0];
    const willGet = (id: string, cond: boolean) => {
      if (cond && !S.badges[id]) {
        const meta = BADGES.find(b => b[0] === id);
        if (meta) prospect.push(meta[1]);
        reward += id === 'close' ? 500 : 50;
      }
    };
    willGet('first', p.done + 1 >= 1);
    willGet('evidence', p.done + 1 >= 3);
    willGet('closing', nx.date === '4/30');
    willGet('hand10', S.mode === 'write' && S.writePosts + 1 >= 10);
    willGet('close', !p.aprilDone && p.aprAll.filter(s => S.completed.indexOf(s.id) < 0).length === 1
      && p.aprAll.some(s => s.id === nx.id));
    nextReward = '完了で最大 +' + reward + ' XP' + (prospect.length ? '・「' + prospect[0] + '」バッジ' : '');
  } else if (drUnlearned > 0) {
    todayMsg = '取引は完走済みです。未学習の論点を固めましょう。';
    nextTitle = '論点別ドリル（未学習 ' + drUnlearned + ' 問）';
    nextReward = '1問 +30〜40 XP';
    ctaLabel = '未学習の論点を練習する →';
    goNext = () => {
      let target: string | null = null;
      DRILLS.some(tp => {
        const it = tp.items.find(x => !S.drillDone[x.id]);
        if (it) { target = it.id; return true; }
        return false;
      });
      if (target) api.openDrill(target, true);
    };
  } else if (Object.keys(S.wrongLog).length > 0) {
    todayMsg = '全学習が完了しています。仕上げは弱点の復習からです。';
    nextTitle = '間違いノート（' + Object.keys(S.wrongLog).length + ' 論点）';
    ctaLabel = '弱点を復習する →';
    goNext = () => api.set({ view: 'notes' });
  } else {
    todayMsg = '全学習が完了しています。模試で実力を確かめましょう。';
    nextTitle = '本試験 第1問 模試（仕訳15問・45点満点）';
    ctaLabel = '模試に挑戦する →';
    goNext = () => api.startMock();
  }

  /* ---------- 仕訳の結果：直近の登録で動いた科目の before → after ---------- */
  const postedScn = es.filter(e => e.status === 'posted' && e.scenarioId);
  const lastE: Entry | null = postedScn.length ? postedScn[postedScn.length - 1] : null;
  const dispBal = (list: Entry[], code: string) => {
    const b = balance(list, code);
    return ACC[code].normal === 'C' ? -b : b;
  };
  const lastMoveRows = lastE
    ? lastE.lines.reduce<string[]>((accs, l) => (accs.indexOf(l.acc) < 0 ? accs.concat([l.acc]) : accs), [])
      .map(code => {
        const prev = dispBal(es.filter(e => e !== lastE), code), cur = dispBal(es, code), delta = cur - prev;
        return {
          code, label: ACC[code].name, prev: fmt(prev), cur: fmt(cur),
          delta: (delta >= 0 ? '+' : '−') + fmt(Math.abs(delta)),
          deltaColor: delta >= 0 ? 'var(--brand-800)' : 'var(--danger)'
        };
      })
    : [];

  /* ---------- 今日の復習（2日以上前の誤答を1日1問） ---------- */
  const noteList = Object.keys(S.wrongLog).map(k => ({ id: k, ...S.wrongLog[k] }));
  const dueList = noteList.filter(nw => Date.now() - nw.t >= 2 * 864e5).sort((a, b) => a.t - b.t);
  const today = todayStr();
  const reviewOn = S.reviewDone !== today && dueList.length > 0;

  const openWrong = (kind: 'scn' | 'drill', id: string) => {
    if (kind === 'drill') api.openDrill(id, true);
    else api.startScenario(id);
  };

  const taskSummary = p.remaining.length === 0
    ? '残タスクはありません。2か月分の月次決算が完了しています。'
    : !p.aprilDone
      ? '4月：残り ' + p.remaining.length + ' 件（うち決算整理 ' + p.remaining.filter(s => s.date === '4/30').length + ' 件）。'
      : '5月（2か月目）：残り ' + p.remaining.length + ' 件（うち決算整理 ' + p.remaining.filter(s => s.date === '5/31').length + ' 件）。';

  const dashScnList = p.remaining.slice(0, 3)
    .map(s => rows.find(r => r.id === s.id))
    .filter((r): r is NonNullable<typeof r> => !!r);
  const scnAllDone = p.remainingAll.length === 0;
  const mode = MODES.find(m => m[0] === S.mode) || MODES[1];

  const onResetBooks = () => {
    if (window.confirm('サンプル会社を初期状態（設立直後）へ戻します。登録した仕訳と学習進捗が消えます。よろしいですか？')) {
      api.persist({ entries: openingEntries(), completed: [], flash: [], view: 'dash', sid: null, judged: null });
    }
  };
  const onResetAll = () => {
    if (window.confirm('学習データ（仕訳・進捗・誤答履歴）をすべてリセットします。よろしいですか？')) {
      api.persist({
        entries: openingEntries(), completed: [], attempts: {}, flash: [], view: 'dash', sid: null,
        judged: null, xp: 0, badges: {}, combo: 0, comboExam: 0, writePosts: 0
      });
    }
  };
  const onRenameCompany = () => {
    const input = window.prompt('会社名（学習用の表示名）を入力してください。空欄でデフォルトに戻します。', companyName);
    if (input === null) return;
    const name = input.trim().slice(0, 24);
    api.persist({ companyName: name || null });
  };

  const badgeLine = (b: (typeof badges)[number]) => (
    <button key={b.id} className="nm-badge-line" title={b.desc} onClick={() => api.set({ badgeInfo: b.id })}>
      <span className="nm-badge-line__mark" style={{ border: '1.5px solid ' + b.bd, color: b.fg, background: b.bg }}>{b.short}</span>
      <span className="nm-badge-line__name">{b.name}</span>
      <span className="nm-badge-line__state">{b.state}</span>
    </button>
  );

  return (
    <section data-screen-label="ダッシュボード" style={css('display:grid;gap:var(--space-5)')}>
      <div className="nm-page-header">
        <div style={css('display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--space-3)')}>
          <h1 className="nm-page-title" style={css('margin:0')}>{companyName}</h1>
          <button
            className="bfl-link"
            style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--text-secondary)')}
            onClick={onRenameCompany}
          >社名を変更</button>
        </div>
        <div className="nm-page-header__meta"><span>{COMPANY.period}</span></div>
      </div>

      <div style={css('display:grid;gap:var(--space-2)')}>
        <div style={css('display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap')}>
          <span className="nm-label">学習モード</span>
          <div style={css('display:inline-flex;gap:var(--space-1)')}>
            {MODES.map(([k, label]) => (
              <button
                key={k}
                className={'nm-btn nm-btn--sm ' + (S.mode === k ? 'nm-btn--primary' : 'nm-btn--secondary')}
                style={css('min-height:2.75rem')}
                onClick={() => api.persist({ mode: k })}
              >{label}</button>
            ))}
          </div>
        </div>
        <div style={css('display:flex;align-items:baseline;gap:var(--space-3);flex-wrap:wrap')}>
          <span className="nm-supporting-text">{mode[2]}</span>
          <button
            className="bfl-link"
            style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--text-secondary)')}
            onClick={printWorksheet}
          >A4 仕訳・計算用紙を印刷する</button>
        </div>
      </div>

      <div className="nm-next-action" style={css('background:var(--brand-50);border-color:var(--brand-200)')}>
        <div style={css('display:flex;align-items:baseline;gap:var(--space-3);flex-wrap:wrap')}>
          <h2 className="nm-section-title" style={css('margin:0')}>今日の学習</h2>
          <span className="nm-number" style={css('margin-left:auto;color:var(--text-secondary);font-size:var(--font-size-label)')}>
            基礎 {lsDone}/{LESSONS.length}　・　取引 {p.done}/{p.total}　・　ドリル {drillDoneN}/{drillTotalN}
          </span>
        </div>
        <div style={css('display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap')}>
          {S.guideOn && (
            <img
              src="/assets/duck-guide-explaining.png"
              alt="カモ先輩 — 簿記学習ガイド"
              width={1254}
              height={1254}
              decoding="async"
              style={css('width:4.5rem;height:auto;aspect-ratio:1/1;object-fit:contain;flex:none')}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div style={css('flex:1;min-width:14rem;display:grid;gap:var(--space-1)')}>
            <span style={css('font-size:var(--font-size-label);color:var(--text-secondary)')}>{todayMsg}</span>
            <span style={css('font-size:var(--font-size-subsection);font-weight:var(--font-weight-medium)')}>{nextTitle}</span>
            <span className="nm-supporting-text">{nextReward}</span>
          </div>
          <button className="nm-btn nm-btn--primary nm-btn--lg" onClick={goNext}>{ctaLabel}</button>
        </div>
        {p.aprilDone && (
          <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
            <span style={css('width:2rem;height:2rem;border-radius:50%;border:2px solid var(--warning);color:var(--warning-strong);display:grid;place-items:center;font-weight:700;font-size:0.5rem;transform:rotate(-8deg);flex:none;text-align:center;line-height:1.1')}>
              決算<br />完了
            </span>
            <span style={css('font-size:var(--font-size-supporting);color:var(--text-secondary)')}>
              月次決算完走トロフィー獲得済み — 共有カードで成果を残せます
            </span>
          </div>
        )}
        <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
          <span className="nm-number" style={css('font-size:var(--font-size-supporting);font-weight:var(--font-weight-bold)')}>LV.{level(S.xp)}</span>
          <div style={css('flex:1;height:0.25rem;border-radius:var(--radius-pill);background:var(--gray-200);overflow:hidden')}>
            <div style={cssWith('height:100%;background:var(--brand-500);border-radius:var(--radius-pill);transition:width 300ms var(--ease-standard)', { width: xpPct(S.xp) })} />
          </div>
          <span className="nm-number" style={css('font-size:var(--font-size-supporting);color:var(--text-muted)')}>
            {S.xp.toLocaleString('ja-JP')} XP　次のレベルまで {xpToNext(S.xp)} XP
          </span>
        </div>
      </div>

      {reviewOn && (
        <div className="nm-surface" style={css('border-color:var(--brand-300);padding:var(--space-3);display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap')}>
          <span className="nm-badge nm-badge--brand">今日の復習</span>
          <span style={css('flex:1;font-size:var(--font-size-body)')}>
            以前間違えた「{dueList[0].title}」を1問だけ復習しましょう（忘れかけた頃が定着のチャンスです）。
          </span>
          <button
            className="nm-btn nm-btn--primary nm-btn--sm"
            style={css('min-height:2.75rem')}
            onClick={() => { api.persist({ reviewDone: today }); openWrong(dueList[0].kind, dueList[0].id); }}
          >1問だけ復習する</button>
        </div>
      )}

      <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:var(--space-5);align-items:start')}>
        <div style={css('display:grid;gap:var(--space-5)')}>
          <div style={css('display:grid;gap:var(--space-1)')}>
            <h2 className="nm-section-title" style={css('margin:0')}>仕訳の結果</h2>
            {lastE ? (
              <>
                <p className="nm-supporting-text" style={css('margin:0')}>直近の登録：{lastE.date}　{lastE.memo}</p>
                <div className="nm-balance-list">
                  {lastMoveRows.map(k => (
                    <button
                      key={k.code}
                      className="nm-balance-row"
                      onClick={() => api.set({ view: 'gl', glAcc: k.code, hlEntry: lastE.id, trace: [] })}
                    >
                      <span className="nm-balance-row__label">{k.label}</span>
                      <span className="nm-number" style={css('font-size:var(--font-size-label);color:var(--text-muted);white-space:nowrap')}>{k.prev} →</span>
                      <span className="nm-balance-row__amount">{k.cur}</span>
                      <span className="nm-number" style={cssWith('font-size:var(--font-size-label);font-weight:var(--font-weight-bold);white-space:nowrap', { color: k.deltaColor })}>{k.delta}</span>
                      <span className="nm-balance-row__link">元帳で流れを見る</span>
                      <span aria-hidden="true" style={css('color:var(--brand-700)')}>→</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="nm-supporting-text" style={css('margin:0')}>仕訳を登録すると、動いた科目の残高の変化がここに表示されます。</p>
            )}
            <button
              className="bfl-link"
              style={css('border:0;background:transparent;padding:var(--space-1) 0;cursor:pointer;font-size:var(--font-size-label);color:var(--text-secondary);justify-self:start')}
              onClick={() => api.set({ view: 'tb', hlEntry: null, trace: [] })}
            >すべての残高を試算表で見る →</button>
          </div>

          {!scnAllDone && (
            <div style={css('display:grid;gap:var(--space-1)')}>
              <h2 className="nm-section-title" style={css('margin:0')}>取引状況</h2>
              <div className="nm-transaction-list">
                {dashScnList.map(s => (
                  <div key={s.id} className="nm-transaction-row">
                    <span className="nm-transaction-row__day">{s.day}</span>
                    <span className="nm-transaction-row__title">{s.title}</span>
                    <span className="nm-transaction-row__status">{s.badge}</span>
                    <button
                      className="nm-btn nm-btn--tertiary nm-btn--sm"
                      style={css('min-height:2.75rem;color:var(--brand-700)')}
                      onClick={s.open}
                    >{s.btnLabel} →</button>
                  </div>
                ))}
              </div>
              <button
                className="bfl-link"
                style={css('border:0;background:transparent;padding:var(--space-2) 0;cursor:pointer;font-size:var(--font-size-label);color:var(--text-secondary);justify-self:start')}
                onClick={() => api.set({ view: 'scnList', trace: [] })}
              >すべての取引を表示（{p.total}件）→</button>
            </div>
          )}
        </div>

        <div style={css('display:grid;gap:var(--space-3);align-content:start')}>
          {!scnAllDone && (
            <div style={css('display:grid;gap:var(--space-2)')}>
              <h2 className="nm-section-title" style={css('margin:0')}>月次決算までの残タスク</h2>
              <p style={css('margin:0;font-size:var(--font-size-label)')}>{taskSummary}</p>
              <details className="nm-disclosure">
                <summary>決算までの流れを確認</summary>
                <div className="nm-disclosure__body">
                  通常取引の記帳 → 決算整理（減価償却・未払費用）→ 試算表の貸借一致確認 → B/S・P/L の確認、の順に進みます。
                </div>
              </details>
            </div>
          )}
          {scnAllDone && (
            <div style={css('display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;border-bottom:1px solid var(--border-subtle);padding-bottom:var(--space-2)')}>
              <span style={css('font-size:var(--font-size-label)')}>
                月次決算　<strong style={css('color:var(--success-strong)')}>完了</strong>　｜　取引 {p.done} / {p.total}
              </span>
              <button
                className="bfl-link"
                style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-label);color:var(--text-secondary)')}
                onClick={() => api.set({ view: 'scnList', trace: [] })}
              >すべての取引を見る →</button>
              <button
                className="bfl-link"
                style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-label);color:var(--text-secondary)')}
                onClick={() => api.set({ view: 'fs', hlEntry: null, trace: [] })}
              >財務諸表で確認する →</button>
            </div>
          )}
        </div>
      </div>

      <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(20rem,1fr));gap:var(--space-5);align-items:start')}>
        <div style={css('display:grid;gap:var(--space-2)')}>
          <h2 className="nm-section-title" style={css('margin:0')}>学習プロフィール</h2>
          <div className="nm-profile-stats">
            <div className="nm-profile-stat"><span>連続学習</span><span>{S.streak.count} 日</span></div>
            <div className="nm-profile-stat"><span>連続一発正解</span><span>{S.combo} 回</span></div>
            <div className="nm-profile-stat"><span>獲得バッジ</span><span>{Object.keys(S.badges).length} / 10</span></div>
            <div className="nm-profile-stat"><span>ドリル</span><span>{drillDoneN} / {drillTotalN}</span></div>
            <div className="nm-profile-stat"><span>累計誤答</span><span>{wrongTotal} 回</span></div>
          </div>
          <div style={css('display:grid')}>{sortedBadges.slice(0, 4).map(badgeLine)}</div>
          <details className="nm-disclosure">
            <summary>すべてのバッジを見る（{Object.keys(S.badges).length} / 10）</summary>
            <div style={css('display:grid;padding-left:var(--space-4)')}>{sortedBadges.slice(4).map(badgeLine)}</div>
          </details>
          {wrongList.length > 0 && (
            <>
              <span className="nm-label">復習が必要な論点</span>
              <div style={css('display:grid;gap:var(--space-1)')}>
                {wrongList.slice(0, 3).map(r => (
                  <div key={r.id} style={css('display:flex;align-items:center;gap:var(--space-2)')}>
                    <span style={css('flex:1;font-size:var(--font-size-label)')}>{r.title}</span>
                    <span style={css('font-size:var(--font-size-supporting);color:var(--text-muted)')}>誤答 {r.n}</span>
                    <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => openWrong(r.kind, r.id)}>復習</button>
                  </div>
                ))}
              </div>
            </>
          )}
          <button
            className="bfl-link"
            style={css('border:0;background:transparent;padding:var(--space-1) 0;cursor:pointer;font-size:var(--font-size-label);color:var(--text-secondary);justify-self:start')}
            onClick={() => api.set({ shareOpen: true })}
          >学習成果カードを表示（SNS共有用）</button>
          <label className="nm-choice" style={css('min-height:2.75rem;align-items:center;font-size:var(--font-size-label)')}>
            <input type="checkbox" checked={S.guideOn} onChange={e => api.persist({ guideOn: e.target.checked })} />
            カモ先輩の案内を表示する
          </label>
          <details className="nm-disclosure">
            <summary>設定・データ管理</summary>
            <div className="nm-disclosure__body" style={css('display:flex;gap:var(--space-2);flex-wrap:wrap;padding-top:var(--space-2)')}>
              <button className="nm-btn nm-btn--secondary nm-btn--sm" onClick={onResetBooks}>サンプル会社を初期化</button>
              <button className="nm-btn nm-btn--sm" style={css('color:var(--danger)')} onClick={onResetAll}>学習データを全リセット</button>
            </div>
          </details>
        </div>
      </div>

      <div style={css('display:grid')}>
        <details className="nm-disclosure">
          <summary>このアプリで扱う範囲</summary>
          <div className="nm-disclosure__body">
            収録範囲は日商簿記３級(商品売買・手形・固定資産・売上原価算定・貸倒引当金・経過勘定などの決算整理)です。消費税・法人税・外貨換算等は対象外、金額は税区分なしの整数円です。ストーリーモードは原則として単純仕訳(借方1行・貸方1行)を扱い、論点別ドリルでは最大4行の複合仕訳も扱います。問題は商工会議所の出題区分表に基づくオリジナルで、実際の過去問は使用していません。
          </div>
        </details>
        <details className="nm-disclosure">
          <summary>データ保存と入力情報について</summary>
          <div className="nm-disclosure__body">
            本アプリは架空会社による学習用シミュレーションです。実在の企業・個人の情報を入力しないでください。データはこのブラウザ内(localStorage)にのみ保存されます。
          </div>
        </details>
      </div>
    </section>
  );
}
