/* ナビゲーション。ロゴ＝ダッシュボード（グローバル退避先）、学習グループは最後に見ていた画面へ戻る。 */
import * as B from '../engine/engine';
import { useApp } from './store';
import type { View } from './types';

export const LEARN_KEYS: View[] = ['learn', 'scnList', 'scn', 'drill', 'mock', 'map', 'notes'];

export const NAVS: [string, string][] = [
  ['dash', '⌂ ダッシュボード'], ['learnGrp', '学習'], ['journal', '仕訳帳'], ['sub', '補助元帳'],
  ['gl', '総勘定元帳'], ['tb', '試算表'], ['fs', '財務諸表']
];

export const SUB_NAVS: [View, string][] = [
  ['learn', '基礎'], ['scnList', '取引'], ['drill', 'ドリル'], ['map', '論点マップ'], ['notes', '間違いノート']
];

export function useNav() {
  const { S, api } = useApp();
  const inLearnGrp = LEARN_KEYS.indexOf(S.view) >= 0;
  if (inLearnGrp) api.lastLearn.current = S.view === 'scn' ? 'scnList' : S.view === 'mock' ? 'drill' : S.view;

  const goNav = (k: string) => {
    api.set({ view: (k === 'learnGrp' ? (api.lastLearn.current || 'scnList') : k) as View, hlEntry: null, trace: [] });
    if (k === 'tb' && S.completed.length >= 3 && B.trialBalance(S.entries).balanced) api.award('balance');
    if (k === 'sub' && B.subLedger(S.entries, '110', B.CUSTOMERS).length && B.subLedger(S.entries, '201', B.VENDORS).length) {
      api.award('subledger');
    }
  };

  /** 入力途中の破棄確認つきでダッシュボードへ戻る */
  const goHome = () => {
    const editingScn = S.view === 'scn' && S.step === 3
      && !!(S.form.dAcc || S.form.dAmt || S.form.cAcc || S.form.cAmt) && !(S.judged && S.judged.correct);
    const editingDrill = S.view === 'drill' && !!S.drillId
      && (S.drillForm.dLines.some(l => l.acc || l.amt) || S.drillForm.cLines.some(l => l.acc || l.amt))
      && !(S.drillJudged && S.drillJudged.correct);
    if ((editingScn || editingDrill)
      && !window.confirm('入力途中ですが、ダッシュボードへ戻りますか？（この問題の入力内容は破棄されます）')) return;
    api.set({ view: 'dash', hlEntry: null, trace: [] });
  };

  const goSub = (k: View) => api.set({ view: k, hlEntry: null, trace: [] });

  const viewKey = inLearnGrp ? 'learnGrp' : S.view;
  const subKey: View = S.view === 'scn' ? 'scnList' : S.view === 'mock' ? 'drill' : S.view;

  return { goNav, goHome, goSub, inLearnGrp, viewKey, subKey };
}
