/* 画面間で共有する派生値。プロトタイプ renderVals() の計算をそのまま純関数へ切り出したもの。 */
import * as B from '../engine/engine';
import type { DrillItem, Scenario } from '../engine/types';
import { BADGES, BADGE_SHORTS, LESSONS } from './content';
import type { AppState } from './types';

export const monthOf = (s: Scenario): string => s.date.split('/')[0];

export interface Progress {
  done: number;
  total: number;
  aprAll: Scenario[];
  mayAll: Scenario[];
  /** 学習順（日常取引 → 決算整理 → 翌月）に並べ替えた取引 */
  seq: Scenario[];
  remainingAll: Scenario[];
  /** 4月未完走なら4月分のみを残タスクとして扱う */
  remaining: Scenario[];
  aprilDone: boolean;
  mayDone: boolean;
  hasMay: boolean;
  fsAsOf: string;
  plPeriod: string;
  periodWord: string;
}

export function progress(S: AppState): Progress {
  const done = S.completed.length, total = B.SCENARIOS.length;
  const aprAll = B.SCENARIOS.filter(s => monthOf(s) === '4');
  const mayAll = B.SCENARIOS.filter(s => monthOf(s) === '5');
  const aprilDone = aprAll.every(s => S.completed.indexOf(s.id) >= 0);
  const seq = aprAll.filter(s => s.date !== '4/30')
    .concat(aprAll.filter(s => s.date === '4/30'), mayAll.filter(s => s.date !== '5/31'), mayAll.filter(s => s.date === '5/31'));
  const remainingAll = seq.filter(s => S.completed.indexOf(s.id) < 0);
  const remaining = aprilDone ? remainingAll : remainingAll.filter(s => monthOf(s) === '4');
  const mayDone = mayAll.every(s => S.completed.indexOf(s.id) >= 0);
  const hasMay = S.completed.some(id => B.SCN[id] && monthOf(B.SCN[id]) === '5');
  return {
    done, total, aprAll, mayAll, seq, remainingAll, remaining, aprilDone, mayDone, hasMay,
    fsAsOf: hasMay ? '20X6年5月31日' : '20X6年4月30日',
    plPeriod: hasMay ? '20X6年4月1日〜5月31日' : '20X6年4月1日〜4月30日',
    periodWord: hasMay ? '2か月分' : '1か月'
  };
}

export const level = (xp: number): number => 1 + Math.floor(xp / 500);
export const xpPct = (xp: number): string => Math.round((xp % 500) / 500 * 100) + '%';
export const xpToNext = (xp: number): string => (500 - xp % 500).toLocaleString('ja-JP');
export const xpInLevel = (xp: number): string => (xp % 500).toLocaleString('ja-JP');

export const allDrillItems = (): DrillItem[] => {
  const out: DrillItem[] = [];
  B.DRILLS.forEach(t => t.items.forEach(it => out.push(it)));
  return out;
};

export const lessonsDone = (S: AppState): number =>
  LESSONS.filter(l => S.lessons[l.id] && S.lessons[l.id].done).length;

/** 次に獲得できるバッジ（未獲得のうち先頭） */
export const nextBadge = (S: AppState) => BADGES.find(b => !S.badges[b[0]]) || null;

/** バッジの獲得条件までの残りを説明する文 */
export function badgeHint(S: AppState, id: string): string {
  if (S.badges[id]) return '獲得済みです。';
  const p = progress(S);
  switch (id) {
    case 'first': return 'あと1件の登録で獲得';
    case 'evidence': return 'あと' + Math.max(0, 3 - p.done) + '件の登録で獲得';
    case 'balance': return '3件以上登録した後、試算表を開いて貸借一致を確認する';
    case 'subledger': return '売掛金と買掛金の両方が動いた後、補助元帳を開く';
    case 'closing': return '決算整理（4/30）の取引をあと1件登録する';
    case 'combo5': return '一発正解をあと' + Math.max(0, 5 - S.combo) + '回連続で';
    case 'hand10': return '書いて覚えるモードであと' + Math.max(0, 10 - S.writePosts) + '問登録';
    case 'trace': return '財務諸表の金額をクリックして証憑まで逆にたどる';
    case 'exam3': return 'ネット試験入力モードであと' + Math.max(0, 3 - S.comboExam) + '問連続一発正解';
    case 'close': return 'あと' + p.aprAll.filter(s => S.completed.indexOf(s.id) < 0).length + '件（4月分）の登録で完走';
  }
  return '';
}

export interface BadgeRow {
  id: string;
  name: string;
  desc: string;
  short: string;
  earned: boolean;
  state: string;
  bd: string;
  fg: string;
  bg: string;
}

export function badgeRows(S: AppState): BadgeRow[] {
  const next = nextBadge(S);
  return BADGES.map(b => {
    const earned = !!S.badges[b[0]];
    const isNext = !earned && !!next && next[0] === b[0];
    return {
      id: b[0], name: b[1], desc: b[2] + (earned ? '（獲得済）' : ''), short: BADGE_SHORTS[b[0]], earned,
      state: earned ? '獲得済' : isNext ? 'あと少し' : '未獲得',
      bd: earned ? 'var(--brand-600)' : isNext ? 'var(--warning)' : 'var(--gray-300)',
      fg: earned ? 'var(--brand-800)' : isNext ? 'var(--warning-strong)' : 'var(--gray-500)',
      bg: earned ? 'var(--brand-50)' : isNext ? 'var(--warning-surface)' : 'transparent'
    };
  });
}

/** 直近の登録でハイライトする科目の背景色 */
export const flashBg = (S: AppState, code: string): string =>
  S.flash.indexOf(code) >= 0 ? 'var(--success-surface)' : 'transparent';

/** 学習ステージ（日常取引 → 決算整理 → 2か月目） */
export function stageLabel(S: AppState): string {
  const p = progress(S);
  const daily = p.aprAll.filter(s => s.date !== '4/30');
  const d1 = daily.filter(s => S.completed.indexOf(s.id) >= 0).length;
  return p.mayDone ? '全ステージクリア'
    : p.aprilDone ? 'ステージ3：2か月目（5月）'
      : d1 < daily.length ? 'ステージ1：日常取引' : 'ステージ2：決算整理';
}

/** 次のバッジまでの案内文 */
export function nextBadgeHint(S: AppState): string {
  const nb = nextBadge(S);
  return nb ? '「' + nb[1] + '」まで：' + badgeHint(S, nb[0]) : '全バッジ獲得済み';
}
