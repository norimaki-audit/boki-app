/* 会計エンジンの型定義。プロトタイプ engine.js のデータ構造をそのまま型にしたもの。 */

export type Side = 'D' | 'C';
export type AccountCat = '資産' | '負債' | '純資産' | '収益' | '費用' | 'その他（仮勘定）';
export type SubKind = 'customer' | 'vendor' | 'asset';
export type EntryStatus = 'draft' | 'posted';

/** 論点別ドリルでのみ使う科目。帳簿には現れないので normal などは持たない。 */
export interface DrillAccount {
  code: string;
  name: string;
  cat: AccountCat;
  normal?: Side;
  bs?: string;
  pl?: string;
  sub?: SubKind;
  contra?: boolean;
  /** 勘定科目ガイドで「ドリルで見る」に振り分けるための印 */
  drill?: boolean;
}

/** 帳簿で使う科目マスタ（貸借どちら側が正常残高かを必ず持つ） */
export interface Account extends DrillAccount {
  normal: Side;
}

export interface JournalLine {
  acc: string;
  side: Side;
  amount: number;
  sub?: string | null;
}

/** 帳簿の唯一のデータソース。帳票はすべて posted な Entry から導出する。 */
export interface Entry {
  id: string;
  no: string | null;
  date: string;
  memo: string;
  scenarioId: string | null;
  status: EntryStatus;
  opening?: boolean;
  lines: JournalLine[];
}

export interface Evidence {
  kind: string;
  title: string;
  rows: [string, string][];
  note: string;
}

export interface AnalysisOption {
  t: string;
  ok?: boolean;
  diag?: string;
}

export interface CorrectSide {
  acc: string;
  amount: number;
  sub?: string;
}

export interface Trap {
  d?: string;
  c?: string;
  msg: string;
}

export interface CalcPart {
  k: string;
  label: string;
  ans: number;
}

export interface Impact {
  label: string;
  detail: string;
  view: string;
  acc?: string;
}

export interface Scenario {
  id: string;
  order: number;
  date: string;
  title: string;
  level: string;
  story: string;
  evidence: Evidence;
  analysis: AnalysisOption[];
  correct: { d: CorrectSide; c: CorrectSide };
  subKind?: SubKind | null;
  subLabel?: string;
  traps?: Trap[];
  calc?: { title: string; parts: CalcPart[] };
  memo: string;
  impacts: Impact[];
  note: string;
}

export interface DrillItem {
  id: string;
  q: string;
  correct: { d: CorrectSide | CorrectSide[]; c: CorrectSide | CorrectSide[] };
  opts: string[];
  traps?: Trap[];
  expl: string;
}

export interface DrillTopic {
  topic: string;
  desc: string;
  items: DrillItem[];
}

/** 仕訳入力フォーム（ストーリーモード：単純仕訳） */
export interface EntryForm {
  dAcc: string;
  dAmt: string;
  cAcc: string;
  cAmt: string;
  sub: string;
}

/** ドリル・模試の入力フォーム（複合仕訳：各側最大4行） */
export interface DrillFormLine {
  acc: string;
  amt: string;
}

export interface DrillForm {
  dLines: DrillFormLine[];
  cLines: DrillFormLine[];
}

export interface ValidateResult {
  correct: boolean;
  diagnoses: string[];
}

export interface LedgerRow {
  date: string;
  no: string | null;
  memo: string;
  counter: string;
  debit: number;
  credit: number;
  balance: number;
  entryId: string;
  scenarioId: string | null;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  cat: AccountCat;
  /** 期首（opening）借方・貸方 */
  oD: number;
  oC: number;
  /** 当期（period）借方・貸方 */
  pD: number;
  pC: number;
  /** 差引残高 */
  cD: number;
  cC: number;
}

export interface TrialBalanceTotals {
  oD: number;
  oC: number;
  pD: number;
  pC: number;
  cD: number;
  cC: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  tot: TrialBalanceTotals;
  balanced: boolean;
}

export interface ProfitResult {
  rev: number;
  exp: number;
  profit: number;
}

export interface BsRow {
  sec: string;
  name: string;
  code: string;
  v: number;
  contra?: boolean;
}

export interface BalanceSheet {
  assets: BsRow[];
  liab: BsRow[];
  equity: BsRow[];
  totalAssets: number;
  totalLE: number;
}

export interface PlRow {
  name: string;
  code?: string;
  v: number;
  minus?: boolean;
  total?: boolean;
  grand?: boolean;
}

export interface ProfitLoss {
  rows: PlRow[];
  profit: number;
}

export interface SubLedgerRow {
  name: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface FixedAssetRow {
  name: string;
  date: string;
  method: string;
  cost: number;
  accDep: number;
  monthly: number;
  book: number;
}

export interface Metrics {
  cash: number;
  ar: number;
  ap: number;
  profit: number;
}

export interface SelfTest {
  name: string;
  pass: boolean;
  err?: string;
}
