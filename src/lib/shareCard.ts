/** SNS共有カードの PNG 書き出し（canvas 1200×675 / 1080×1080）。プロトタイプ downloadShareCard() の移植。 */
import { COMPANY, SCENARIOS, metrics } from '../engine/engine';
import type { AppState } from '../state/types';

export function downloadShareCard(S: AppState, format: 'wide' | 'square'): void {
  const done = S.completed.length, total = SCENARIOS.length, allDone = done === total;
  const profit = metrics(S.entries).profit;
  const sq = format === 'square';
  const W = sq ? 1080 : 1200, H = sq ? 1080 : 675;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (!x) return;
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#3b625d'); g.addColorStop(1, '#2b4240');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const jp = '"BIZ UDPGothic","Yu Gothic UI",Meiryo,sans-serif';
  const pad = 90;
  let y = sq ? 170 : 130;
  x.fillStyle = '#c5ddd9'; x.font = '700 32px Arial';
  x.fillText('仕 訳 の 先 へ', pad, y);
  y += 44; x.fillStyle = '#9fc5bf'; x.font = '26px ' + jp;
  x.fillText('日商簿記3級 by のりまき ／ ' + (S.companyName || COMPANY.name) + ' ' + (allDone ? '月次決算（完了）' : '月次決算（進行中）'), pad, y);
  y += sq ? 140 : 105; x.fillStyle = '#ffffff'; x.font = '600 ' + (sq ? 84 : 70) + 'px ' + jp;
  x.fillText(allDone ? '月次決算 完走！' : done + ' 問達成', pad, y);
  y += sq ? 150 : 118; x.fillStyle = '#e2eeec'; x.font = '700 ' + (sq ? 108 : 94) + 'px Arial';
  x.fillText((profit < 0 ? '△' : '') + '¥' + Math.abs(profit).toLocaleString('ja-JP'), pad, y);
  y += 52; x.fillStyle = '#9fc5bf'; x.font = '27px ' + jp;
  x.fillText((allDone ? '累計利益（確定）' : '累計利益（途中経過）') + ' — 登録済みの仕訳から自動集計', pad, y);
  y += sq ? 130 : 88; x.fillStyle = '#c5ddd9'; x.font = '30px ' + jp;
  x.fillText('取引 → 仕訳 → 帳簿 → 試算表 → B/S・P/L', pad, y);
  const by = H - (sq ? 130 : 100);
  x.strokeStyle = '#47776f'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(pad, by - 58); x.lineTo(W - pad, by - 58); x.stroke();
  x.fillStyle = '#ffffff'; x.font = '700 38px ' + jp;
  x.fillText('学習進捗 ' + done + ' / ' + total + '　達成率 ' + Math.round(done / total * 100) + '%　バッジ ' + Object.keys(S.badges).length + '/10', pad, by);
  x.fillStyle = '#9fc5bf'; x.font = '26px ' + jp; x.textAlign = 'right';
  x.fillText('#簿記 #日商簿記3級', W - pad, by); x.textAlign = 'left';
  c.toBlob(b => {
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'bookkeeping-flow-' + (sq ? 'square' : 'wide') + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
