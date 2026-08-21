/** A4 仕訳・計算用紙（書いて覚えるモード用）。
 * ブラウザは別ウィンドウを開いて印刷、ネイティブはHTMLを書き出してOSの共有シート（印刷・保存）に渡す。 */
import { shareText } from './nativeFile';
import { isNative } from './platform';

function worksheetHtml(): string {
  const cell = 'border:0.35mm solid #6b7773;';
  let rows = '';
  for (let i = 1; i <= 10; i++) {
    rows += '<tr><td style="' + cell + 'height:8.5mm;text-align:center;color:#9aa6a2">' + i + '</td>'
      + ('<td style="' + cell + '"></td>').repeat(5) + '</tr>';
  }
  const th = 'style="' + cell + 'padding:1mm;font-weight:700;background:#f1f4f3"';
  return '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>仕訳・計算用紙</title><style>@page{size:A4;margin:12mm}body{margin:0;font-family:\'BIZ UDPGothic\',\'Yu Gothic UI\',Meiryo,sans-serif;color:#1a211f;font-size:9pt}</style></head><body>'
    + '<div style="display:flex;align-items:flex-end;gap:6mm;border-bottom:0.6mm solid #1a211f;padding-bottom:2.5mm;margin-bottom:4mm">'
    + '<div style="flex:1"><div style="font-size:8pt;letter-spacing:0.2em;color:#56615d">仕訳の先へ — 日商簿記3級 by のりまき</div>'
    + '<div style="font-size:15pt;font-weight:700">仕訳・計算用紙</div></div>'
    + '<span>氏名：＿＿＿＿＿＿＿＿＿＿</span><span style="margin-left:6mm">日付：＿＿＿＿年＿＿月＿＿日</span></div>'
    + '<div style="font-weight:700;margin-bottom:1.5mm">仕訳欄（借方・貸方と金額を書いてから、PCへ転記してください）</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:9pt"><thead><tr>'
    + '<th ' + th + ' width="8%">No</th><th ' + th + '>借方科目</th><th ' + th + ' width="14%">金額</th><th ' + th + '>貸方科目</th><th ' + th + ' width="14%">金額</th><th ' + th + ' width="16%">メモ・補助</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div style="font-weight:700;margin:4mm 0 1.5mm">計算スペース（減価償却・引当金などの途中計算を書く）</div>'
    + '<div style="height:120mm;border:0.35mm solid #6b7773;background-image:linear-gradient(#e2e8e6 0.3mm,transparent 0.3mm),linear-gradient(90deg,#e2e8e6 0.3mm,transparent 0.3mm);background-size:5mm 5mm"></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:7.5pt;color:#56615d;border-top:0.35mm solid #b9c4c1;padding-top:1.5mm;margin-top:3mm">'
    + '<span>日商簿記の統一試験・ネット試験とも、紙に書きながら解くのが本番の形式です。</span><span>仕訳の先へ 学習用</span></div>'
    + '</body></html>';
}

export function printWorksheet(): void {
  if (isNative()) {
    void shareText('shiwake-worksheet.html', worksheetHtml(), '仕訳・計算用紙');
    return;
  }
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(worksheetHtml().replace(
    '</body></html>',
    '<scr' + 'ipt>window.onload=function(){window.print()}<\/scr' + 'ipt></body></html>'
  ));
  w.document.close();
}
