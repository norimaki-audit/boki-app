/* アプリ状態のストア。プロトタイプ（Reactクラス相当）の state / persist / 各アクションを 1:1 で移植している。
 * this.setState → set、this.persist → persist に対応し、状態は ref に持って同期的に読めるようにしている。 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import * as B from '../engine/engine';
import type { DrillItem, Entry, Impact, Scenario } from '../engine/types';
import { BADGES, STORAGE_KEY } from './content';
import type { AppState, MockState, SavedState, View, WrongEntry } from './types';

const emptyDrillForm = () => ({ dLines: [{ acc: '', amt: '' }], cLines: [{ acc: '', amt: '' }] });

const initialState = (): AppState => ({
  ready: false, view: 'dash', sid: null, step: 1,
  anaPick: -1, anaMsg: null,
  form: { dAcc: '', dAmt: '', cAcc: '', cAmt: '', sub: '' },
  judged: null, entries: [], completed: [], attempts: {},
  guide: { open: false, kind: 'idle' }, guideSeen: {}, guidePulse: false, companyName: null, subTab: 'ar',
  whyPick: -1, wrongLog: {}, reviewDone: null, mock: null,
  lessons: {}, briefSeen: {}, briefOff: false, lessonId: null, lessonQuizPick: {}, mapSel: null,
  briefMore: false, guideQuery: '',
  flash: [], glAcc: '101', hlEntry: null, evidenceSid: null, tests: null, trace: [], shareOpen: false,
  mode: 'write', wroteDone: false, calcVals: {}, xp: 0, badges: {}, combo: 0, comboExam: 0, writePosts: 0,
  streak: { last: null, count: 0 }, toast: null, celebrate: null, badgeInfo: null,
  drillId: null, drillForm: emptyDrillForm(), drillJudged: null, drillDone: {}, guideOn: true
});

export interface Api {
  set(part: Partial<AppState>): void;
  persist(part: Partial<AppState>): void;
  award(id: string): void;
  judge(): void;
  post(): void;
  startScenario(sid: string): void;
  gotoImpact(imp: Impact, scn: Scenario): void;
  startMock(): void;
  mockAnswer(): void;
  openDrill(id: string, clearMock?: boolean): void;
  showToast(msg: string, ms?: number): void;
  wrongOf(id: string, kind: 'scn' | 'drill', title: string, diag?: string): Record<string, WrongEntry>;
  /** 学習グループ内で最後に開いていた画面（ナビの「学習」タブの戻り先） */
  lastLearn: { current: View };
}

interface Ctx {
  S: AppState;
  api: Api;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('AppProvider の外で useApp が呼ばれました');
  return ctx;
}

function save(S: AppState): void {
  const data: SavedState = {
    entries: S.entries, completed: S.completed, attempts: S.attempts, mode: S.mode, xp: S.xp,
    badges: S.badges, combo: S.combo, comboExam: S.comboExam, writePosts: S.writePosts,
    streak: S.streak, drillDone: S.drillDone, guideOn: S.guideOn,
    guideSeen: { intro: !!S.guideSeen.intro }, companyName: S.companyName, wrongLog: S.wrongLog,
    reviewDone: S.reviewDone, lessons: S.lessons, briefSeen: S.briefSeen, briefOff: S.briefOff
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* 保存不可でも学習は継続できる */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<AppState>(initialState());
  const [, force] = useReducer((n: number) => n + 1, 0);
  const lastLearn = useRef<View>('scnList');
  const toastT = useRef<number | undefined>(undefined);
  const celebT = useRef<number | undefined>(undefined);
  const guideT = useRef<number | undefined>(undefined);
  const pulseT = useRef<number | undefined>(undefined);
  const mockT = useRef<number | undefined>(undefined);
  const guideKey = useRef<string | null>(null);

  const set = useCallback((part: Partial<AppState>) => {
    stateRef.current = { ...stateRef.current, ...part };
    force();
  }, []);

  const persist = useCallback((part: Partial<AppState>) => {
    stateRef.current = { ...stateRef.current, ...part };
    save(stateRef.current);
    force();
  }, []);

  const showToast = useCallback((msg: string, ms = 3500) => {
    set({ toast: msg });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => set({ toast: null }), ms);
  }, [set]);

  const wrongOf = useCallback((id: string, kind: 'scn' | 'drill', title: string, diag?: string) => {
    const S = stateRef.current;
    const w = { ...S.wrongLog };
    const prev = w[id] || { n: 0, diag: '' };
    w[id] = { n: prev.n + 1, t: Date.now(), kind, title, diag: diag || prev.diag || '' };
    return w;
  }, []);

  const award = useCallback((id: string) => {
    const S = stateRef.current;
    if (S.badges[id]) return;
    const meta = BADGES.find(b => b[0] === id);
    if (!meta) return;
    const badges = { ...S.badges }; badges[id] = true;
    const bonus = id === 'close' ? 500 : 50;
    persist({
      badges, xp: S.xp + bonus, badgeInfo: id,
      toast: (id === 'close' ? 'トロフィー獲得：' : '実績解除：') + meta[1] + '（+' + bonus + ' XP）'
    });
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => set({ toast: null }), 4000);
  }, [persist, set]);

  const startScenario = useCallback((sid: string) => {
    const S = stateRef.current;
    const done = S.completed.indexOf(sid) >= 0;
    const draft = S.entries.find(e => e.id === 'e-' + sid && e.status === 'draft');
    set({
      view: 'scn', sid, step: done ? 5 : draft ? 4 : 1, anaPick: -1, anaMsg: null, judged: null,
      trace: [], wroteDone: false, calcVals: {}, whyPick: -1,
      form: { dAcc: '', dAmt: '', cAcc: '', cAmt: '', sub: '' }
    });
  }, [set]);

  const gotoImpact = useCallback((imp: Impact, scn: Scenario) => {
    const accs = [scn.correct.d.acc, scn.correct.c.acc];
    if (imp.view === 'gl') set({ view: 'gl', glAcc: imp.acc, flash: accs, trace: [] });
    else set({ view: imp.view as View, flash: accs, trace: [] });
  }, [set]);

  const openDrill = useCallback((id: string, clearMock = false) => {
    set({
      view: 'drill', drillId: id, drillForm: emptyDrillForm(), drillJudged: null,
      ...(clearMock ? { mock: null } : {})
    });
  }, [set]);

  const judge = useCallback(() => {
    const S = stateRef.current;
    if (!S.sid) return;
    const scn = B.SCN[S.sid];
    const blank = (x: string) => !String(x || '').trim();
    const incomplete = blank(S.form.dAcc) || blank(S.form.cAcc) || blank(S.form.dAmt) || blank(S.form.cAmt)
      || (!!scn.subKind && blank(S.form.sub))
      || (!!scn.calc && scn.calc.parts.some(p => blank(S.calcVals[p.k])));
    if (incomplete) { set({ judged: { correct: false, incomplete: true } }); return; }
    const calcDiag: string[] = [];
    if (scn.calc) {
      scn.calc.parts.forEach(p => {
        const val = parseInt(String(S.calcVals[p.k] || '').replace(/[,，¥\s%円]/g, ''), 10);
        if (val !== p.ans) calcDiag.push('途中計算「' + p.label + '」が正しくありません。証憑の計算根拠を見直しましょう。');
      });
    }
    const v = B.validate(scn, S.form);
    if (calcDiag.length) {
      const attempts = { ...S.attempts };
      attempts[S.sid] = (attempts[S.sid] || 0) + 1;
      persist({
        attempts, combo: 0, comboExam: 0,
        judged: { correct: false, diagnoses: calcDiag.concat(v.correct ? [] : v.diagnoses) },
        guide: { open: true, kind: 'wrong' },
        wrongLog: wrongOf(S.sid, 'scn', scn.title, calcDiag[0])
      });
      return;
    }
    if (v.correct) {
      const entries = S.entries.filter(e => e.id !== 'e-' + S.sid);
      entries.push(B.entryFromScenario(scn, 'e-' + S.sid, 'draft'));
      const firstTry = !S.attempts[S.sid];
      const combo = firstTry ? S.combo + 1 : 0;
      const comboExam = S.mode === 'exam' && firstTry ? S.comboExam + 1 : 0;
      persist({ entries, combo, comboExam, judged: { correct: true }, step: 4 });
      if (combo >= 5) award('combo5');
      if (comboExam >= 3) award('exam3');
    } else {
      const attempts = { ...S.attempts };
      attempts[S.sid] = (attempts[S.sid] || 0) + 1;
      persist({
        attempts, combo: 0, comboExam: 0,
        judged: { correct: false, diagnoses: v.diagnoses },
        guide: { open: true, kind: 'wrong' },
        wrongLog: wrongOf(S.sid, 'scn', scn.title, v.diagnoses[0])
      });
    }
  }, [award, persist, set, wrongOf]);

  const post = useCallback(() => {
    const S = stateRef.current;
    if (!S.sid) return;
    const scn = B.SCN[S.sid];
    const entries = S.entries.map(e => {
      if (e.id !== 'e-' + S.sid) return e;
      const no = String(S.entries.filter(x => x.status === 'posted').length + 1).padStart(4, '0');
      return { ...e, status: 'posted' as const, no };
    });
    const completed = S.completed.indexOf(S.sid) >= 0 ? S.completed : S.completed.concat([S.sid]);
    const firstTry = !S.attempts[S.sid];
    let xp = S.xp + 100 + (firstTry ? 50 : 0) + (S.mode === 'write' ? 20 : S.mode === 'exam' ? 30 : 0);
    const writePosts = S.writePosts + (S.mode === 'write' ? 1 : 0);
    const badges = { ...S.badges };
    const newly: string[] = [];
    const tryAward = (id: string, cond: boolean) => {
      if (cond && !badges[id]) { badges[id] = true; xp += id === 'close' ? 500 : 50; newly.push(id); }
    };
    tryAward('first', completed.length >= 1);
    tryAward('evidence', completed.length >= 3);
    tryAward('closing', scn.date === '4/30');
    tryAward('hand10', writePosts >= 10);
    tryAward('close', B.SCENARIOS.filter(x => x.date.split('/')[0] === '4').every(x => completed.indexOf(x.id) >= 0));
    const lines = ['+100 XP 仕訳登録'];
    if (firstTry) lines.push('+50 XP 一発正解ボーナス');
    if (S.mode === 'write') lines.push('+20 XP 書いて覚えるボーナス');
    if (S.mode === 'exam') lines.push('+30 XP ネット試験入力ボーナス');
    const badgeXpGain = newly.reduce((t, id) => t + (id === 'close' ? 500 : 50), 0);
    if (badgeXpGain) lines.push('+' + badgeXpGain + ' XP バッジボーナス');
    const lvBefore = Math.floor(S.xp / 500), lvAfter = Math.floor(xp / 500);
    if (lvAfter > lvBefore) lines.push('レベルアップ！ LV.' + (lvAfter + 1));
    const dailyIds = B.SCENARIOS.filter(s => s.date.split('/')[0] === '4' && s.date !== '4/30').map(s => s.id);
    if (!dailyIds.every(id => S.completed.indexOf(id) >= 0) && dailyIds.every(id => completed.indexOf(id) >= 0)) {
      lines.push('ステージ1 クリア！ 決算整理ステージへ');
    }
    const badgeName = newly.length ? BADGES.filter(b => newly.indexOf(b[0]) >= 0).map(b => b[1]).join('・') : null;
    persist({
      entries, completed, step: 5, flash: [scn.correct.d.acc, scn.correct.c.acc], xp, writePosts, badges,
      celebrate: { lines, badgeName },
      badgeInfo: newly.length ? newly[newly.length - 1] : S.badgeInfo
    });
    window.clearTimeout(celebT.current);
    celebT.current = window.setTimeout(() => set({ celebrate: null }), 2400);
  }, [persist, set]);

  const startMock = useCallback(() => {
    const shuffle = <T,>(a: T[]): T[] => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    };
    /* 論点別に2問ずつ抽出 → 15問に絞る（偏り防止） */
    let pool: DrillItem[] = [];
    B.DRILLS.forEach(t => { pool = pool.concat(shuffle(t.items.slice()).slice(0, 2)); });
    pool = shuffle(pool).slice(0, 15);
    /* 金額を倍率変換した初見バリエーションを生成（利息・償却・引当金も金額に対して線形なので整合する） */
    const KS = [2, 3, 4];
    const scale = (txt: string, k: number) => String(txt).replace(/\d{1,3}(?:,\d{3})+|\d+(?=円)/g,
      mch => (parseInt(mch.replace(/,/g, ''), 10) * k).toLocaleString('ja-JP'));
    const items: DrillItem[] = pool.map(it => {
      const k = KS[Math.floor(Math.random() * KS.length)];
      const lines = (c: DrillItem['correct']['d']) => (Array.isArray(c) ? c : [c]).map(l => ({ acc: l.acc, amount: l.amount * k }));
      return {
        id: it.id, q: scale(it.q, k), expl: scale(it.expl, k), opts: it.opts, traps: it.traps,
        correct: { d: lines(it.correct.d), c: lines(it.correct.c) }
      };
    });
    const mock: MockState = { items, idx: 0, results: [], startT: Date.now(), endT: null };
    set({ view: 'mock', mock, drillForm: emptyDrillForm(), drillId: null, drillJudged: null });
    window.clearInterval(mockT.current);
    mockT.current = window.setInterval(() => {
      const S = stateRef.current;
      if (S.view === 'mock' && S.mock && !S.mock.endT) force();
      else window.clearInterval(mockT.current);
    }, 1000);
  }, [set]);

  const mockAnswer = useCallback(() => {
    const S = stateRef.current;
    const m = S.mock;
    if (!m) return;
    const item = m.items[m.idx];
    const r = B.validateDrill(item, S.drillForm);
    const results = m.results.concat([{ id: item.id, ok: r.correct }]);
    const wrongLog = r.correct
      ? S.wrongLog
      : wrongOf(item.id, 'drill', '模試：' + item.q.slice(0, 26) + (item.q.length > 26 ? '…' : ''), r.diagnoses[0]);
    const resetForm = emptyDrillForm();
    if (m.idx + 1 < m.items.length) {
      persist({ mock: { ...m, idx: m.idx + 1, results }, wrongLog, drillForm: resetForm });
    } else {
      window.clearInterval(mockT.current);
      const score = results.filter(x => x.ok).length * 3;
      persist({ mock: { ...m, results, endT: Date.now() }, wrongLog, xp: S.xp + score, drillForm: resetForm });
    }
  }, [persist, wrongOf]);

  /* ---------- 初期化（保存データの読み込みと過去データの救済） ---------- */
  useEffect(() => {
    let saved: Partial<SavedState> | null = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
    const today = new Date().toISOString().slice(0, 10);
    let streak = (saved && saved.streak) || { last: null, count: 0 };
    if (streak.last !== today) {
      const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      streak = { last: today, count: streak.last === yest ? streak.count + 1 : 1 };
    }
    const completed0 = (saved && saved.completed) || [];
    const badges0 = { ...((saved && saved.badges) || {}) };
    if (completed0.length) {
      const grant = (id: string, cond: boolean) => { if (cond && !badges0[id]) badges0[id] = true; };
      grant('first', completed0.length >= 1);
      grant('evidence', completed0.length >= 3);
      grant('closing', completed0.some(id => B.SCN[id] && B.SCN[id].date === '4/30'));
      grant('close', B.SCENARIOS.filter(s => s.date.split('/')[0] === '4').every(s => completed0.indexOf(s.id) >= 0));
    }
    let badgeXp0 = 0;
    Object.keys(badges0).forEach(id => { badgeXp0 += id === 'close' ? 500 : 50; });
    const xp0 = Math.max((saved && saved.xp) || 0, completed0.length * 120 + badgeXp0);
    const attempts0 = (saved && saved.attempts) || {};
    const wrongLog0: Record<string, WrongEntry> = { ...((saved && saved.wrongLog) || {}) };
    Object.keys(attempts0).forEach(id => {
      if (!attempts0[id] || wrongLog0[id]) return;
      if (B.SCN[id]) {
        wrongLog0[id] = { n: attempts0[id], t: Date.now(), kind: 'scn', title: B.SCN[id].title, diag: '' };
        return;
      }
      B.DRILLS.forEach(tp => tp.items.forEach(x => {
        if (x.id === id && !wrongLog0[id]) {
          wrongLog0[id] = {
            n: attempts0[id], t: Date.now(), kind: 'drill',
            title: tp.topic + '：' + x.q.slice(0, 26) + (x.q.length > 26 ? '…' : ''), diag: ''
          };
        }
      }));
    });
    const entries: Entry[] = saved && Array.isArray(saved.entries) && saved.entries.length
      ? saved.entries : B.openingEntries();
    persist({
      xp: xp0, badges: badges0,
      combo: (saved && saved.combo) || 0,
      comboExam: (saved && saved.comboExam) || 0,
      writePosts: (saved && saved.writePosts) || 0,
      drillDone: (saved && saved.drillDone) || {},
      guideOn: !(saved && saved.guideOn === false),
      streak, ready: true, entries,
      completed: completed0,
      attempts: attempts0,
      mode: (saved && saved.mode) || 'write',
      guideSeen: (saved && saved.guideSeen) || {},
      lessons: (saved && saved.lessons) || {},
      briefSeen: (saved && saved.briefSeen) || {},
      briefOff: !!(saved && saved.briefOff),
      wrongLog: wrongLog0,
      reviewDone: (saved && saved.reviewDone) || null,
      companyName: (saved && saved.companyName) || null,
      tests: B.runTests()
    });
    // 初期化は1度だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- カモ先輩の自動表示（初回・画面切替時のパルス） ---------- */
  useEffect(() => {
    const S = stateRef.current;
    if (!S.ready || !S.guideOn || S.mode === 'exam') return;
    const key = S.view === 'scn' ? 'scn:' + S.sid + ':' + S.step + ':' + S.mode
      : S.view === 'drill' ? 'drill:' + (S.drillId ? 'q' : 'home')
        : S.view;
    if (guideKey.current === key) return;
    guideKey.current = key;
    const autoClose = () => {
      window.clearTimeout(guideT.current);
      guideT.current = window.setTimeout(() => {
        const g = stateRef.current.guide;
        if (g.open && (g.kind === 'idle' || g.kind === 'intro')) set({ guide: { open: false, kind: 'idle' } });
      }, 7000);
    };
    if (!S.guideSeen.intro) {
      const guideSeen = { ...S.guideSeen }; guideSeen.intro = true; guideSeen[key] = true;
      persist({ guideSeen, guide: { open: true, kind: 'intro' } });
      autoClose();
    } else if (!S.guideSeen[key]) {
      const guideSeen = { ...S.guideSeen }; guideSeen[key] = true;
      set({ guideSeen, guidePulse: true });
      window.clearTimeout(pulseT.current);
      pulseT.current = window.setTimeout(() => set({ guidePulse: false }), 3000);
    } else if (S.guide.open && S.guide.kind !== 'wrong') {
      set({ guide: { open: false, kind: 'idle' } });
    }
  });

  useEffect(() => () => {
    window.clearTimeout(toastT.current);
    window.clearTimeout(celebT.current);
    window.clearTimeout(guideT.current);
    window.clearTimeout(pulseT.current);
    window.clearInterval(mockT.current);
  }, []);

  const api = useMemo<Api>(() => ({
    set, persist, award, judge, post, startScenario, gotoImpact, startMock, mockAnswer, openDrill,
    showToast, wrongOf, lastLearn
  }), [set, persist, award, judge, post, startScenario, gotoImpact, startMock, mockAnswer, openDrill, showToast, wrongOf]);

  return <AppCtx.Provider value={{ S: stateRef.current, api }}>{children}</AppCtx.Provider>;
}
