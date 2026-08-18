/* カモ先輩アシスタント：常駐ヘルプ兼状況ガイド。
 * 自動で開くのは初回・誤答・達成時のみ（ストア側の効果）。ネット試験モードではカモを隠し「操作ヘルプ」になる。 */
import { ACC, DACC, DRILLS, SCN } from '../engine/engine';
import { css } from '../lib/css';
import {
  DASH_QA, DATA_TEXT, DRILL_QA, FS_QA, GLOSSARY, LEDGER_QA, SCN_QA
} from '../state/content';
import type { Pair } from '../state/content';
import { progress } from '../state/derive';
import { useNav } from '../state/nav';
import { useApp } from '../state/store';
import type { GuideKind, GuideState } from '../state/types';

interface Opt { label: string; pick: () => void }

export default function DuckAssistant() {
  const { S, api } = useApp();
  const { goHome } = useNav();

  const modalOpen = !!S.evidenceSid;
  const asstOn = !modalOpen && !S.shareOpen && !S.badgeInfo && S.view !== 'mock';
  if (!asstOn) return null;

  const p = progress(S);
  const scn = S.sid ? SCN[S.sid] : null;
  const drItem = S.drillId
    ? DRILLS.flatMap(t => t.items).find(it => it.id === S.drillId) || null
    : null;
  const drTopic = drItem ? DRILLS.find(t => t.items.some(it => it.id === drItem.id)) || null : null;

  /* ---------- 画面ごとの案内文と3段階ヒント ---------- */
  let gIdle = '';
  let hints: string[] | null = null;
  if (S.view === 'dash') {
    gIdle = p.remaining.length
      ? '次は「' + p.remaining[0].title + '」です。証憑の金額と支払方法を先に見ましょう。'
      : '月次決算が完了しています。試算表と財務諸表で1か月を振り返りましょう。';
  } else if (S.view === 'scnList') {
    gIdle = '上から順に進めるのがおすすめです。仕訳帳・元帳には日付順で記帳されます。';
  } else if (S.view === 'scn' && scn) {
    const dA = ACC[scn.correct.d.acc], cA = ACC[scn.correct.c.acc];
    if (S.step === 1) gIdle = '証憑の日付・相手先・金額を確認しましょう。実務の記帳は必ず証憑から始まります。';
    else if (S.step === 2) gIdle = 'この取引で増えたもの・減ったものを、5要素に当てはめて選びましょう。';
    else if (S.step === 3) {
      gIdle = S.mode === 'write' && !S.wroteDone
        ? '紙に借方・貸方の科目と金額を書きましょう。書けたら同じ内容をPCへ転記します。'
        : '借方＝左、貸方＝右です。金額は証憑と一致させましょう。';
    } else if (S.step === 4) {
      gIdle = '正解です。登録前なので帳簿は未反映。下の表で、登録すると何が変わるかを先に見ておきましょう。';
    } else {
      gIdle = '登録完了。「' + dA.name + '」と「' + cA.name + '」の元帳へ反映されました。影響の流れを順にたどってみましょう。';
    }
    if (S.step === 2 || S.step === 3) {
      hints = [
        '考え方：この取引で「増えたもの」と「減ったもの」を1つずつ挙げ、5要素（資産・負債・純資産・収益・費用）に当てはめます。',
        '増減する要素：借方側は' + dA.cat + '、貸方側は' + cA.cat + 'が動きます。',
        '科目：借方は「' + dA.name + '」、貸方は「' + cA.name + '」。金額は証憑で確認しましょう。'
      ];
    }
  } else if (S.view === 'drill') {
    if (drItem && drTopic) {
      gIdle = '科目候補はこの論点に絞られています。貸借の合計は必ず一致させましょう。';
      const dArr = ([] as { acc: string; amount: number }[]).concat(drItem.correct.d);
      const cArr = ([] as { acc: string; amount: number }[]).concat(drItem.correct.c);
      const names = (a: typeof dArr) => a.map(l => '「' + DACC[l.acc].name + '」').join('・');
      const cats = (a: typeof dArr) => a.map(l => DACC[l.acc].cat).filter((x, i, arr) => arr.indexOf(x) === i).join('・');
      hints = [
        '考え方：' + drTopic.desc + '。まず何が増えて何が減ったかを整理しましょう。',
        '増減する要素：借方側は' + cats(dArr) + '（' + dArr.length + '行）、貸方側は' + cats(cArr) + '（' + cArr.length + '行）が動きます。',
        '科目：借方は' + names(dArr) + '、貸方は' + names(cArr) + '。金額は問題文の条件（率・月数）から計算します。'
      ];
    } else gIdle = '論点を1つ選んで1問ずつ練習します。ここでの仕訳は帳簿には入りません。';
  } else if (S.view === 'journal') gIdle = '仕訳帳は全仕訳の時系列記録です。「証憑」ボタンで元の取引まで戻れます。';
  else if (S.view === 'sub') gIdle = '補助元帳の合計は、総勘定元帳の残高と必ず一致します。バッジの「照合」も確認しましょう。';
  else if (S.view === 'gl') gIdle = '各行は仕訳1本に対応します。「仕訳へ」で元の仕訳までドリルダウンできます。';
  else if (S.view === 'tb') gIdle = '本試験と同じ合計残高試算表です。内側の「合計」は取引の総額、外側の「残高」は差し引き後の期末残高。合計・残高とも借方計と貸方計は必ず一致します。';
  else if (S.view === 'fs') gIdle = '金額を押すと、試算表 → 元帳 → 仕訳 → 証憑 まで発生源へ逆にたどれます。';
  else if (S.view === 'notes') gIdle = '間違えた問題と診断がここに貯まります。試験前の弱点チェックに使いましょう。';
  else if (S.view === 'map') gIdle = '「要復習」の論点から片付けるのが効率的です。定着した論点も試験前に一度見直しましょう。';

  let wrongText = '';
  if (S.view === 'scn' && S.step === 2) wrongText = S.anaMsg || '';
  else if (S.view === 'scn') wrongText = S.judged && !S.judged.correct && S.judged.diagnoses ? S.judged.diagnoses[0] : '';
  else if (S.view === 'drill') wrongText = S.drillJudged && !S.drillJudged.correct && S.drillJudged.diagnoses ? S.drillJudged.diagnoses[0] : '';

  const exam = S.mode === 'exam';
  const qaSet: Pair[] = S.view === 'scn' ? SCN_QA
    : S.view === 'drill' ? DRILL_QA
      : S.view === 'fs' ? FS_QA
        : (S.view === 'journal' || S.view === 'sub' || S.view === 'gl' || S.view === 'tb') ? LEDGER_QA
          : DASH_QA;

  const setG = (g: Partial<GuideState>) =>
    api.set({ guide: { open: true, kind: 'idle', topic: 0, hintLv: 1, ...g } as GuideState });

  let gk: GuideKind = S.guide.kind || 'idle';
  if (gk === 'wrong' && !wrongText) gk = 'idle';

  const asstOpen = S.guide.open;
  const asstDuckOn = S.guideOn && !exam;

  let text = '';
  let opts: Opt[] = [];
  let backTo: GuideKind | null = null;
  if (gk === 'menu') {
    text = '何を確認しますか？';
    opts.push({ label: 'この画面の使い方', pick: () => setG({ kind: 'usage' }) });
    if (!exam) opts.push({ label: '簿記用語を調べる', pick: () => setG({ kind: 'terms' }) });
    if (!exam && hints) opts.push({ label: '問題のヒントを聞く', pick: () => setG({ kind: 'hint', hintLv: 1 }) });
    opts.push({ label: 'データ保存・リセットについて', pick: () => setG({ kind: 'data' }) });
    opts.push({ label: 'ヘルプ一覧を見る', pick: () => setG({ kind: 'qa' }) });
    if (S.view !== 'dash') {
      opts.push({
        label: '学習全体を確認する → ダッシュボードへ',
        pick: () => { api.set({ guide: { open: false, kind: 'idle' } }); goHome(); }
      });
    }
  } else if (gk === 'usage') { text = gIdle; backTo = 'menu'; }
  else if (gk === 'data') { text = DATA_TEXT; backTo = 'menu'; }
  else if (gk === 'terms') {
    text = '調べたい用語を選んでください。';
    opts = GLOSSARY.map((t, i) => ({ label: t[0], pick: () => setG({ kind: 'term', topic: i }) }));
    backTo = 'menu';
  } else if (gk === 'term') {
    const t = GLOSSARY[S.guide.topic || 0];
    text = '【' + t[0] + '】' + t[1];
    backTo = 'terms';
  } else if (gk === 'qa') {
    text = 'この画面のよくある質問です。';
    opts = qaSet.map((t, i) => ({ label: t[0], pick: () => setG({ kind: 'qaAns', topic: i }) }));
    backTo = 'menu';
  } else if (gk === 'qaAns') { text = qaSet[S.guide.topic || 0][1]; backTo = 'qa'; }
  else if (gk === 'hint' && hints) {
    const lv = Math.min(S.guide.hintLv || 1, 3);
    text = 'ヒント ' + lv + '/3　' + hints[lv - 1];
    backTo = 'menu';
  } else if (gk === 'wrong') text = wrongText;
  else if (gk === 'intro') text = '困ったときは、いつでもここを押してください。画面の使い方や簿記用語を案内します。';
  else text = gIdle;

  const bubbleKinds: GuideKind[] = ['idle', 'intro', 'wrong'];
  const boxCls = bubbleKinds.indexOf(gk) >= 0 ? 'bfl-bubble' : 'bfl-drawer';
  const askOn = bubbleKinds.indexOf(gk) >= 0;
  const moreOn = gk === 'hint' && !!hints && (S.guide.hintLv || 1) < 3;
  const toggle = () => api.set({ guide: { open: !S.guide.open, kind: 'idle', topic: 0, hintLv: 1 } });

  return (
    <div style={css('position:fixed;right:1rem;bottom:1rem;z-index:90;display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2)')}>
      {asstOpen && (
        <div role="dialog" aria-label="ヘルプ" className={boxCls}>
          <div style={css('display:flex;align-items:center;gap:var(--space-2)')}>
            <span className="nm-label" style={css('color:var(--brand-800)')}>{asstDuckOn ? 'カモ先輩' : '操作ヘルプ'}</span>
            <button
              aria-label="閉じる"
              onClick={toggle}
              style={css('margin-left:auto;border:0;background:transparent;cursor:pointer;color:var(--text-muted);font-size:1rem;line-height:1;padding:0.25rem')}
            >×</button>
          </div>
          <p style={css('margin:0;font-size:var(--font-size-label);line-height:1.6')}>{text}</p>
          {opts.length > 0 && (
            <div style={css('display:grid;gap:var(--space-1)')}>
              {opts.map((o, i) => (
                <button
                  key={i}
                  className="nm-btn nm-btn--secondary nm-btn--sm"
                  style={css('justify-content:flex-start;text-align:left')}
                  onClick={o.pick}
                >{o.label}</button>
              ))}
            </div>
          )}
          <div style={css('display:flex;gap:var(--space-2);flex-wrap:wrap')}>
            {backTo && <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => setG({ kind: backTo! })}>← 戻る</button>}
            {moreOn && (
              <button
                className="nm-btn nm-btn--primary nm-btn--sm"
                onClick={() => setG({ kind: 'hint', hintLv: (S.guide.hintLv || 1) + 1 })}
              >もっと詳しく</button>
            )}
            {askOn && (
              <button className="nm-btn nm-btn--secondary nm-btn--sm" onClick={() => setG({ kind: 'menu' })}>
                {asstDuckOn ? '質問する' : 'メニュー'}
              </button>
            )}
          </div>
          <div style={css('display:flex;gap:var(--space-3);flex-wrap:wrap;border-top:1px solid var(--border-subtle);padding-top:var(--space-2)')}>
            <button
              className="bfl-link"
              style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--brand-700)')}
              onClick={() => api.set({ view: 'learn', lessonId: null, mapSel: null, guide: { open: false, kind: 'idle' } })}
            >基礎レッスンを見る →</button>
            <button
              className="bfl-link"
              style={css('border:0;background:transparent;padding:0;cursor:pointer;font-size:var(--font-size-supporting);color:var(--brand-700)')}
              onClick={() => api.set({ view: 'learn', lessonId: null, mapSel: null, guideQuery: '', guide: { open: false, kind: 'idle' } })}
            >勘定科目ガイドを見る →</button>
          </div>
        </div>
      )}
      {asstDuckOn && (
        <div style={css('position:relative')}>
          <button
            onClick={toggle}
            aria-label="カモ先輩の案内を開く"
            title="カモ先輩"
            className="bfl-hv-border"
            style={css('width:3.5rem;height:3.5rem;border-radius:50%;border:2px solid var(--brand-300);background:var(--surface-card);padding:0;cursor:pointer;box-shadow:var(--shadow-dialog);overflow:hidden;flex:none;display:block')}
          >
            <img
              src={gk === 'wrong' ? '/assets/duck-guide-struggling.png' : '/assets/duck-guide-explaining.png'}
              alt=""
              width={1254}
              height={1254}
              loading="lazy"
              decoding="async"
              style={css('width:100%;height:100%;object-fit:cover;transform:scale(1.55);transform-origin:50% 30%')}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </button>
          <span
            className={S.guidePulse ? 'bfl-pulse' : ''}
            style={css('position:absolute;top:-2px;right:-2px;width:1.25rem;height:1.25rem;border-radius:50%;background:var(--brand-600);color:#fff;display:grid;place-items:center;font-size:0.75rem;font-weight:700;pointer-events:none')}
          >?</span>
        </div>
      )}
    </div>
  );
}
