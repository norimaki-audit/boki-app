import type { DrillForm, DrillItem, Entry, EntryForm, SelfTest } from '../engine/types';

export type View =
  | 'dash' | 'learn' | 'scnList' | 'scn' | 'drill' | 'mock' | 'map' | 'notes'
  | 'journal' | 'sub' | 'gl' | 'tb' | 'fs';

/** 3つの学習モード：理解 / 書いて覚える / ネット試験入力 */
export type Mode = 'understand' | 'write' | 'exam';

export type SubTab = 'ar' | 'ap' | 'fa';

/** 取引フローをどこから開いたか。見出しの「学習 n件目」を出すかの判断に使う。 */
export type ScnFrom = 'lesson' | 'review' | null;

export interface Judged {
  correct: boolean;
  incomplete?: boolean;
  diagnoses?: string[];
  /** ドリル正解時の獲得XP */
  gain?: number;
}

export type GuideKind =
  | 'idle' | 'intro' | 'wrong' | 'menu' | 'usage' | 'data'
  | 'terms' | 'term' | 'qa' | 'qaAns' | 'hint';

export interface GuideState {
  open: boolean;
  kind: GuideKind;
  topic?: number;
  hintLv?: number;
}

export interface WrongEntry {
  n: number;
  t: number;
  kind: 'scn' | 'drill';
  title: string;
  diag: string;
}

export interface LessonProgress {
  seen?: boolean;
  done?: boolean;
  quiz?: Record<number, boolean>;
}

export interface MockState {
  items: DrillItem[];
  idx: number;
  results: { id: string; ok: boolean }[];
  startT: number;
  endT: number | null;
}

export interface Celebrate {
  lines: string[];
  badgeName: string | null;
}

export interface Streak {
  last: string | null;
  count: number;
}

export interface TraceCrumb {
  label: string;
  view: View;
  glAcc?: string;
  hlEntry?: string | null;
}

export interface AppState {
  ready: boolean;
  view: View;
  sid: string | null;
  scnFrom: ScnFrom;
  step: number;
  anaPick: number;
  anaMsg: string | null;
  form: EntryForm;
  judged: Judged | null;
  entries: Entry[];
  completed: string[];
  attempts: Record<string, number>;
  guide: GuideState;
  guideSeen: Record<string, boolean>;
  guidePulse: boolean;
  companyName: string | null;
  subTab: SubTab;
  whyPick: number;
  wrongLog: Record<string, WrongEntry>;
  reviewDone: string | null;
  mock: MockState | null;
  lessons: Record<string, LessonProgress>;
  briefSeen: Record<string, boolean>;
  briefOff: boolean;
  lessonId: string | null;
  lessonQuizPick: Record<number, number>;
  mapSel: string | null;
  briefMore: boolean;
  guideQuery: string;
  flash: string[];
  glAcc: string;
  hlEntry: string | null;
  evidenceSid: string | null;
  tests: SelfTest[] | null;
  trace: TraceCrumb[];
  shareOpen: boolean;
  mode: Mode;
  wroteDone: boolean;
  calcVals: Record<string, string>;
  xp: number;
  badges: Record<string, boolean>;
  combo: number;
  comboExam: number;
  writePosts: number;
  streak: Streak;
  toast: string | null;
  celebrate: Celebrate | null;
  badgeInfo: string | null;
  drillId: string | null;
  drillForm: DrillForm;
  drillJudged: Judged | null;
  drillDone: Record<string, boolean>;
  guideOn: boolean;
}

/** localStorage へ保存する項目（README の State Management に準拠） */
export interface SavedState {
  entries: Entry[];
  completed: string[];
  attempts: Record<string, number>;
  mode: Mode;
  xp: number;
  badges: Record<string, boolean>;
  combo: number;
  comboExam: number;
  writePosts: number;
  streak: Streak;
  drillDone: Record<string, boolean>;
  guideOn: boolean;
  guideSeen: Record<string, boolean>;
  companyName: string | null;
  wrongLog: Record<string, WrongEntry>;
  reviewDone: string | null;
  lessons: Record<string, LessonProgress>;
  briefSeen: Record<string, boolean>;
  briefOff: boolean;
}
