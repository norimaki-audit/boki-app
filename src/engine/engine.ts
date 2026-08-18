/* 会計エンジン（純粋関数）。UIから分離し、帳簿・財務諸表はすべて JournalLine から導出する。金額は整数円。
 * 同梱プロトタイプ engine.js からの移植。ロジックは変更せず、型注釈のみを付与している。 */
import type {
  Account, BalanceSheet, BsRow, CorrectSide, DrillAccount, DrillForm, DrillFormLine, DrillItem,
  DrillTopic, Entry, EntryForm, EntryStatus, FixedAssetRow, JournalLine, LedgerRow, Metrics,
  ProfitLoss, ProfitResult, Scenario, SelfTest, SubLedgerRow, TrialBalance, TrialBalanceRow,
  ValidateResult
} from './types';

export const ACCOUNTS: Account[] = [
  { code: '101', name: '現金預金', cat: '資産', normal: 'D', bs: '流動資産' },
  { code: '105', name: '受取手形', cat: '資産', normal: 'D', bs: '流動資産' },
  { code: '110', name: '売掛金', cat: '資産', normal: 'D', bs: '流動資産', sub: 'customer' },
  { code: '111', name: '貸倒引当金', cat: '資産', normal: 'C', bs: '流動資産', contra: true },
  { code: '120', name: '繰越商品', cat: '資産', normal: 'D', bs: '流動資産' },
  { code: '150', name: '備品', cat: '資産', normal: 'D', bs: '固定資産', sub: 'asset' },
  { code: '159', name: '減価償却累計額', cat: '資産', normal: 'C', bs: '固定資産', contra: true },
  { code: '201', name: '買掛金', cat: '負債', normal: 'C', bs: '流動負債', sub: 'vendor' },
  { code: '210', name: '未払費用', cat: '負債', normal: 'C', bs: '流動負債' },
  { code: '301', name: '資本金', cat: '純資産', normal: 'C', bs: '純資産' },
  { code: '401', name: '売上', cat: '収益', normal: 'C', pl: '売上高' },
  { code: '501', name: '仕入', cat: '費用', normal: 'D', pl: '売上原価' },
  { code: '502', name: '減価償却費', cat: '費用', normal: 'D', pl: '販売費及び一般管理費' },
  { code: '503', name: '支払手数料', cat: '費用', normal: 'D', pl: '販売費及び一般管理費' },
  { code: '504', name: '貸倒引当金繰入', cat: '費用', normal: 'D', pl: '販売費及び一般管理費' }
];
export const ACC: Record<string, Account> = {};
ACCOUNTS.forEach(a => (ACC[a.code] = a));
export const CUSTOMERS: string[] = ['山田商店'];
export const VENDORS: string[] = ['佐藤卸売'];
export const COMPANY = { name: 'のりまき商事株式会社', period: '20X6年4月1日〜5月31日（第1期・月次）' };

export function openingEntries(): Entry[] {
  return [{
    id: 'op1', no: '0001', date: '4/1', memo: '設立出資（当座開設・資本金払込）',
    scenarioId: null, status: 'posted', opening: true,
    lines: [
      { acc: '101', side: 'D', amount: 1000000 },
      { acc: '301', side: 'C', amount: 1000000 }
    ]
  }];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 's1', order: 1, date: '4/5', title: '商品を掛けで販売する', level: '３級',
    story: '得意先の山田商店へ商品を100,000円で販売し、商品を引き渡した。代金は月末締め・翌月払いの掛けとした。',
    evidence: { kind: '請求書（控）', title: '御請求書', rows: [['宛先', '山田商店 御中'], ['発行日', '20X6年4月5日'], ['品目', '商品一式'], ['金額', '¥100,000'], ['支払条件', '月末締め・翌月末払い']], note: '発行者：のりまき商事株式会社' },
    analysis: [
      { t: '売掛金（資産）が増加し、売上（収益）が発生した', ok: true },
      { t: '現金預金（資産）が増加し、売上（収益）が発生した', diag: '代金はまだ受け取っていません。収益は商品を引き渡した時点で認識し、未回収の代金は「売掛金」という資産で記録します（発生主義）。' },
      { t: '売掛金（資産）が増加し、買掛金（負債）が増加した', diag: '買掛金は「仕入代金の未払い」を表す負債です。販売取引では発生しません。増えた権利（売掛金）の相手は収益（売上）です。' }
    ],
    correct: { d: { acc: '110', amount: 100000, sub: '山田商店' }, c: { acc: '401', amount: 100000 } },
    subKind: 'customer', subLabel: '得意先',
    traps: [
      { d: '101', msg: '収益を現金入金時に認識しています。掛け販売では入金はまだ先で、引渡し時点では「後で代金を受け取る権利＝売掛金」が増加します。' }
    ],
    memo: '山田商店へ商品掛売上',
    impacts: [
      { label: '売掛金 補助元帳', detail: '山田商店の残高 +100,000', view: 'sub' },
      { label: '総勘定元帳（売掛金）', detail: '借方 +100,000', view: 'gl', acc: '110' },
      { label: '総勘定元帳（売上）', detail: '貸方 +100,000', view: 'gl', acc: '401' },
      { label: '試算表', detail: '売掛金・売上が更新', view: 'tb' },
      { label: '貸借対照表', detail: '資産合計 +100,000', view: 'fs' },
      { label: '損益計算書', detail: '売上高・利益 +100,000', view: 'fs' }
    ],
    note: '1本の仕訳が、補助元帳→総勘定元帳→試算表→B/S・P/L のすべてに同時に伝播しました。'
  },
  {
    id: 's2', order: 2, date: '4/15', title: '売掛金の一部を入金する', level: '３級',
    story: '山田商店から売掛金のうち60,000円が普通預金口座へ振り込まれた。',
    evidence: { kind: '通帳明細', title: '普通預金 入出金明細', rows: [['日付', '20X6年4月15日'], ['摘要', 'フリコミ ヤマダショウテン'], ['入金額', '¥60,000'], ['取扱', '△△銀行 本店']], note: '' },
    analysis: [
      { t: '現金預金（資産）が増加し、売掛金（資産）が減少した', ok: true },
      { t: '現金預金（資産）が増加し、売上（収益）が発生した', diag: '売上はすでに4/5の引渡し時に計上済みです。回収時に再計上すると収益が二重になります。回収は資産の形が「売掛金→現金預金」に変わるだけです。' },
      { t: '現金預金（資産）が増加し、資本金（純資産）が増加した', diag: '資本金は株主からの出資です。得意先からの入金は、既存の債権（売掛金）の回収にあたります。' }
    ],
    correct: { d: { acc: '101', amount: 60000 }, c: { acc: '110', amount: 60000, sub: '山田商店' } },
    subKind: 'customer', subLabel: '得意先',
    traps: [
      { c: '401', msg: '売掛金の回収時に売上を再計上しています。収益は引渡し時（4/5）に認識済みなので、貸方は債権の減少＝売掛金です。' }
    ],
    memo: '山田商店より売掛金回収（振込）',
    impacts: [
      { label: '売掛金 補助元帳', detail: '山田商店の残高 −60,000（残 40,000）', view: 'sub' },
      { label: '総勘定元帳（現金預金）', detail: '借方 +60,000', view: 'gl', acc: '101' },
      { label: '総勘定元帳（売掛金）', detail: '貸方 +60,000（残高減少）', view: 'gl', acc: '110' },
      { label: '試算表', detail: '現金預金・売掛金が更新', view: 'tb' },
      { label: '貸借対照表', detail: '資産の内訳が変化（合計は不変）', view: 'fs' },
      { label: '損益計算書', detail: '売上・利益は変化しない', view: 'fs' }
    ],
    note: '回収では資産の形が変わるだけで、売上と利益は一切変化しません。B/Sの資産合計も不変です。'
  },
  {
    id: 's3', order: 3, date: '4/8', title: '商品を掛けで仕入れる', level: '３級',
    story: '仕入先の佐藤卸売から商品70,000円を掛けで仕入れ、商品を受け取った。支払いは月末締め・翌月払い。',
    evidence: { kind: '納品書兼請求書', title: '納品書 兼 請求書', rows: [['発行者', '佐藤卸売'], ['日付', '20X6年4月8日'], ['品目', '商品一式'], ['金額', '¥70,000'], ['支払条件', '月末締め・翌月末払い']], note: '宛先：のりまき商事株式会社 御中' },
    analysis: [
      { t: '仕入（費用）が発生し、買掛金（負債）が増加した', ok: true },
      { t: '仕入（費用）が発生し、現金預金（資産）が減少した', diag: '代金はまだ支払っていません。掛け仕入では「後で支払う義務＝買掛金」という負債が増加します。' },
      { t: '備品（資産）が増加し、買掛金（負債）が増加した', diag: '販売目的で仕入れた商品は「仕入」（費用）で処理します（三分法）。備品は自社で使用する資産です。' }
    ],
    correct: { d: { acc: '501', amount: 70000 }, c: { acc: '201', amount: 70000, sub: '佐藤卸売' } },
    subKind: 'vendor', subLabel: '仕入先',
    traps: [
      { c: '101', msg: '支払いはまだ行われていません。掛け仕入の貸方は「支払義務＝買掛金」です。現金預金が動くのは実際に支払ったときです。' }
    ],
    memo: '佐藤卸売より商品掛仕入',
    impacts: [
      { label: '買掛金 補助元帳', detail: '佐藤卸売の残高 +70,000', view: 'sub' },
      { label: '総勘定元帳（仕入）', detail: '借方 +70,000', view: 'gl', acc: '501' },
      { label: '総勘定元帳（買掛金）', detail: '貸方 +70,000', view: 'gl', acc: '201' },
      { label: '試算表', detail: '仕入・買掛金が更新', view: 'tb' },
      { label: '貸借対照表', detail: '負債 +70,000', view: 'fs' },
      { label: '損益計算書', detail: '売上原価 +70,000 → 利益 −70,000', view: 'fs' }
    ],
    note: '費用の発生は利益を減らし、B/Sでは負債の増加として現れました。'
  },
  {
    id: 's4', order: 4, date: '4/20', title: '買掛金を支払う', level: '３級',
    story: '佐藤卸売への買掛金のうち50,000円を普通預金口座から振り込んで支払った。',
    evidence: { kind: '通帳明細', title: '普通預金 入出金明細', rows: [['日付', '20X6年4月20日'], ['摘要', 'フリコミ サトウオロシウリ'], ['出金額', '¥50,000'], ['取扱', '△△銀行 本店']], note: '' },
    analysis: [
      { t: '買掛金（負債）が減少し、現金預金（資産）が減少した', ok: true },
      { t: '仕入（費用）が発生し、現金預金（資産）が減少した', diag: '仕入はすでに4/8の受取時に計上済みです。支払時に再計上すると費用が二重になります。支払いは負債（買掛金）の消滅です。' },
      { t: '買掛金（負債）が増加し、現金預金（資産）が減少した', diag: '支払いによって支払義務はなくなるので、買掛金は減少します。負債の減少は借方に記録します。' }
    ],
    correct: { d: { acc: '201', amount: 50000, sub: '佐藤卸売' }, c: { acc: '101', amount: 50000 } },
    subKind: 'vendor', subLabel: '仕入先',
    traps: [
      { d: '501', msg: '費用（仕入）は4/8の掛け仕入時に計上済みです。支払時は負債（買掛金）の減少を借方に立てます。' }
    ],
    memo: '佐藤卸売へ買掛金支払（振込）',
    impacts: [
      { label: '買掛金 補助元帳', detail: '佐藤卸売の残高 −50,000（残 20,000）', view: 'sub' },
      { label: '総勘定元帳（買掛金）', detail: '借方 +50,000（残高減少）', view: 'gl', acc: '201' },
      { label: '総勘定元帳（現金預金）', detail: '貸方 +50,000（残高減少）', view: 'gl', acc: '101' },
      { label: '試算表', detail: '買掛金・現金預金が更新', view: 'tb' },
      { label: '貸借対照表', detail: '資産 −50,000／負債 −50,000', view: 'fs' },
      { label: '損益計算書', detail: '費用・利益は変化しない', view: 'fs' }
    ],
    note: '支払いでも利益は動きません。費用はすでに仕入時に認識済みだからです。'
  },
  {
    id: 's5', order: 5, date: '4/10', title: '備品を購入して使用を開始する', level: '３級',
    story: '業務用ノートPC（耐用年数5年・定額法）を240,000円で購入し、代金は普通預金から支払って同日から使用を開始した。',
    evidence: { kind: '領収書', title: '領収書', rows: [['宛先', 'のりまき商事株式会社 御中'], ['日付', '20X6年4月10日'], ['品目', '業務用ノートPC'], ['金額', '¥240,000'], ['支払方法', '振込']], note: '発行者：○○電機' },
    analysis: [
      { t: '備品（資産）が増加し、現金預金（資産）が減少した', ok: true },
      { t: '費用が発生し、現金預金（資産）が減少した', diag: 'PCは長期間使用して収益獲得に貢献するため、購入時は「備品」という資産です。費用化は使用に応じて減価償却で行います（費用と資産の区別）。' },
      { t: '仕入（費用）が発生し、現金預金（資産）が減少した', diag: '仕入は販売目的の商品に使う科目です。自社で使用するPCは「備品」（資産）で処理します。' }
    ],
    correct: { d: { acc: '150', amount: 240000, sub: '業務用ノートPC' }, c: { acc: '101', amount: 240000 } },
    subKind: 'asset', subLabel: '資産名',
    traps: [
      { d: '501', msg: '費用と資産の区別ができていません。長期使用する備品は購入時には資産で、使用に応じて減価償却により費用化します。' },
      { d: '502', msg: '購入時点では費用ではなく資産（備品）です。減価償却費は月末の決算整理で計上します。' },
      { d: '503', msg: '費用と資産の区別ができていません。PC本体は「備品」という資産です。' }
    ],
    memo: '業務用ノートPC購入（振込）',
    impacts: [
      { label: '固定資産台帳', detail: '業務用ノートPC 取得原価 240,000 を登録', view: 'sub' },
      { label: '総勘定元帳（備品）', detail: '借方 +240,000', view: 'gl', acc: '150' },
      { label: '総勘定元帳（現金預金）', detail: '貸方 +240,000（残高減少）', view: 'gl', acc: '101' },
      { label: '試算表', detail: '備品・現金預金が更新', view: 'tb' },
      { label: '貸借対照表', detail: '流動資産→固定資産へ振替（資産合計は不変）', view: 'fs' },
      { label: '損益計算書', detail: '購入時点では費用・利益は変化しない', view: 'fs' }
    ],
    note: '資産の購入は費用ではありません。費用化はこの後の減価償却で行います。'
  },
  {
    id: 's6', order: 6, date: '4/30', title: '月末に減価償却を計上する', level: '３級（月割計算）',
    story: '月次決算にあたり、4/10取得の備品（取得原価240,000円・耐用年数5年・定額法・残存価額ゼロ）について当月分の減価償却費を月割で計上する。240,000 ÷ 60か月 = 4,000円。間接法による。',
    evidence: { kind: '固定資産台帳（計算根拠）', title: '減価償却 計算メモ', rows: [['対象', '業務用ノートPC'], ['取得原価', '¥240,000'], ['償却方法', '定額法・耐用年数5年'], ['月割償却額', '240,000 ÷ 60 = ¥4,000'], ['記帳方法', '間接法（累計額勘定を使用）']], note: '' },
    analysis: [
      { t: '減価償却費（費用）が発生し、減価償却累計額（資産の控除）が増加した', ok: true },
      { t: '減価償却費（費用）が発生し、現金預金（資産）が減少した', diag: '減価償却は現金支出を伴わない費用です。すでに支払済みの取得原価を、使用期間に配分し直しているだけです。' },
      { t: '備品（資産）が増加し、減価償却費（費用）が発生した', diag: '減価償却は資産価値の減少を費用化する手続きです。備品が増えることはありません。' }
    ],
    correct: { d: { acc: '502', amount: 4000 }, c: { acc: '159', amount: 4000 } },
    calc: { title: '途中計算（月割償却額）', parts: [{ k: 'cost', label: '取得原価', ans: 240000 }, { k: 'months', label: '償却月数（5年×12か月）', ans: 60 }, { k: 'monthly', label: '月割償却額 ＝ 取得原価 ÷ 償却月数', ans: 4000 }] },
    subKind: null,
    traps: [
      { c: '150', msg: 'この教材では間接法を採用しています。備品勘定を直接減らさず、「減価償却累計額」という控除科目の貸方に計上します。' },
      { c: '101', msg: '減価償却は現金支出を伴いません。貸方は減価償却累計額です。' }
    ],
    memo: '当月分減価償却費計上（備品・月割）',
    impacts: [
      { label: '固定資産台帳', detail: '累計償却額 +4,000／帳簿価額 236,000', view: 'sub' },
      { label: '総勘定元帳（減価償却費）', detail: '借方 +4,000', view: 'gl', acc: '502' },
      { label: '総勘定元帳（減価償却累計額）', detail: '貸方 +4,000', view: 'gl', acc: '159' },
      { label: '試算表', detail: '減価償却費・累計額が更新', view: 'tb' },
      { label: '貸借対照表', detail: '固定資産の帳簿価額 −4,000', view: 'fs' },
      { label: '損益計算書', detail: '販管費 +4,000 → 利益 −4,000', view: 'fs' }
    ],
    note: '現金は1円も動いていないのに、費用と利益が動きました。これが発生主義の核心です。'
  },
  {
    id: 's7', order: 7, date: '4/30', title: '未払費用を決算整理で計上する', level: '３級（経過勘定）',
    story: '4月分のクラウド会計システム利用料12,000円は翌月5日払いの契約で、月末時点で未払いである。当月の費用として決算整理で計上する。',
    evidence: { kind: '利用明細', title: 'システム利用明細', rows: [['サービス', 'クラウド会計システム'], ['利用期間', '20X6年4月1日〜4月30日'], ['利用料', '¥12,000'], ['支払期日', '20X6年5月5日（口座振替）']], note: '4月末時点では未払い' },
    analysis: [
      { t: '支払手数料（費用）が発生し、未払費用（負債）が増加した', ok: true },
      { t: '支払手数料（費用）が発生し、現金預金（資産）が減少した', diag: '支払いは翌月5日です。月末時点ではまだ現金は動いていません。当月分の費用に対応する「支払義務」を未払費用（負債）として計上します。' },
      { t: '何も仕訳しない（支払時に費用計上する）', diag: '現金主義の考え方です。発生主義では、サービスの提供を受けた4月の費用として計上し、支払義務を負債に立てます。' }
    ],
    correct: { d: { acc: '503', amount: 12000 }, c: { acc: '210', amount: 12000 } },
    subKind: null,
    traps: [
      { c: '101', msg: '未払費用は現金支出を伴わない決算整理です。貸方は「未払費用」という負債です。' },
      { c: '201', msg: '買掛金は商品仕入の未払いに使う科目です。サービス利用料などの未払いは「未払費用」で区別します。' }
    ],
    memo: '4月分システム利用料 未払計上（決算整理）',
    impacts: [
      { label: '総勘定元帳（支払手数料）', detail: '借方 +12,000', view: 'gl', acc: '503' },
      { label: '総勘定元帳（未払費用）', detail: '貸方 +12,000', view: 'gl', acc: '210' },
      { label: '試算表', detail: '支払手数料・未払費用が更新', view: 'tb' },
      { label: '貸借対照表', detail: '負債 +12,000', view: 'fs' },
      { label: '損益計算書', detail: '販管費 +12,000 → 利益 −12,000', view: 'fs' }
    ],
    note: '現金の動きがない費用の計上は、発生主義決算の要です。残る決算整理（売上原価の算定・貸倒引当金）へ進みましょう。'
  },
  {
    id: 's8', order: 8, date: '4/25', title: '商品を販売し約束手形を受け取る', level: '３級',
    story: '山田商店へ商品を50,000円で販売し、代金として同店振出の約束手形（支払期日5月31日）を受け取った。',
    evidence: { kind: '約束手形', title: '約束手形', rows: [['振出人', '山田商店'], ['受取人', 'のりまき商事株式会社'], ['振出日', '20X6年4月25日'], ['支払期日', '20X6年5月31日'], ['金額', '¥50,000']], note: '' },
    analysis: [
      { t: '受取手形（資産）が増加し、売上（収益）が発生した', ok: true },
      { t: '売掛金（資産）が増加し、売上（収益）が発生した', diag: '約束手形を受け取った場合は「受取手形」という別の資産科目で管理します。売掛金は掛け（口約束）の債権です。' },
      { t: '現金預金（資産）が増加し、売上（収益）が発生した', diag: '手形はまだ現金化されていません。支払期日に決済されるまでは「受取手形」という債権です。' }
    ],
    correct: { d: { acc: '105', amount: 50000 }, c: { acc: '401', amount: 50000 } },
    subKind: null,
    traps: [
      { d: '110', msg: '手形で受け取った債権は売掛金ではなく「受取手形」で記録します。' },
      { d: '101', msg: '現金化は支払期日です。受け取った時点では「受取手形」という資産が増加します。' }
    ],
    memo: '山田商店へ商品販売・約束手形受取',
    impacts: [
      { label: '総勘定元帳（受取手形）', detail: '借方 +50,000', view: 'gl', acc: '105' },
      { label: '総勘定元帳（売上）', detail: '貸方 +50,000（累計 150,000）', view: 'gl', acc: '401' },
      { label: '試算表', detail: '受取手形・売上が更新', view: 'tb' },
      { label: '貸借対照表', detail: '資産合計 +50,000', view: 'fs' },
      { label: '損益計算書', detail: '売上高・利益 +50,000', view: 'fs' }
    ],
    note: '同じ「売る」でも、対価の形（現金・掛け・手形）によって借方の資産科目が変わります。収益の認識時点はどれも引渡し時です。'
  },
  {
    id: 's9', order: 9, date: '4/30', title: '売上原価を算定する（期末商品棚卸）', level: '３級（決算整理）',
    story: '月次決算にあたり期末商品棚卸を行ったところ、未販売の商品が20,000円分あった。三分法により、仕入勘定から繰越商品勘定へ振り替えて当月の売上原価を算定する（期首商品はゼロ）。',
    evidence: { kind: '棚卸表', title: '棚卸表', rows: [['実施日', '20X6年4月30日'], ['対象', '商品一式'], ['期首棚卸高', '¥0'], ['当月仕入高', '¥70,000'], ['期末棚卸高', '¥20,000']], note: '売上原価 ＝ 0 + 70,000 − 20,000 ＝ 50,000' },
    analysis: [
      { t: '繰越商品（資産）が増加し、仕入（費用）が減少した', ok: true },
      { t: '仕入（費用）が増加し、繰越商品（資産）が減少した', diag: '期首商品がゼロの当月は「しいれ→くりしょう」の振替のみです。売れ残った分だけ費用（仕入）を減らし、資産（繰越商品）へ振り替えます。' },
      { t: '売上（収益）が減少し、繰越商品（資産）が増加した', diag: '棚卸は収益には影響しません。当月に費用化すべき仕入額（売上原価）を確定させる手続きです。' }
    ],
    correct: { d: { acc: '120', amount: 20000 }, c: { acc: '501', amount: 20000 } },
    subKind: null,
    traps: [
      { c: '401', msg: '売上原価の算定は費用側（仕入）の調整です。収益（売上）は動きません。' }
    ],
    memo: '期末商品棚卸高の振替（売上原価算定）',
    impacts: [
      { label: '総勘定元帳（繰越商品）', detail: '借方 +20,000', view: 'gl', acc: '120' },
      { label: '総勘定元帳（仕入）', detail: '貸方 +20,000（残高 50,000 ＝ 売上原価）', view: 'gl', acc: '501' },
      { label: '試算表', detail: '繰越商品・仕入が更新', view: 'tb' },
      { label: '貸借対照表', detail: '商品 +20,000', view: 'fs' },
      { label: '損益計算書', detail: '売上原価確定 → 利益 +20,000', view: 'fs' }
    ],
    note: '費用になるのは「売れた分の仕入」だけ。売れ残りは資産（商品）としてB/Sに残ります。'
  },
  {
    id: 's10', order: 10, date: '4/30', title: '貸倒引当金を設定する', level: '３級（決算整理）',
    story: '月次決算にあたり、期末売掛金残高40,000円に対して2%の貸倒れを見積もり、差額補充法により貸倒引当金を設定する（設定前残高はゼロ）。',
    evidence: { kind: '計算メモ', title: '貸倒引当金 計算メモ', rows: [['期末売掛金残高', '¥40,000'], ['見積率', '2%'], ['必要額', '40,000 × 2% ＝ ¥800'], ['設定前残高', '¥0'], ['繰入額', '¥800']], note: '本教材では売掛金のみを対象とします' },
    analysis: [
      { t: '貸倒引当金繰入（費用）が発生し、貸倒引当金（資産の控除）が増加した', ok: true },
      { t: '貸倒引当金繰入（費用）が発生し、売掛金（資産）が減少した', diag: 'まだ貸倒れは発生していません。売掛金を直接減らさず、「貸倒引当金」という控除科目で見積額を計上します。' },
      { t: '貸倒引当金（資産の控除）が増加し、現金預金（資産）が減少した', diag: '引当金の設定は現金支出を伴いません。見積費用（繰入）と控除科目のペアで記録します。' }
    ],
    correct: { d: { acc: '504', amount: 800 }, c: { acc: '111', amount: 800 } },
    calc: { title: '途中計算（繰入額・差額補充法）', parts: [{ k: 'base', label: '期末売掛金残高', ans: 40000 }, { k: 'rate', label: '見積率（%）', ans: 2 }, { k: 'amount', label: '繰入額 ＝ 残高 × 率 − 設定前残高', ans: 800 }] },
    subKind: null,
    traps: [
      { c: '110', msg: '見積段階では売掛金を直接減らしません。回収不能が確定したときに初めて売掛金を減らします。' },
      { c: '101', msg: '引当金の設定は現金支出を伴わない決算整理です。' }
    ],
    memo: '貸倒引当金繰入（差額補充法・2%）',
    impacts: [
      { label: '総勘定元帳（貸倒引当金繰入）', detail: '借方 +800', view: 'gl', acc: '504' },
      { label: '総勘定元帳（貸倒引当金）', detail: '貸方 +800', view: 'gl', acc: '111' },
      { label: '試算表', detail: '繰入・引当金が更新', view: 'tb' },
      { label: '貸借対照表', detail: '売掛金の評価 −800', view: 'fs' },
      { label: '損益計算書', detail: '販管費 +800 → 利益 −800', view: 'fs' }
    ],
    note: 'これで月次決算が完了しました。試算表と財務諸表で1か月の全体像を確認しましょう。'
  },
  {
    id: 's11', order: 11, date: '5/5', title: '前月の未払費用を支払う', level: '３級（経過勘定）',
    story: '4月末に未払計上したクラウド会計システム利用料12,000円が、5月5日に普通預金口座から引き落とされた。',
    evidence: { kind: '通帳明細', title: '普通預金 入出金明細', rows: [['日付', '20X6年5月5日'], ['摘要', 'カイケイシステム リヨウリョウ'], ['出金額', '¥12,000']], note: '4月分利用料（4/30に未払費用計上済み）' },
    analysis: [
      { t: '未払費用（負債）が減少し、現金預金（資産）が減少した', ok: true },
      { t: '支払手数料（費用）が発生し、現金預金（資産）が減少した', diag: '費用は4月の決算整理（4/30）で計上済みです。支払時に再計上すると費用が二重になります。支払いは負債（未払費用）の消滅です。' },
      { t: '未払費用（負債）が増加し、現金預金（資産）が減少した', diag: '支払いによって支払義務は消滅するので、未払費用は減少します。負債の減少は借方です。' }
    ],
    correct: { d: { acc: '210', amount: 12000 }, c: { acc: '101', amount: 12000 } },
    subKind: null,
    traps: [{ d: '503', msg: '費用は前月の決算整理で計上済みです。支払時は負債（未払費用）の減少を借方に立てます。' }],
    memo: '4月分システム利用料の支払（未払費用の消滅）',
    impacts: [
      { label: '総勘定元帳（未払費用）', detail: '借方 +12,000（残高 0）', view: 'gl', acc: '210' },
      { label: '総勘定元帳（現金預金）', detail: '貸方 +12,000（残高減少）', view: 'gl', acc: '101' },
      { label: '損益計算書', detail: '費用・利益は変化しない', view: 'fs' }
    ],
    note: '前月に費用計上した支払いでは利益は動きません。買掛金の支払（4/20）と同じ構造です。'
  },
  {
    id: 's12', order: 12, date: '5/2', title: '前月の買掛金残高を支払う', level: '３級',
    story: '佐藤卸売への買掛金の残高20,000円を普通預金口座から振り込んで支払った。',
    evidence: { kind: '通帳明細', title: '普通預金 入出金明細', rows: [['日付', '20X6年5月2日'], ['摘要', 'フリコミ サトウオロシウリ'], ['出金額', '¥20,000']], note: '' },
    analysis: [
      { t: '買掛金（負債）が減少し、現金預金（資産）が減少した', ok: true },
      { t: '仕入（費用）が発生し、現金預金（資産）が減少した', diag: '仕入は4月の掛け仕入時に計上済みです。支払いは負債（買掛金）の消滅です。' },
      { t: '売掛金（資産）が減少し、現金預金（資産）が減少した', diag: '売掛金は当社が受け取る側の債権です。仕入代金の未払いは買掛金（負債）です。' }
    ],
    correct: { d: { acc: '201', amount: 20000, sub: '佐藤卸売' }, c: { acc: '101', amount: 20000 } },
    subKind: 'vendor', subLabel: '仕入先',
    traps: [{ d: '501', msg: '費用（仕入）は4/8に計上済みです。支払時は買掛金の減少を借方に立てます。' }],
    memo: '佐藤卸売へ買掛金残高支払（振込）',
    impacts: [
      { label: '買掛金 補助元帳', detail: '佐藤卸売の残高 −20,000（残 0）', view: 'sub' },
      { label: '総勘定元帳（買掛金）', detail: '借方 +20,000', view: 'gl', acc: '201' },
      { label: '試算表', detail: '買掛金・現金預金が更新', view: 'tb' }
    ],
    note: '前月分の債務を完済しました。補助元帳の佐藤卸売残高がゼロになったことを確認しましょう。'
  },
  {
    id: 's13', order: 13, date: '5/7', title: '商品を掛けで仕入れる（2か月目）', level: '３級',
    story: '佐藤卸売から商品90,000円を掛けで仕入れ、商品を受け取った。支払いは月末締め・翌月払い。',
    evidence: { kind: '納品書兼請求書', title: '納品書 兼 請求書', rows: [['発行者', '佐藤卸売'], ['日付', '20X6年5月7日'], ['品目', '商品一式'], ['金額', '¥90,000'], ['支払条件', '月末締め・翌月末払い']], note: '宛先：のりまき商事株式会社 御中' },
    analysis: [
      { t: '仕入（費用）が発生し、買掛金（負債）が増加した', ok: true },
      { t: '繰越商品（資産）が増加し、買掛金（負債）が増加した', diag: '三分法では期中の仕入は「仕入」（費用）で処理します。繰越商品は決算整理でのみ使う科目です。' },
      { t: '仕入（費用）が発生し、現金預金（資産）が減少した', diag: '代金はまだ支払っていません。掛け仕入の貸方は買掛金（負債）です。' }
    ],
    correct: { d: { acc: '501', amount: 90000 }, c: { acc: '201', amount: 90000, sub: '佐藤卸売' } },
    subKind: 'vendor', subLabel: '仕入先',
    traps: [{ d: '120', msg: '三分法では期中の商品仕入はすべて「仕入」勘定です。繰越商品を動かすのは決算整理のときだけです。' }],
    memo: '佐藤卸売より商品掛仕入（5月分）',
    impacts: [
      { label: '買掛金 補助元帳', detail: '佐藤卸売の残高 +90,000', view: 'sub' },
      { label: '総勘定元帳（仕入）', detail: '借方 +90,000', view: 'gl', acc: '501' },
      { label: '試算表', detail: '仕入・買掛金が更新', view: 'tb' }
    ],
    note: '4月と同じ構造の取引です。迷わず切れるようになれば定着しています。'
  },
  {
    id: 's14', order: 14, date: '5/10', title: '商品を掛けで販売する（2か月目）', level: '３級',
    story: '山田商店へ商品を140,000円で販売し、商品を引き渡した。代金は月末締め・翌月払いの掛けとした。',
    evidence: { kind: '請求書（控）', title: '御請求書', rows: [['宛先', '山田商店 御中'], ['発行日', '20X6年5月10日'], ['品目', '商品一式'], ['金額', '¥140,000'], ['支払条件', '月末締め・翌月末払い']], note: '発行者：のりまき商事株式会社' },
    analysis: [
      { t: '売掛金（資産）が増加し、売上（収益）が発生した', ok: true },
      { t: '現金預金（資産）が増加し、売上（収益）が発生した', diag: '代金はまだ受け取っていません。未回収の代金は売掛金（資産）です。' },
      { t: '売掛金（資産）が増加し、繰越商品（資産）が減少した', diag: '三分法では販売時に商品勘定を動かしません。相手科目は収益（売上）です。売上原価は月末にまとめて算定します。' }
    ],
    correct: { d: { acc: '110', amount: 140000, sub: '山田商店' }, c: { acc: '401', amount: 140000 } },
    subKind: 'customer', subLabel: '得意先',
    traps: [{ c: '120', msg: '三分法では販売のつど商品を減らしません。貸方は売上（収益）です。' }],
    memo: '山田商店へ商品掛売上（5月分）',
    impacts: [
      { label: '売掛金 補助元帳', detail: '山田商店の残高 +140,000', view: 'sub' },
      { label: '総勘定元帳（売上）', detail: '貸方 +140,000', view: 'gl', acc: '401' },
      { label: '損益計算書', detail: '売上高・利益 +140,000', view: 'fs' }
    ],
    note: '売上は2か月累計でP/Lに積み上がります。総勘定元帳で4月分と5月分が並ぶのを確認しましょう。'
  },
  {
    id: 's15', order: 15, date: '5/31', title: '約束手形が決済され入金される', level: '３級',
    story: '4/25に受け取った山田商店振出の約束手形50,000円が支払期日を迎え、当座の口座へ入金された。',
    evidence: { kind: '通帳明細', title: '普通預金 入出金明細', rows: [['日付', '20X6年5月31日'], ['摘要', 'テガタケッサイ ヤマダショウテン'], ['入金額', '¥50,000']], note: '約束手形（4/25受取・期日5/31）の決済' },
    analysis: [
      { t: '現金預金（資産）が増加し、受取手形（資産）が減少した', ok: true },
      { t: '現金預金（資産）が増加し、売上（収益）が発生した', diag: '売上は4/25の引渡し時に計上済みです。決済は債権の形が「受取手形→現金預金」に変わるだけです。' },
      { t: '現金預金（資産）が増加し、売掛金（資産）が減少した', diag: '手形で受け取った債権は「受取手形」で管理しています。売掛金ではありません。' }
    ],
    correct: { d: { acc: '101', amount: 50000 }, c: { acc: '105', amount: 50000 } },
    subKind: null,
    traps: [{ c: '401', msg: '収益は引渡し時に認識済みです。手形の決済で売上を再計上すると二重計上になります。' }],
    memo: '約束手形決済入金（山田商店）',
    impacts: [
      { label: '総勘定元帳（受取手形）', detail: '貸方 +50,000（残高 0）', view: 'gl', acc: '105' },
      { label: '総勘定元帳（現金預金）', detail: '借方 +50,000', view: 'gl', acc: '101' },
      { label: '損益計算書', detail: '売上・利益は変化しない', view: 'fs' }
    ],
    note: '手形の一生（受取→決済）が完結しました。どの時点でも収益は動いていません。'
  },
  {
    id: 's16', order: 16, date: '5/18', title: '売掛金を回収する（2か月目）', level: '３級',
    story: '山田商店から売掛金のうち80,000円が普通預金口座へ振り込まれた。',
    evidence: { kind: '通帳明細', title: '普通預金 入出金明細', rows: [['日付', '20X6年5月18日'], ['摘要', 'フリコミ ヤマダショウテン'], ['入金額', '¥80,000']], note: '' },
    analysis: [
      { t: '現金預金（資産）が増加し、売掛金（資産）が減少した', ok: true },
      { t: '現金預金（資産）が増加し、売上（収益）が発生した', diag: '売上は引渡し時に計上済みです。回収は資産の形が変わるだけです。' },
      { t: '現金預金（資産）が増加し、受取手形（資産）が減少した', diag: '振込による回収は売掛金の回収です。受取手形は手形債権の決済にだけ使います。' }
    ],
    correct: { d: { acc: '101', amount: 80000 }, c: { acc: '110', amount: 80000, sub: '山田商店' } },
    subKind: 'customer', subLabel: '得意先',
    traps: [{ c: '401', msg: '回収時に売上を再計上すると収益が二重になります。貸方は売掛金です。' }],
    memo: '山田商店より売掛金回収（5月・振込）',
    impacts: [
      { label: '売掛金 補助元帳', detail: '山田商店の残高 −80,000', view: 'sub' },
      { label: '総勘定元帳（売掛金）', detail: '貸方 +80,000', view: 'gl', acc: '110' },
      { label: '試算表', detail: '現金預金・売掛金が更新', view: 'tb' }
    ],
    note: '4/15と同じ構造です。売掛金の補助元帳で発生と回収の対応を確認しましょう。'
  },
  {
    id: 's17', order: 17, date: '5/20', title: '前期売掛金の貸倒れに引当金を充当する', level: '３級（応用）',
    story: '山田商店に対する4月発生の売掛金のうち600円が回収不能と確定した。貸倒引当金の残高は800円である。',
    evidence: { kind: '社内メモ', title: '債権管理メモ', rows: [['対象', '山田商店 売掛金（4月発生分）'], ['回収不能額', '¥600'], ['貸倒引当金残高', '¥800'], ['判断', '全額を引当金で充当']], note: '' },
    analysis: [
      { t: '貸倒引当金（資産の控除）が減少し、売掛金（資産）が減少した', ok: true },
      { t: '貸倒引当金繰入（費用）が発生し、売掛金（資産）が減少した', diag: '繰入は決算で見積もるときの科目です。貸倒れの発生時は、設定済みの引当金を取り崩して充当します。' },
      { t: '貸倒損失（費用）が発生し、売掛金（資産）が減少した', diag: '引当金の残高800円が回収不能額600円を上回っているため、全額を引当金で充当でき、費用は発生しません。' }
    ],
    correct: { d: { acc: '111', amount: 600 }, c: { acc: '110', amount: 600, sub: '山田商店' } },
    subKind: 'customer', subLabel: '得意先',
    traps: [{ d: '504', msg: '発生時は繰入ではなく、まず引当金を取り崩します。' }],
    memo: '売掛金貸倒れ・引当金充当（山田商店）',
    impacts: [
      { label: '売掛金 補助元帳', detail: '山田商店の残高 −600', view: 'sub' },
      { label: '総勘定元帳（貸倒引当金）', detail: '借方 +600（残 200）', view: 'gl', acc: '111' },
      { label: '損益計算書', detail: '引当金の範囲内なので費用・利益は不変', view: 'fs' }
    ],
    note: '前月末に見積もった引当金が実際に機能した場面です。見積り→充当の流れが引当金の本質です。'
  },
  {
    id: 's18', order: 18, date: '5/31', title: '月末に減価償却を計上する（2か月目）', level: '３級（月割計算）',
    story: '月次決算にあたり、備品（取得原価240,000円・耐用年数5年・定額法）について5月分の減価償却費を月割で計上する。間接法による。',
    evidence: { kind: '固定資産台帳（計算根拠）', title: '減価償却 計算メモ', rows: [['対象', '業務用ノートPC'], ['取得原価', '¥240,000'], ['月割償却額', '240,000 ÷ 60 = ¥4,000'], ['記帳方法', '間接法']], note: '' },
    analysis: [
      { t: '減価償却費（費用）が発生し、減価償却累計額（資産の控除）が増加した', ok: true },
      { t: '減価償却費（費用）が発生し、備品（資産）が減少した', diag: '間接法では備品勘定を直接減らさず、累計額勘定に積み上げます。' },
      { t: '減価償却費（費用）が発生し、現金預金（資産）が減少した', diag: '減価償却は現金支出を伴わない費用です。' }
    ],
    correct: { d: { acc: '502', amount: 4000 }, c: { acc: '159', amount: 4000 } },
    calc: { title: '途中計算（月割償却額）', parts: [{ k: 'cost', label: '取得原価', ans: 240000 }, { k: 'months', label: '償却月数（5年×12か月）', ans: 60 }, { k: 'monthly', label: '月割償却額 ＝ 取得原価 ÷ 償却月数', ans: 4000 }] },
    subKind: null,
    traps: [{ c: '150', msg: '間接法では累計額勘定を使います。備品勘定は取得原価のまま残します。' }],
    memo: '5月分減価償却費計上（備品・月割）',
    impacts: [
      { label: '固定資産台帳', detail: '累計償却額 8,000／帳簿価額 232,000', view: 'sub' },
      { label: '総勘定元帳（減価償却累計額）', detail: '貸方 +4,000（累計 8,000）', view: 'gl', acc: '159' },
      { label: '損益計算書', detail: '販管費 +4,000 → 利益 −4,000', view: 'fs' }
    ],
    note: '毎月同じ償却を積み重ねることで、累計額が資産の使用実績を表していきます。'
  },
  {
    id: 's19', order: 19, date: '5/31', title: '売上原価の算定①（期首商品の振替）', level: '３級（決算整理）',
    story: '月次決算にあたり売上原価を算定する。まず、月初商品棚卸高20,000円（4月末の繰越商品）を仕入勘定へ振り替える。',
    evidence: { kind: '棚卸表', title: '棚卸表（5月）', rows: [['月初棚卸高', '¥20,000'], ['当月仕入高', '¥90,000'], ['月末棚卸高', '¥25,000']], note: '売上原価 ＝ 20,000 + 90,000 − 25,000 ＝ 85,000' },
    analysis: [
      { t: '仕入（費用）が増加し、繰越商品（資産）が減少した', ok: true },
      { t: '繰越商品（資産）が増加し、仕入（費用）が減少した', diag: 'それは月末商品の振替（②）です。まず月初の在庫を費用側（仕入）へ戻します。「しーくりくりしー」の前半です。' },
      { t: '売上原価（費用）が発生し、売上（収益）が減少した', diag: '三分法では売上原価を仕入勘定の中で算定します。収益（売上）は動きません。' }
    ],
    correct: { d: { acc: '501', amount: 20000 }, c: { acc: '120', amount: 20000 } },
    subKind: null,
    traps: [{ d: '120', msg: '向きが逆です。期首（月初）分は「仕入／繰越商品」。月末分だけが「繰越商品／仕入」です。' }],
    memo: '月初商品棚卸高の振替（売上原価算定①）',
    impacts: [
      { label: '総勘定元帳（仕入）', detail: '借方 +20,000', view: 'gl', acc: '501' },
      { label: '総勘定元帳（繰越商品）', detail: '貸方 +20,000（残高 0）', view: 'gl', acc: '120' },
      { label: '試算表', detail: '仕入・繰越商品が更新', view: 'tb' }
    ],
    note: '「しーくり・くりしー」の前半です。月初の在庫も当月に売れた可能性があるため、いったん費用側へ集めます。'
  },
  {
    id: 's20', order: 20, date: '5/31', title: '売上原価の算定②（月末商品の振替）', level: '３級（決算整理）',
    story: '続いて、月末商品棚卸高25,000円を仕入勘定から繰越商品勘定へ振り替え、5月の売上原価を確定させる。',
    evidence: { kind: '棚卸表', title: '棚卸表（5月）', rows: [['月初棚卸高', '¥20,000'], ['当月仕入高', '¥90,000'], ['月末棚卸高', '¥25,000']], note: '売上原価 ＝ 20,000 + 90,000 − 25,000 ＝ 85,000' },
    analysis: [
      { t: '繰越商品（資産）が増加し、仕入（費用）が減少した', ok: true },
      { t: '仕入（費用）が増加し、繰越商品（資産）が減少した', diag: 'それは①（期首分）の振替です。月末に残った在庫は費用から除き、資産（繰越商品）へ振り替えます。' },
      { t: '繰越商品（資産）が増加し、売上（収益）が発生した', diag: '棚卸は収益に影響しません。費用（仕入）の調整です。' }
    ],
    correct: { d: { acc: '120', amount: 25000 }, c: { acc: '501', amount: 25000 } },
    calc: { title: '途中計算（売上原価）', parts: [{ k: 'begin', label: '月初商品棚卸高', ans: 20000 }, { k: 'buy', label: '当月仕入高', ans: 90000 }, { k: 'cogs', label: '売上原価 ＝ 月初 + 仕入 − 月末', ans: 85000 }] },
    subKind: null,
    traps: [{ c: '401', msg: '売上原価の算定は費用側の調整です。売上は動きません。' }],
    memo: '月末商品棚卸高の振替（売上原価算定②）',
    impacts: [
      { label: '総勘定元帳（繰越商品）', detail: '借方 +25,000', view: 'gl', acc: '120' },
      { label: '総勘定元帳（仕入）', detail: '貸方 +25,000（5月売上原価 85,000）', view: 'gl', acc: '501' },
      { label: '損益計算書', detail: '売上原価確定 → 利益が動く', view: 'fs' }
    ],
    note: '2か月目の月次決算が完了しました。財務諸表で2か月分の積み上がりを確認しましょう。'
  }
];
export const SCN: Record<string, Scenario> = {};
SCENARIOS.forEach(s => (SCN[s.id] = s));

/* ---------- 導出（すべて posted の JournalLine から） ---------- */
const dnum = (d: string): number => { const [m, day] = d.split('/').map(Number); return m * 100 + day; };
export const posted = (entries: Entry[]): Entry[] => entries.filter(e => e.status === 'posted');
export const sorted = (entries: Entry[]): Entry[] => entries.slice().sort((a, b) => dnum(a.date) - dnum(b.date) || ((a.no || '') > (b.no || '') ? 1 : -1));

export function balance(entries: Entry[], code: string): number { // D−C（借方プラス）
  let v = 0;
  posted(entries).forEach(e => e.lines.forEach(l => { if (l.acc === code) v += l.side === 'D' ? l.amount : -l.amount; }));
  return v;
}
export function ledger(entries: Entry[], code: string): LedgerRow[] {
  const a = ACC[code]; const rows: LedgerRow[] = []; let bal = 0;
  sorted(posted(entries)).forEach(e => e.lines.forEach(l => {
    if (l.acc !== code) return;
    bal += (l.side === a.normal ? l.amount : -l.amount);
    const other = e.lines.find(x => x !== l);
    rows.push({ date: e.date, no: e.no, memo: e.memo, counter: other ? ACC[other.acc].name : '諸口', debit: l.side === 'D' ? l.amount : 0, credit: l.side === 'C' ? l.amount : 0, balance: bal, entryId: e.id, scenarioId: e.scenarioId });
  }));
  return rows;
}
export function trialBalance(entries: Entry[]): TrialBalance {
  const rows: TrialBalanceRow[] = [];
  ACCOUNTS.forEach(a => {
    let oD = 0, oC = 0, pD = 0, pC = 0;
    posted(entries).forEach(e => e.lines.forEach(l => {
      if (l.acc !== a.code) return;
      if (e.opening) { l.side === 'D' ? (oD += l.amount) : (oC += l.amount); }
      else { l.side === 'D' ? (pD += l.amount) : (pC += l.amount); }
    }));
    if (oD || oC || pD || pC) {
      const net = oD - oC + pD - pC;
      rows.push({ code: a.code, name: a.name, cat: a.cat, oD, oC, pD, pC, cD: net > 0 ? net : 0, cC: net < 0 ? -net : 0 });
    }
  });
  const tot = rows.reduce((t, r) => ({ oD: t.oD + r.oD, oC: t.oC + r.oC, pD: t.pD + r.pD, pC: t.pC + r.pC, cD: t.cD + r.cD, cC: t.cC + r.cC }), { oD: 0, oC: 0, pD: 0, pC: 0, cD: 0, cC: 0 });
  return { rows, tot, balanced: tot.cD === tot.cC && tot.oD === tot.oC && tot.pD === tot.pC };
}
export function profit(entries: Entry[]): ProfitResult {
  let rev = 0, exp = 0;
  posted(entries).forEach(e => e.lines.forEach(l => {
    const a = ACC[l.acc];
    if (a.cat === '収益') rev += l.side === 'C' ? l.amount : -l.amount;
    if (a.cat === '費用') exp += l.side === 'D' ? l.amount : -l.amount;
  }));
  return { rev, exp, profit: rev - exp };
}
export function balanceSheet(entries: Entry[]): BalanceSheet {
  const b = (c: string) => balance(entries, c);
  const p = profit(entries).profit;
  const assets = [
    { sec: '流動資産', name: '現金預金', code: '101', v: b('101') },
    { sec: '流動資産', name: '受取手形', code: '105', v: b('105') },
    { sec: '流動資産', name: '売掛金', code: '110', v: b('110') },
    { sec: '流動資産', name: '貸倒引当金', code: '111', v: b('111'), contra: true },
    { sec: '流動資産', name: '商品', code: '120', v: b('120') },
    { sec: '固定資産', name: '備品', code: '150', v: b('150') },
    { sec: '固定資産', name: '減価償却累計額', code: '159', v: b('159'), contra: true }
  ].filter(r => r.v !== 0);
  const liab = [
    { sec: '流動負債', name: '買掛金', code: '201', v: -b('201') },
    { sec: '流動負債', name: '未払費用', code: '210', v: -b('210') }
  ].filter(r => r.v !== 0);
  const equity = [
    { sec: '純資産', name: '資本金', code: '301', v: -b('301') },
    { sec: '純資産', name: '当期純利益', code: 'PL', v: p }
  ].filter(r => r.v !== 0 || r.code === 'PL');
  const sum = (a: BsRow[]) => a.reduce((t, r) => t + r.v, 0);
  return { assets, liab, equity, totalAssets: sum(assets), totalLE: sum(liab) + sum(equity) };
}
export function profitLoss(entries: Entry[]): ProfitLoss {
  const b = (c: string) => balance(entries, c);
  const sales = -b('401'), cogs = b('501'), dep = b('502'), fee = b('503'), allow = b('504');
  return {
    rows: [
      { name: '売上高', code: '401', v: sales },
      { name: '売上原価', code: '501', v: cogs, minus: true },
      { name: '売上総利益', v: sales - cogs, total: true },
      { name: '減価償却費', code: '502', v: dep, minus: true },
      { name: '支払手数料', code: '503', v: fee, minus: true },
      { name: '貸倒引当金繰入', code: '504', v: allow, minus: true },
      { name: '当期純利益', v: sales - cogs - dep - fee - allow, total: true, grand: true }
    ],
    profit: sales - cogs - dep - fee - allow
  };
}
export function subLedger(entries: Entry[], code: string, names: string[]): SubLedgerRow[] {
  return names.map(n => {
    let d = 0, c = 0;
    posted(entries).forEach(e => e.lines.forEach(l => { if (l.acc === code && l.sub === n) { l.side === 'D' ? (d += l.amount) : (c += l.amount); } }));
    return { name: n, debit: d, credit: c, balance: ACC[code].normal === 'D' ? d - c : c - d };
  }).filter(r => r.debit || r.credit);
}
export function fixedAssets(entries: Entry[]): FixedAssetRow[] {
  const cost = balance(entries, '150');
  if (!cost) return [];
  const accDep = -balance(entries, '159');
  return [{ name: '業務用ノートPC', date: '4/10', method: '定額法・5年', cost, accDep, monthly: 4000, book: cost - accDep }];
}
export function metrics(entries: Entry[]): Metrics {
  return { cash: balance(entries, '101'), ar: balance(entries, '110'), ap: -balance(entries, '201'), profit: profit(entries).profit };
}
export function traceSources(entries: Entry[], code: string): string[] {
  return sorted(posted(entries)).filter(e => e.lines.some(l => l.acc === code)).map(e => e.id);
}
export function entryFromScenario(s: Scenario, id: string, status?: EntryStatus): Entry {
  const lines: JournalLine[] = [];
  lines.push({ acc: s.correct.d.acc, side: 'D', amount: s.correct.d.amount, sub: s.correct.d.sub || null });
  lines.push({ acc: s.correct.c.acc, side: 'C', amount: s.correct.c.amount, sub: s.correct.c.sub || null });
  return { id, no: null, date: s.date, memo: s.memo, scenarioId: s.id, status: status || 'draft', lines };
}
export function entryBalanced(e: Entry): boolean {
  const d = e.lines.filter(l => l.side === 'D').reduce((t, l) => t + l.amount, 0);
  const c = e.lines.filter(l => l.side === 'C').reduce((t, l) => t + l.amount, 0);
  return d === c && d > 0;
}

/* ---------- 判定と診断 ---------- */
export function validate(s: Scenario, ans: EntryForm): ValidateResult {
  const diag: string[] = [];
  const dAmt = parseInt(String(ans.dAmt).replace(/[,，¥\s]/g, ''), 10);
  const cAmt = parseInt(String(ans.cAmt).replace(/[,，¥\s]/g, ''), 10);
  if (!ans.dAcc || !ans.cAcc || !dAmt || !cAmt) {
    return { correct: false, diagnoses: ['借方・貸方それぞれの科目と金額をすべて入力してください。'] };
  }
  if (dAmt !== cAmt) diag.push('借方合計と貸方合計が一致していません。複式簿記ではすべての仕訳で貸借が必ず一致します（貸借平均の原理）。');
  const c = s.correct;
  if (ans.dAcc === c.c.acc && ans.cAcc === c.d.acc) {
    diag.push('借方と貸方が逆になっています。資産・費用の増加は借方、負債・純資産・収益の増加は貸方に記録します（減少はその逆側）。');
  } else {
    (s.traps || []).forEach(t => {
      if ((t.d && ans.dAcc === t.d) || (t.c && ans.cAcc === t.c)) diag.push(t.msg);
    });
    if (ans.dAcc !== c.d.acc && !diag.length) diag.push('借方の科目が正しくありません。この取引で借方に立つのは「' + ACC[c.d.acc].cat + '」に属する科目です。何が増加（または減少）したかをもう一度分析しましょう。');
    if (ans.cAcc !== c.c.acc && !diag.length) diag.push('貸方の科目が正しくありません。この取引で貸方に立つのは「' + ACC[c.c.acc].cat + '」に属する科目です。');
  }
  const accountsOk = ans.dAcc === c.d.acc && ans.cAcc === c.c.acc;
  if (accountsOk && dAmt === cAmt && dAmt !== c.d.amount) diag.push('科目は正しいですが、金額が証憑と一致していません。証憑の金額をもう一度確認してください。');
  const needSub = c.d.sub || c.c.sub;
  if (accountsOk && dAmt === c.d.amount && cAmt === c.c.amount && needSub && ans.sub !== needSub) {
    diag.push('補助科目（' + s.subLabel + '）が不足しています。売掛金・買掛金・固定資産は相手先や対象を補助元帳で管理するため、必ず指定します。');
  }
  const correct = accountsOk && dAmt === c.d.amount && cAmt === c.c.amount && (!needSub || ans.sub === needSub);
  return { correct, diagnoses: correct ? [] : diag };
}

/* ---------- セルフテスト ---------- */
export function runTests(): SelfTest[] {
  const T: SelfTest[] = [];
  const t = (name: string, fn: () => boolean) => { try { const r = fn(); T.push({ name, pass: !!r }); } catch (e) { T.push({ name, pass: false, err: String(e) }); } };
  const fresh = () => openingEntries();
  const postS = (es: Entry[], sid: string) => { es.push(entryFromScenario(SCN[sid], 'test-' + sid, 'posted')); return es; };
  let es = fresh(); postS(es, 's1');
  t('掛売上の登録で売掛金と売上が増加する', () => balance(es, '110') === 100000 && -balance(es, '401') === 100000);
  const profitBefore = profit(es).profit;
  postS(es, 's2');
  t('売掛金回収で現金が増加し売掛金が減少する', () => balance(es, '101') === 1060000 && balance(es, '110') === 40000);
  t('回収時に売上と利益が変化しない', () => profit(es).profit === profitBefore && -balance(es, '401') === 100000);
  postS(es, 's3'); postS(es, 's4'); postS(es, 's5'); postS(es, 's6'); postS(es, 's7');
  t('減価償却で減価償却費と累計額が増加する', () => balance(es, '502') === 4000 && -balance(es, '159') === 4000);
  t('全posted仕訳で借方合計と貸方合計が一致する', () => posted(es).every(entryBalanced));
  t('試算表の借方合計と貸方合計が一致する', () => trialBalance(es).balanced);
  t('財務諸表の金額から元の仕訳まで追跡できる', () => {
    const ids = traceSources(es, '401');
    return ids.length === 1 && es.find(e => e.id === ids[0])!.scenarioId === 's1' && !!SCN['s1'].evidence;
  });
  t('draft仕訳は帳簿へ反映されない', () => {
    const es2 = fresh(); es2.push(entryFromScenario(SCN['s1'], 'd1', 'draft'));
    return balance(es2, '110') === 0 && trialBalance(es2).rows.length === 2;
  });
  t('保存データから正しく復元できる', () => {
    const snap = { entries: es, completed: ['s1'], attempts: { s1: 2 } };
    const back = JSON.parse(JSON.stringify(snap));
    return JSON.stringify(back) === JSON.stringify(snap) && balance(back.entries, '101') === balance(es, '101');
  });
  return T;
}

/* ---------- 論点別ドリル（判定のみ・帳簿には登録しない） ---------- */
export const DRILL_ACCOUNTS: DrillAccount[] = [
  { code: '106', name: '電子記録債権', cat: '資産' },
  { code: '121', name: '前払費用', cat: '資産' },
  { code: '122', name: '未収収益', cat: '資産' },
  { code: '123', name: '未収入金', cat: '資産' },
  { code: '130', name: '現金過不足', cat: 'その他（仮勘定）' },
  { code: '140', name: '貸付金', cat: '資産' },
  { code: '151', name: '土地', cat: '資産' },
  { code: '202', name: '電子記録債務', cat: '負債' },
  { code: '211', name: '当座借越', cat: '負債' },
  { code: '212', name: '前受収益', cat: '負債' },
  { code: '220', name: '借入金', cat: '負債' },
  { code: '410', name: '受取地代', cat: '収益' },
  { code: '411', name: '受取利息', cat: '収益' },
  { code: '412', name: '雑益', cat: '収益' },
  { code: '413', name: '固定資産売却益', cat: '収益' },
  { code: '510', name: '通信費', cat: '費用' },
  { code: '511', name: '支払家賃', cat: '費用' },
  { code: '512', name: '支払利息', cat: '費用' },
  { code: '513', name: '雑損', cat: '費用' },
  { code: '514', name: '固定資産売却損', cat: '費用' },
  { code: '414', name: '貸倒引当金戻入', cat: '収益' },
  { code: '515', name: '貸倒損失', cat: '費用' },
  { code: '107', name: 'クレジット売掛金', cat: '資産' },
  { code: '112', name: '前払金', cat: '資産' },
  { code: '113', name: '仮払金', cat: '資産' },
  { code: '114', name: '立替金', cat: '資産' },
  { code: '115', name: '受取商品券', cat: '資産' },
  { code: '116', name: '仮払消費税', cat: '資産' },
  { code: '117', name: '仮払法人税等', cat: '資産' },
  { code: '118', name: '貯蔵品', cat: '資産' },
  { code: '119', name: '小口現金', cat: '資産' },
  { code: '203', name: '支払手形', cat: '負債' },
  { code: '213', name: '前受金', cat: '負債' },
  { code: '214', name: '仮受金', cat: '負債' },
  { code: '215', name: '預り金', cat: '負債' },
  { code: '216', name: '所得税預り金', cat: '負債' },
  { code: '217', name: '社会保険料預り金', cat: '負債' },
  { code: '218', name: '仮受消費税', cat: '負債' },
  { code: '219', name: '未払消費税', cat: '負債' },
  { code: '221', name: '未払法人税等', cat: '負債' },
  { code: '222', name: '未払金', cat: '負債' },
  { code: '302', name: '繰越利益剰余金', cat: '純資産' },
  { code: '516', name: '支払手数料', cat: '費用' },
  { code: '517', name: '発送費', cat: '費用' },
  { code: '518', name: '旅費交通費', cat: '費用' },
  { code: '519', name: '給料', cat: '費用' },
  { code: '520', name: '法定福利費', cat: '費用' },
  { code: '521', name: '租税公課', cat: '費用' },
  { code: '522', name: '法人税等', cat: '費用' }
];
export const DACC: Record<string, DrillAccount> = {};
(ACCOUNTS as DrillAccount[]).concat(DRILL_ACCOUNTS).forEach(a => (DACC[a.code] = a));
export const DRILLS: DrillTopic[] = [
  {
    topic: '現金過不足', desc: '実査と帳簿の差異を仮勘定で処理し、原因判明・決算で振り替える',
    items: [
      { id: 'dr1a', q: '現金の実査を行ったところ、帳簿残高より3,000円不足していた（原因不明）。', correct: { d: { acc: '130', amount: 3000 }, c: { acc: '101', amount: 3000 } }, opts: ['101', '130', '513', '412', '510', '110'], traps: [{ d: '513', msg: '原因が判明するか決算を迎えるまでは雑損にせず、「現金過不足」という仮勘定で一時的に処理します。' }], expl: '帳簿を実査に合わせて現金を減らし、差額は仮勘定「現金過不足」へ。この段階では費用にならず、P/Lは動きません。' },
      { id: 'dr1b', q: '先日の現金不足のうち2,000円は、通信費の記帳漏れと判明した。', correct: { d: { acc: '510', amount: 2000 }, c: { acc: '130', amount: 2000 } }, opts: ['130', '510', '101', '513', '503', '412'], traps: [{ c: '101', msg: '現金は不足発見時にすでに減額済みです。貸方は仮勘定の取崩し（現金過不足）です。' }], expl: '原因が判明した分だけ仮勘定を正しい費用（通信費）へ振り替えます。ここで初めてP/Lの費用が動きます。' },
      { id: 'dr1c', q: '決算日、現金過不足（借方残高）1,000円は原因不明のままであった。', correct: { d: { acc: '513', amount: 1000 }, c: { acc: '130', amount: 1000 } }, opts: ['130', '513', '412', '101', '510', '301'], traps: [], expl: '決算でも原因不明の不足は雑損（費用）へ。仮勘定は決算を越えてB/Sに残せません。' },
      { id: 'dr1d', q: '現金の実査を行ったところ、帳簿残高より4,000円多かった（原因不明）。', correct: { d: { acc: '101', amount: 4000 }, c: { acc: '130', amount: 4000 } }, opts: ['101', '130', '412', '401', '513', '110'], traps: [{ c: '412', msg: '過剰も発見時点では雑益にせず、まず仮勘定（現金過不足）で受けます。' }], expl: '過剰は現金を増やし、相手は仮勘定。決算まで原因不明なら雑益へ振り替えます。' }
    ]
  },
  {
    topic: '当座借越', desc: '当座預金のマイナス残高を決算で負債へ振り替える',
    items: [
      { id: 'dr2a', q: '決算日、当座預金口座が50,000円の貸方残高（借越状態）となっていたので、適切な勘定へ振り替える。', correct: { d: { acc: '101', amount: 50000 }, c: { acc: '211', amount: 50000 } }, opts: ['101', '211', '220', '201', '140', '512'], traps: [{ c: '220', msg: '実質は銀行からの借入ですが、本教材では「当座借越」勘定を使います（借入金とする方法もあります）。' }], expl: '預金勘定のマイナス（貸方残高）をゼロに戻し、負債「当座借越」としてB/Sに表示します。' },
      { id: 'dr2b', q: '翌期首、前期末に計上した当座借越50,000円を再振替する。', correct: { d: { acc: '211', amount: 50000 }, c: { acc: '101', amount: 50000 } }, opts: ['101', '211', '220', '512', '201', '110'], traps: [], expl: '期首に逆仕訳（再振替）して、日常の預金処理に戻します。' },
      { id: 'dr2c', q: '当座借越の状態で、買掛金30,000円を小切手を振り出して支払った（一勘定法）。', correct: { d: { acc: '201', amount: 30000 }, c: { acc: '101', amount: 30000 } }, opts: ['201', '101', '211', '501', '220', '512'], traps: [{ c: '211', msg: '一勘定法では期中は借越でも預金勘定（現金預金）の貸方に記入します。当座借越への振替は決算時だけです。' }], expl: '期中は残高がマイナスでも普段どおり預金勘定で処理します。' },
      { id: 'dr2d', q: '当座借越に係る利息500円が当座預金から引き落とされた。', correct: { d: { acc: '512', amount: 500 }, c: { acc: '101', amount: 500 } }, opts: ['512', '101', '411', '211', '503', '220'], traps: [{ d: '411', msg: '支払う利息は費用（支払利息）です。受取利息は収益の勘定です。' }], expl: '借越は実質借入なので利息が発生し、支払利息（費用）としてP/Lの利益を減らします。' }
    ]
  },
  {
    topic: '経過勘定（前払・前受・未収）', desc: '発生主義による決算整理と翌期首の再振替',
    items: [
      { id: 'dr3a', q: '決算日、支払済みの家賃のうち翌期分が12,000円含まれていたので繰り延べる。', correct: { d: { acc: '121', amount: 12000 }, c: { acc: '511', amount: 12000 } }, opts: ['121', '511', '101', '212', '122', '210'], traps: [{ c: '101', msg: '現金はすでに支払済みで動きません。翌期分の費用を減らして資産（前払費用）へ振り替えます。' }], expl: '当期の費用は当期分だけ。翌期分は「前払費用」という資産としてB/Sに残り、P/Lの費用が減ります。' },
      { id: 'dr3b', q: '翌期首、前期末に計上した前払家賃12,000円を再振替する。', correct: { d: { acc: '511', amount: 12000 }, c: { acc: '121', amount: 12000 } }, opts: ['511', '121', '101', '212', '122', '503'], traps: [], expl: '再振替で翌期の費用に戻します。前払費用はB/Sから消えます。' },
      { id: 'dr3c', q: '決算日、受取済みの地代のうち翌期分が9,000円含まれていたので繰り延べる。', correct: { d: { acc: '410', amount: 9000 }, c: { acc: '212', amount: 9000 } }, opts: ['410', '212', '101', '121', '122', '401'], traps: [{ c: '122', msg: '未収収益は「まだ受け取っていない収益」です。先に受け取った翌期分は「前受収益」（負債）です。' }], expl: '先にもらった翌期分の収益を減らし、「前受収益」という負債としてB/Sに計上します。' },
      { id: 'dr3d', q: '決算日、貸付金の当期分利息6,000円が未収であった。', correct: { d: { acc: '122', amount: 6000 }, c: { acc: '411', amount: 6000 } }, opts: ['122', '411', '101', '121', '212', '140'], traps: [{ d: '101', msg: '現金はまだ受け取っていません。受け取る権利を「未収収益」（資産）として計上します。' }], expl: '当期に稼いだ利息は未入金でも当期の収益。発生主義の代表論点です。' }
    ]
  },
  {
    topic: '貸付金・借入金', desc: '金銭の貸借と利息の処理',
    items: [
      { id: 'dr4a', q: '取引先へ200,000円を貸し付け、普通預金から振り込んだ。', correct: { d: { acc: '140', amount: 200000 }, c: { acc: '101', amount: 200000 } }, opts: ['140', '101', '220', '110', '512', '411'], traps: [{ d: '110', msg: '売掛金は商品売買の債権です。金銭の貸付けは「貸付金」で区別します。' }], expl: '貸付金は返してもらう権利（資産）。資産の形が預金→貸付金に変わるだけで利益は動きません。' },
      { id: 'dr4b', q: '貸付金の利息3,000円が普通預金に入金された。', correct: { d: { acc: '101', amount: 3000 }, c: { acc: '411', amount: 3000 } }, opts: ['101', '411', '140', '512', '401', '122'], traps: [{ c: '140', msg: '元本の回収ではなく利息の受取なので、収益（受取利息）を計上します。' }], expl: '利息は収益としてP/Lに計上され、利益を増やします。' },
      { id: 'dr4c', q: '銀行から300,000円を借り入れ、当座預金へ入金された。', correct: { d: { acc: '101', amount: 300000 }, c: { acc: '220', amount: 300000 } }, opts: ['101', '220', '140', '201', '301', '512'], traps: [{ c: '301', msg: '資本金は株主からの出資です。銀行借入は返済義務のある負債（借入金）です。' }], expl: '借入は資産と負債が同時に増えます。収益ではないので利益は不変です。', }, 
      { id: 'dr4d', q: '借入金のうち100,000円を普通預金から返済した（利息は別途処理済み）。', correct: { d: { acc: '220', amount: 100000 }, c: { acc: '101', amount: 100000 } }, opts: ['220', '101', '512', '140', '201', '411'], traps: [{ d: '512', msg: '利息は別途処理済みです。元本の返済は負債（借入金）の減少であり、費用にはなりません。' }], expl: '元本返済は負債の消滅。費用になるのは利息部分だけです。' }
    ]
  },
  {
    topic: '電子記録債権・債務', desc: '売掛金・買掛金の電子化と決済',
    items: [
      { id: 'dr5a', q: '売掛金150,000円について、電子記録債権の発生記録を行った。', correct: { d: { acc: '106', amount: 150000 }, c: { acc: '110', amount: 150000 } }, opts: ['106', '110', '101', '105', '202', '401'], traps: [{ c: '401', msg: '売上はすでに計上済みです。債権の形が売掛金→電子記録債権に変わるだけです。' }], expl: '債権の形が変わるだけで、B/Sの資産合計も利益も不変です。' },
      { id: 'dr5b', q: '電子記録債権150,000円の支払期日が到来し、当座預金へ入金された。', correct: { d: { acc: '101', amount: 150000 }, c: { acc: '106', amount: 150000 } }, opts: ['101', '106', '110', '401', '105', '202'], traps: [], expl: '決済で債権が現金預金に変わります。ここでも利益は動きません。' },
      { id: 'dr5c', q: '買掛金90,000円について、電子記録債務の発生記録を行った。', correct: { d: { acc: '201', amount: 90000 }, c: { acc: '202', amount: 90000 } }, opts: ['201', '202', '101', '106', '501', '210'], traps: [{ c: '101', msg: '支払はまだ行われていません。債務の形が買掛金→電子記録債務に変わるだけです。' }], expl: '負債の形が変わるだけで、負債合計は不変です。' },
      { id: 'dr5d', q: '電子記録債務90,000円の支払期日が到来し、当座預金から引き落とされた。', correct: { d: { acc: '202', amount: 90000 }, c: { acc: '101', amount: 90000 } }, opts: ['202', '101', '201', '106', '501', '512'], traps: [], expl: '債務の消滅と資産の減少。費用は仕入時に計上済みなので利益は動きません。' }
    ]
  },
  {
    topic: '固定資産売却（複合仕訳）', desc: '累計額の取崩しと売却損益を含む複数行の仕訳',
    items: [
      { id: 'dr6a', q: '期首に、備品（取得原価300,000円・減価償却累計額120,000円）を150,000円で売却し、代金は月末に受け取ることとした。', correct: { d: [{ acc: '159', amount: 120000 }, { acc: '123', amount: 150000 }, { acc: '514', amount: 30000 }], c: [{ acc: '150', amount: 300000 }] }, opts: ['150', '159', '123', '514', '413', '101', '110', '502'], traps: [{ d: '110', msg: '売掛金は商品売買の債権です。固定資産売却代金の未収は「未収入金」で区別します。' }], expl: '帳簿価額180,000（300,000−120,000）に対し売価150,000→売却損30,000。累計額を取り崩し、備品は取得原価で全額減らします。' },
      { id: 'dr6b', q: '期首に、備品（取得原価200,000円・減価償却累計額90,000円）を130,000円で売却し、代金は当座預金に入金された。', correct: { d: [{ acc: '159', amount: 90000 }, { acc: '101', amount: 130000 }], c: [{ acc: '150', amount: 200000 }, { acc: '413', amount: 20000 }] }, opts: ['150', '159', '101', '413', '514', '123', '502', '401'], traps: [{ c: '401', msg: '売上は商品売買の収益です。固定資産の売却による利益は「固定資産売却益」です。' }], expl: '帳簿価額110,000に対し売価130,000→売却益20,000を貸方に計上します。', },
      { id: 'dr6c', q: '備品（取得原価240,000円・期首の減価償却累計額96,000円・定額法・耐用5年・月割）を、期首から3か月使用した時点で120,000円で売却し、当座預金に入金された。当期分の減価償却費もあわせて計上する。', correct: { d: [{ acc: '159', amount: 96000 }, { acc: '502', amount: 12000 }, { acc: '101', amount: 120000 }, { acc: '514', amount: 12000 }], c: [{ acc: '150', amount: 240000 }] }, opts: ['150', '159', '502', '514', '413', '101', '123', '110'], traps: [], expl: '当期分償却 240,000÷60か月×3か月＝12,000。帳簿価額132,000−売価120,000＝売却損12,000。期中売却は当期分の償却費も忘れずに。' },
      { id: 'dr6d', q: '土地（帳簿価額500,000円）を550,000円で売却し、代金は月末に受け取ることとした。', correct: { d: [{ acc: '123', amount: 550000 }], c: [{ acc: '151', amount: 500000 }, { acc: '413', amount: 50000 }] }, opts: ['151', '123', '413', '514', '101', '110'], traps: [{ d: '110', msg: '固定資産の売却代金の未収は「未収入金」です。売掛金は商品売買専用です。' }], expl: '土地は減価償却しない資産。売価−帳簿価額＝売却益50,000です。' }
    ]
  },
  {
    topic: '貸倒引当金・貸倒れ', desc: '差額補充法による設定と、貸倒れ発生時の引当金の充当',
    items: [
      { id: 'dr7a', q: '決算日、期末売掛金残高300,000円に対して2%の貸倒れを見積もる。貸倒引当金の設定前残高は2,000円である（差額補充法）。', correct: { d: { acc: '504', amount: 4000 }, c: { acc: '111', amount: 4000 } }, opts: ['504', '111', '110', '515', '414', '101'], traps: [{ c: '110', msg: '見積段階では売掛金を直接減らしません。控除科目「貸倒引当金」を使います。' }], expl: '必要額 300,000×2%＝6,000。設定前残高2,000との差額4,000だけを繰り入れるのが差額補充法です。' },
      { id: 'dr7b', q: '決算日、期末売掛金残高80,000円に対して3%の貸倒れを見積もったところ、貸倒引当金の設定前残高5,000円が必要額を上回っていた（差額補充法）。', correct: { d: { acc: '111', amount: 2600 }, c: { acc: '414', amount: 2600 } }, opts: ['111', '414', '504', '110', '412', '101'], traps: [{ c: '504', msg: '残高が必要額を上回る場合は繰入ではなく、超過分を取り崩して「貸倒引当金戻入」（収益）とします。' }], expl: '必要額 80,000×3%＝2,400。設定前残高5,000−2,400＝2,600を戻し入れ、収益に計上します。' },
      { id: 'dr7c', q: '前期に発生した売掛金40,000円が貸し倒れた。貸倒引当金の残高は30,000円である。', correct: { d: [{ acc: '111', amount: 30000 }, { acc: '515', amount: 10000 }], c: [{ acc: '110', amount: 40000 }] }, opts: ['111', '515', '110', '504', '414', '101'], traps: [{ d: '504', msg: '貸倒れの発生時は繰入ではなく、まず引当金を取り崩します。不足分は「貸倒損失」です。' }], expl: 'まず引当金30,000を充当し、不足の10,000だけを貸倒損失（費用）とする複合仕訳です。' },
      { id: 'dr7d', q: '当期に発生した売掛金20,000円が貸し倒れた（貸倒引当金の残高は50,000円ある）。', correct: { d: { acc: '515', amount: 20000 }, c: { acc: '110', amount: 20000 } }, opts: ['515', '111', '110', '504', '414', '101'], traps: [{ d: '111', msg: '引当金は前期末の売掛金に対する見積りです。当期に発生した売掛金の貸倒れには充当できず、全額を貸倒損失とします。' }], expl: '当期発生分は引当金の見積り対象外なので、残高があっても使えません。全額が当期の費用（貸倒損失）です。' }
    ]
  },
  {
    topic: '利息の月割計算', desc: '借入金・貸付金・当座借越の利息を月割で計算して処理する',
    items: [
      { id: 'dr8a', q: '決算日、借入金600,000円（年利2%）について、当期の経過期間3か月分の利息が未払いである。月割で計上する。', correct: { d: { acc: '512', amount: 3000 }, c: { acc: '210', amount: 3000 } }, opts: ['512', '210', '220', '101', '411', '122'], traps: [{ c: '101', msg: '利息はまだ支払っていません。当期分の費用に対応する支払義務を「未払費用」として計上します。' }], expl: '600,000×2%×3/12＝3,000。経過した月数分だけを当期の費用にするのが月割計算です。' },
      { id: 'dr8b', q: '決算日、貸付金400,000円（年利3%）について、当期の経過期間4か月分の利息が未収である。月割で計上する。', correct: { d: { acc: '122', amount: 4000 }, c: { acc: '411', amount: 4000 } }, opts: ['122', '411', '140', '101', '512', '212'], traps: [{ d: '101', msg: '現金はまだ受け取っていません。受け取る権利を「未収収益」（資産）として計上します。' }], expl: '400,000×3%×4/12＝4,000。未入金でも当期に稼いだ利息は当期の収益です。' },
      { id: 'dr8c', q: '借入金200,000円を、借入期間6か月分の利息（年利3%）とともに普通預金から返済した。', correct: { d: [{ acc: '220', amount: 200000 }, { acc: '512', amount: 3000 }], c: [{ acc: '101', amount: 203000 }] }, opts: ['220', '512', '101', '140', '411', '210'], traps: [], expl: '利息 200,000×3%×6/12＝3,000。元本（負債の減少）と利息（費用）を分けて記録する複合仕訳です。' },
      { id: 'dr8d', q: '当座借越80,000円に対する3か月分の利息（年利5%）が当座預金から引き落とされた。月割で計算する。', correct: { d: { acc: '512', amount: 1000 }, c: { acc: '101', amount: 1000 } }, opts: ['512', '101', '211', '411', '220', '513'], traps: [{ d: '411', msg: '支払う利息は費用（支払利息）です。受取利息は収益の勘定です。' }], expl: '80,000×5%×3/12＝1,000。借越は実質借入なので、期間に応じた利息が費用になります。' }
    ]
  },
  {
    topic: 'クレジット売掛金', desc: 'カード決済による販売と手数料の処理',
    items: [
      { id: 'dr9a', q: '商品100,000円をクレジットカード払いで販売した。信販会社への手数料（販売代金の2%）は販売時に計上する。', correct: { d: [{ acc: '107', amount: 98000 }, { acc: '516', amount: 2000 }], c: [{ acc: '401', amount: 100000 }] }, opts: ['107', '516', '401', '110', '101', '517'], traps: [{ d: '110', msg: 'カード決済による債権は「クレジット売掛金」で通常の売掛金と区別します。' }], expl: '手数料 100,000×2%＝2,000を差し引いた98,000が債権。売上は総額100,000で計上します。' },
      { id: 'dr9b', q: 'クレジット売掛金98,000円が信販会社から普通預金へ入金された。', correct: { d: { acc: '101', amount: 98000 }, c: { acc: '107', amount: 98000 } }, opts: ['101', '107', '110', '401', '516', '106'], traps: [], expl: '債権の回収です。売上・手数料は販売時に計上済みなので利益は動きません。' },
      { id: 'dr9c', q: '商品50,000円をクレジットカード払いで販売した（手数教4%は入金時に計上する方法）。販売時の仕訳を示しなさい。', correct: { d: { acc: '107', amount: 50000 }, c: { acc: '401', amount: 50000 } }, opts: ['107', '401', '516', '101', '110', '213'], traps: [{ d: '516', msg: 'この方法では手数料は入金時に計上します。販売時は総額で債権を立てます。' }], expl: '手数料を入金時に計上する方法では、販売時は総額でクレジット売掛金を計上します。' },
      { id: 'dr9d', q: '前問のクレジット売掛金50,000円について、手数料4%が差し引かれて普通預金へ入金された。', correct: { d: [{ acc: '101', amount: 48000 }, { acc: '516', amount: 2000 }], c: [{ acc: '107', amount: 50000 }] }, opts: ['101', '516', '107', '401', '110', '513'], traps: [], expl: '手数料 50,000×4%＝2,000。入金額48,000＋費用12,000で債権総額50,000を消す複合仕訳です。' }
    ]
  },
  {
    topic: '前払金・前受金', desc: '内金の授受と商品引渡時の振替',
    items: [
      { id: 'dr10a', q: '商品80,000円を注文し、内金として20,000円を普通預金から支払った。', correct: { d: { acc: '112', amount: 20000 }, c: { acc: '101', amount: 20000 } }, opts: ['112', '101', '501', '201', '113', '110'], traps: [{ d: '501', msg: '商品はまだ受け取っていません。内金は「前払金」（資産）です。' }], expl: '引渡し前の支払いは費用ではなく、商品を受け取る権利（前払金）です。' },
      { id: 'dr10b', q: '注文していた商品80,000円を受け取った。代金のうち20,000円は注文時の内金と相殺し、残額は掛けとした。', correct: { d: [{ acc: '501', amount: 80000 }], c: [{ acc: '112', amount: 20000 }, { acc: '201', amount: 60000 }] }, opts: ['501', '112', '201', '101', '110', '213'], traps: [], expl: '仕入は総額80,000。前払金を取り崩し、残りを買掛金とする複合仕訳です。' },
      { id: 'dr10c', q: '得意先から商品120,000円の注文を受け、内金として30,000円が普通預金へ振り込まれた。', correct: { d: { acc: '101', amount: 30000 }, c: { acc: '213', amount: 30000 } }, opts: ['101', '213', '401', '110', '112', '214'], traps: [{ c: '401', msg: '商品はまだ引き渡していません。受け取った内金は「前受金」（負債）です。' }], expl: '引渡し前の受取は収益ではなく、商品を渡す義務（前受金）です。' },
      { id: 'dr10d', q: '注文を受けていた商品120,000円を引き渡した。代金のうち30,000円は内金と相殺し、残額は掛けとした。', correct: { d: [{ acc: '213', amount: 30000 }, { acc: '110', amount: 90000 }], c: [{ acc: '401', amount: 120000 }] }, opts: ['213', '110', '401', '101', '112', '201'], traps: [], expl: '引渡し時に売上を総額で計上。前受金を取り崩し、残りを売掛金とします。' }
    ]
  },
  {
    topic: '仮払金・仮受金', desc: '内容未確定の支払・受取と精算',
    items: [
      { id: 'dr11a', q: '従業員の出張にあたり、旅費の概算額30,000円を現金で渡した。', correct: { d: { acc: '113', amount: 30000 }, c: { acc: '101', amount: 30000 } }, opts: ['113', '101', '518', '114', '215', '519'], traps: [{ d: '518', msg: '金額・内容が確定していない支払は「仮払金」です。費用は精算時に確定します。' }], expl: '概算払いは内容未確定なので仮勘定（仮払金）で処理します。' },
      { id: 'dr11b', q: '出張から戻った従業員が旅費28,000円を精算し、残額2,000円を現金で受け取った。', correct: { d: [{ acc: '518', amount: 28000 }, { acc: '101', amount: 2000 }], c: [{ acc: '113', amount: 30000 }] }, opts: ['518', '101', '113', '114', '519', '215'], traps: [], expl: '確定した旅費を費用にし、使わなかった分の現金を回収して仮払金30,000を全額取り崩します。' },
      { id: 'dr11c', q: '出張中の従業員から、内容不明の振込50,000円が普通預金にあった。', correct: { d: { acc: '101', amount: 50000 }, c: { acc: '214', amount: 50000 } }, opts: ['101', '214', '401', '110', '213', '412'], traps: [{ c: '401', msg: '内容が判明するまでは収益にせず、仮勘定（仮受金）で受けます。' }], expl: '内容不明の入金は仮受金（負債）。判明時に正しい勘定へ振り替えます。' },
      { id: 'dr11d', q: '先日の仮受金50,000円は、得意先に対する売掛金の回収と判明した。', correct: { d: { acc: '214', amount: 50000 }, c: { acc: '110', amount: 50000 } }, opts: ['214', '110', '101', '401', '213', '112'], traps: [{ c: '401', msg: '売上は販売時に計上済みです。判明したのは売掛金の回収です。' }], expl: '仮受金を取り崩し、売掛金を減らします。利益は動きません。' }
    ]
  },
  {
    topic: '立替金・預り金・給料', desc: '給料支払と源泉徴収・社会保険の処理',
    items: [
      { id: 'dr12a', q: '従業員が負担すべき生命保険料5,000円を現金で立て替えた。', correct: { d: { acc: '114', amount: 5000 }, c: { acc: '101', amount: 5000 } }, opts: ['114', '101', '519', '215', '113', '520'], traps: [{ d: '519', msg: '従業員負担分の立替えは費用ではなく、返してもらう権利（立替金）です。' }], expl: '立替金は後で回収する債権（資産）です。' },
      { id: 'dr12b', q: '給料300,000円の支払にあたり、源泉所得税15,000円と先日の立替金5,000円を差し引き、残額を普通預金から支払った。', correct: { d: [{ acc: '519', amount: 300000 }], c: [{ acc: '216', amount: 15000 }, { acc: '114', amount: 5000 }, { acc: '101', amount: 280000 }] }, opts: ['519', '216', '114', '101', '215', '520'], traps: [], expl: '給料は総額で費用計上。預かった所得税は「所得税預り金」（負債）、立替金は回収します。' },
      { id: 'dr12c', q: '先日の給料支払時に預かった源泉所得税15,000円を、税務署へ現金で納付した。', correct: { d: { acc: '216', amount: 15000 }, c: { acc: '101', amount: 15000 } }, opts: ['216', '101', '519', '521', '215', '522'], traps: [{ d: '521', msg: '従業員から預かった税金の納付は負債の消滅です。会社の費用（租税公課）ではありません。' }], expl: '預り金の納付は負債の減少。会社の費用にはなりません。' },
      { id: 'dr12d', q: '社会保険料20,000円（うち従業員負担分＝預り金10,000円、会社負担分10,000円）を普通預金から納付した。', correct: { d: [{ acc: '217', amount: 10000 }, { acc: '520', amount: 10000 }], c: [{ acc: '101', amount: 20000 }] }, opts: ['217', '520', '101', '519', '216', '215'], traps: [], expl: '従業員負担分は預り金の取崩し、会社負担分は「法定福利費」（費用）です。' }
    ]
  },
  {
    topic: '小口現金・商品券', desc: '小口現金の補給と受取商品券の処理',
    items: [
      { id: 'dr13a', q: '小口現金制度を採用し、小口係に30,000円の小切手を振り出して前渡しした。', correct: { d: { acc: '119', amount: 30000 }, c: { acc: '101', amount: 30000 } }, opts: ['119', '101', '510', '518', '113', '114'], traps: [{ d: '113', msg: '小口現金は使途が日常の小額支払と決まっているので、仮払金ではなく専用の資産勘定を使います。' }], expl: '小口現金は手元の小額資金という資産。資産の形が変わるだけです。' },
      { id: 'dr13b', q: '小口係から、今週の支払報告（通信費4,000円・旅費交通費6,000円）を受け、同額の小切手を振り出して補給した（定額資金前渡制）。', correct: { d: [{ acc: '510', amount: 4000 }, { acc: '518', amount: 6000 }], c: [{ acc: '101', amount: 10000 }] }, opts: ['510', '518', '101', '119', '113', '516'], traps: [], expl: '報告と同時に補給する場合、小口現金勘定を経由せず費用／預金で処理できます。' },
      { id: 'dr13c', q: '商品40,000円を売り上げ、代金として自治体発行の商品券を受け取った。', correct: { d: { acc: '115', amount: 40000 }, c: { acc: '401', amount: 40000 } }, opts: ['115', '401', '101', '110', '213', '107'], traps: [{ d: '110', msg: '商品券は後日換金できる債権ですが、売掛金とは区別して「受取商品券」で処理します。' }], expl: '受け取った商品券は換金する権利（資産）です。' },
      { id: 'dr13d', q: '保有する受取商品券40,000円を換金請求し、同額が普通預金へ振り込まれた。', correct: { d: { acc: '101', amount: 40000 }, c: { acc: '115', amount: 40000 } }, opts: ['101', '115', '401', '110', '412', '213'], traps: [], expl: '債権の回収です。売上は受取時に計上済みなので利益は動きません。' }
    ]
  },
  {
    topic: '返品・諸掛・支払手形', desc: '売上・仕入の修正と手形の振出・決済', 
    items: [
      { id: 'dr14a', q: '掛けで仕入れた商品のうち8,000円を品違いのため返品した。', correct: { d: { acc: '201', amount: 8000 }, c: { acc: '501', amount: 8000 } }, opts: ['201', '501', '110', '401', '101', '120'], traps: [{ d: '110', msg: '仕入の返品は買掛金を減らします。売掛金は自社の販売債権です。' }], expl: '仕入時の逆仕訳で仕入と買掛金を取り消します。' },
      { id: 'dr14b', q: '掛けで販売した商品のうち10,000円が返品された。', correct: { d: { acc: '401', amount: 10000 }, c: { acc: '110', amount: 10000 } }, opts: ['401', '110', '201', '501', '101', '517'], traps: [], expl: '売上時の逆仕訳で売上と売掛金を取り消します。' },
      { id: 'dr14c', q: '商品60,000円を掛けで仕入れ、引取運賃2,000円（当社負担）は現金で支払った。', correct: { d: [{ acc: '501', amount: 62000 }], c: [{ acc: '201', amount: 60000 }, { acc: '101', amount: 2000 }] }, opts: ['501', '201', '101', '517', '110', '112'], traps: [{ d: '517', msg: '当社負担の引取運賃（仕入諸掛）は仕入原価に含めます。発送費は売上側の諸掛に使います。' }], expl: '仕入諸掛は仕入原価に加算：60,000＋2,000＝62,000。' },
      { id: 'dr14d', q: '買掛金50,000円の支払のため、約束手形を振り出した。', correct: { d: { acc: '201', amount: 50000 }, c: { acc: '203', amount: 50000 } }, opts: ['201', '203', '105', '101', '501', '202'], traps: [{ c: '105', msg: '受取手形は受け取った手形（資産）です。自社が振り出す手形は「支払手形」（負債）です。' }], expl: '手形の振出は支払義務の形が買掛金→支払手形に変わるだけです。' }
    ]
  },
  {
    topic: '消費税', desc: '税抜方式による仮払・仮受と決算時の納付額確定',
    items: [
      { id: 'dr15a', q: '商品44,000円（うち消費税4,000円）を現金で仕入れた（税抜方式）。', correct: { d: [{ acc: '501', amount: 40000 }, { acc: '116', amount: 4000 }], c: [{ acc: '101', amount: 44000 }] }, opts: ['501', '116', '101', '218', '521', '201'], traps: [{ d: '521', msg: '仕入に係る消費税は費用ではなく「仮払消費税」（資産）です。' }], expl: '税抜方式では本体40,000を仕入、消費税4,000を仮払消費税として分けます。', },
      { id: 'dr15b', q: '商品77,000円（うち消費税7,000円）を現金で売り上げた（税抜方式）。', correct: { d: [{ acc: '101', amount: 77000 }], c: [{ acc: '401', amount: 70000 }, { acc: '218', amount: 7000 }] }, opts: ['101', '401', '218', '116', '412', '219'], traps: [{ c: '116', msg: '売上に係る消費税は預かった税金なので「仮受消費税」（負債）です。' }], expl: '売上は本体70,000。預かった7,000は国へ納める義務（仮受消費税）です。' },
      { id: 'dr15c', q: '決算日、仮受消費税7,000円と仮払消費税4,000円を相殺し、納付額を確定した。', correct: { d: [{ acc: '218', amount: 7000 }], c: [{ acc: '116', amount: 4000 }, { acc: '219', amount: 3000 }] }, opts: ['218', '116', '219', '101', '521', '522'], traps: [], expl: '差額3,000が納付義務「未払消費税」としてB/Sに計上されます。' },
      { id: 'dr15d', q: '確定申告にあわせて、未払消費税3,000円を普通預金から納付した。', correct: { d: { acc: '219', amount: 3000 }, c: { acc: '101', amount: 3000 } }, opts: ['219', '101', '218', '116', '521', '113'], traps: [], expl: '負債の消滅です。税抜方式では消費税は損益を通らず、P/Lに影響しません。' }
    ]
  },
  {
    topic: '法人税等・株式会社', desc: '中間納付・確定・増資・剰余金配当',
    items: [
      { id: 'dr16a', q: '法人税の中間申告を行い、30,000円を普通預金から納付した。', correct: { d: { acc: '117', amount: 30000 }, c: { acc: '101', amount: 30000 } }, opts: ['117', '101', '522', '221', '521', '113'], traps: [{ d: '522', msg: '中間納付の時点では税額が未確定なので「仮払法人税等」（資産）で処理します。' }], expl: '中間納付は前払いの性格をもつ仮勘定（仮払法人税等）です。' },
      { id: 'dr16b', q: '決算にあたり当期の法人税等が80,000円と確定した。中間納付額30,000円を控除し、残額を未払計上する。', correct: { d: [{ acc: '522', amount: 80000 }], c: [{ acc: '117', amount: 30000 }, { acc: '221', amount: 50000 }] }, opts: ['522', '117', '221', '101', '521', '219'], traps: [], expl: '確定税額80,000を費用計上し、仮払分を取崩し、差額を「未払法人税等」とします。' },
      { id: 'dr16c', q: '増資にあたり株式を発行し、払込金500,000円が当座預金に入金された（全額を資本金とする）。', correct: { d: { acc: '101', amount: 500000 }, c: { acc: '301', amount: 500000 } }, opts: ['101', '301', '220', '302', '401', '140'], traps: [{ c: '220', msg: '株式の発行は返済不要の出資です。借入金ではなく資本金（純資産）です。' }], expl: '出資は純資産の増加。収益ではないので利益は動きません。' },
      { id: 'dr16d', q: '株主総会で繰越利益剰余金からの配当100,000円が決議された（支払は後日）。', correct: { d: { acc: '302', amount: 100000 }, c: { acc: '222', amount: 100000 } }, opts: ['302', '222', '301', '101', '519', '221'], traps: [{ c: '101', msg: '決議時点ではまだ支払っていません。支払義務を「未払金」として計上します。' }], expl: '配当の決議で剰余金が減り、未払金（負債）が立ちます。費用ではありません。' }
    ]
  },
  {
    topic: '貯蔵品・租税公課', desc: '収入印紙・郵便切手の費用処理と決算整理',
    items: [
      { id: 'dr17a', q: '収入印紙10,000円と郵便切手3,000円を現金で購入し、すぐに使用する予定である。', correct: { d: [{ acc: '521', amount: 10000 }, { acc: '510', amount: 3000 }], c: [{ acc: '101', amount: 13000 }] }, opts: ['521', '510', '101', '118', '113', '516'], traps: [{ d: '118', msg: '購入時は費用（収入印紙＝租税公課、切手＝通信費）で処理し、期末の未使用分だけを貯蔵品へ振り替えます。' }], expl: '印紙は租税公課、切手は通信費。購入時は費用処理が原則です。' },
      { id: 'dr17b', q: '決算日、未使用の収入印紙4,000円と郵便切手1,000円があったので、適切な勘定へ振り替える。', correct: { d: [{ acc: '118', amount: 5000 }], c: [{ acc: '521', amount: 4000 }, { acc: '510', amount: 1000 }] }, opts: ['118', '521', '510', '101', '120', '113'], traps: [], expl: '未使用分は費用から除き「貯蔵品」（資産）として翼期へ繰り越します。' },
      { id: 'dr17c', q: '翌期首、前期末に計上した貯蔵品5,000円（印紙4,000円・切手1,000円）を再振替する。', correct: { d: [{ acc: '521', amount: 4000 }, { acc: '510', amount: 1000 }], c: [{ acc: '118', amount: 5000 }] }, opts: ['521', '510', '118', '101', '120', '116'], traps: [], expl: '期首に逆仕訳して費用に戻します。経過勘定と同じ再振替の発想です。' },
      { id: 'dr17d', q: '建物に係る固定資産税60,000円の納税通知書を受け取り、現金で納付した。', correct: { d: { acc: '521', amount: 60000 }, c: { acc: '101', amount: 60000 } }, opts: ['521', '101', '522', '216', '118', '511'], traps: [{ d: '522', msg: '固定資産税は法人税等ではなく「租税公課」（費用）で処理します。' }], expl: '固定資産税・印紙税などは租税公課。法人税等とは区別します。' }
    ]
  }
];
export function validateDrill(item: DrillItem, ans: DrillForm): ValidateResult {
  const parse = (s: string) => parseInt(String(s).replace(/[,，¥\s]/g, ''), 10) || 0;
  const clean = (lines: DrillFormLine[]) => (lines || []).map(l => ({ acc: l.acc, amount: parse(l.amt) })).filter(l => l.acc && l.amount > 0);
  const aD = clean(ans.dLines), aC = clean(ans.cLines);
  if (!aD.length || !aC.length) return { correct: false, diagnoses: ['借方・貸方それぞれ少なくとも1行、科目と金額を入力してください。'] };
  const cD: CorrectSide[] = Array.isArray(item.correct.d) ? item.correct.d : [item.correct.d];
  const cC: CorrectSide[] = Array.isArray(item.correct.c) ? item.correct.c : [item.correct.c];
  const sum = (a: CorrectSide[]) => a.reduce((t, l) => t + l.amount, 0);
  const key = (a: CorrectSide[]) => a.map(l => l.acc + ':' + l.amount).sort().join('|');
  if (key(aD) === key(cD) && key(aC) === key(cC)) return { correct: true, diagnoses: [] };
  const diag: string[] = [];
  if (sum(aD) !== sum(aC)) diag.push('借方合計と貸方合計が一致していません。複合仕訳でも貸借は必ず一致します。');
  if (key(aD) === key(cC) && key(aC) === key(cD)) {
    diag.push('借方と貸方が逆です。資産・費用の増加は借方、負債・純資産・収益の増加は貸方です。');
    return { correct: false, diagnoses: diag };
  }
  (item.traps || []).forEach(t => {
    if ((t.d && aD.some(l => l.acc === t.d)) || (t.c && aC.some(l => l.acc === t.c))) diag.push(t.msg);
  });
  if (aD.length !== cD.length || aC.length !== cC.length) diag.push('この仕訳は借方' + cD.length + '行・貸方' + cC.length + '行で構成されます。増減した要素をすべて洗い出しましょう。');
  const accs = (a: CorrectSide[]) => a.map(l => l.acc).sort().join('|');
  if (!diag.length) {
    if (accs(aD) !== accs(cD)) diag.push('借方の科目構成を見直しましょう。必要なのは' + cD.map(l => '「' + DACC[l.acc].cat + '」').join('・') + 'に属する科目です。');
    else if (accs(aC) !== accs(cC)) diag.push('貸方の科目構成を見直しましょう。必要なのは' + cC.map(l => '「' + DACC[l.acc].cat + '」').join('・') + 'に属する科目です。');
    else diag.push('科目は正しいですが、金額が一致していません。計算過程（償却額・帳簿価額・損益）を見直しましょう。');
  }
  return { correct: false, diagnoses: diag };
}
