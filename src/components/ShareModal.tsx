import { COMPANY, metrics } from '../engine/engine';
import { css } from '../lib/css';
import { yen } from '../lib/format';
import { downloadShareCard } from '../lib/shareCard';
import { progress } from '../state/derive';
import { useApp } from '../state/store';

/** 学習成果カード（SNS共有用・PNG書き出し） */
export default function ShareModal() {
  const { S, api } = useApp();
  if (!S.shareOpen) return null;
  const p = progress(S);
  const companyName = S.companyName || COMPANY.name;
  const close = () => api.set({ shareOpen: false });
  const phase = companyName + '　20X6年' + (p.hasMay ? '4〜5月' : '4月') + ' 月次決算' + (p.aprilDone ? '（完了）' : '（進行中）');
  return (
    <div className="nm-modal-backdrop" onClick={close}>
      <div style={css('width:min(30rem,100%)')} onClick={e => e.stopPropagation()} role="dialog" aria-label="学習成果カード">
        <div id="share-card" style={css('border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-dialog);background:linear-gradient(150deg,var(--brand-800),var(--brand-900));color:#fff;padding:var(--space-6);display:grid;gap:var(--space-4)')}>
          <div style={css('display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-3)')}>
            <span style={css('letter-spacing:0.12em;font-weight:var(--font-weight-bold);font-size:var(--font-size-label)')}>仕訳の先へ</span>
            <span style={css('color:var(--brand-300);font-size:var(--font-size-supporting)')}>日商簿記3級　by のりまき</span>
          </div>
          <div style={css('display:grid;gap:var(--space-1)')}>
            <span style={css('color:var(--brand-300);font-size:var(--font-size-supporting)')}>{phase}</span>
            <span style={css('font-size:1.375rem;font-weight:var(--font-weight-bold)')}>
              {p.aprilDone ? '月次決算 完走！' : p.done + ' 問達成'}
            </span>
            <span className="nm-number" style={css('font-size:2.5rem;font-weight:700;line-height:1.1')}>
              {yen(metrics(S.entries).profit)}
            </span>
            <span style={css('color:var(--brand-200);font-size:var(--font-size-label)')}>
              {p.aprilDone ? '累計利益（確定）' : '累計利益（途中経過）'} — 登録済みの仕訳から自動集計
            </span>
          </div>
          <div style={css('display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;font-size:var(--font-size-supporting);color:var(--brand-100)')}>
            {['取引', '仕訳', '帳簿', '試算表', 'B/S・P/L'].map((t, i, arr) => (
              <span key={t} style={css('display:inline-flex;align-items:center;gap:var(--space-2)')}>
                <span style={css('border:1px solid var(--brand-600);border-radius:var(--radius-pill);padding:2px 10px')}>{t}</span>
                {i < arr.length - 1 && <span style={css('color:var(--brand-400)')}>→</span>}
              </span>
            ))}
          </div>
          <div style={css('display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);border-top:1px solid var(--brand-700);padding-top:var(--space-3)')}>
            <span className="nm-number" style={css('font-size:var(--font-size-section-title);font-weight:700')}>
              学習進捗 {p.done} / {p.total}　バッジ {Object.keys(S.badges).length} / 10
            </span>
            <span style={css('color:var(--brand-300);font-size:var(--font-size-supporting)')}>#簿記 #日商簿記3級</span>
          </div>
        </div>
        <div style={css('display:flex;gap:var(--space-2);align-items:center;margin-top:var(--space-3);flex-wrap:wrap')}>
          <button className="nm-btn nm-btn--primary" onClick={() => downloadShareCard(S, 'wide')}>PNG保存（X 横長）</button>
          <button className="nm-btn nm-btn--primary" onClick={() => downloadShareCard(S, 'square')}>PNG保存（Instagram 正方形）</button>
          <button className="nm-btn nm-btn--secondary" style={css('margin-left:auto')} onClick={close}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
