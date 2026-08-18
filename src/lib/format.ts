/** 金額表示。負数は簿記の慣行どおり △ で表す。 */
export const fmt = (n: number): string => (n < 0 ? '△' : '') + Math.abs(n).toLocaleString('ja-JP');

export const yen = (n: number): string => '¥' + fmt(n);

/** 金額入力：数字のみ受付・リアルタイム3桁カンマ・12桁上限 */
export const fmtIn = (v: string): string => {
  const d = String(v || '').replace(/[^\d]/g, '').slice(0, 12);
  return d ? Number(d).toLocaleString('ja-JP') : '';
};

export const todayStr = (): string => new Date().toISOString().slice(0, 10);
