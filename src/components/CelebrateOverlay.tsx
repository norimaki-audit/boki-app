import { css } from '../lib/css';
import { useApp } from '../state/store';

/** 仕訳登録時の達成演出（印鑑スタンプ＋獲得XPの内訳） */
export default function CelebrateOverlay() {
  const { S } = useApp();
  if (!S.celebrate) return null;
  return (
    <div style={css('position:fixed;inset:0;z-index:300;display:grid;place-items:center;background:rgb(24 29 28 / 25%);pointer-events:none')}>
      <div style={css('background:var(--surface-card);border:1px solid var(--brand-300);border-radius:var(--radius-dialog);box-shadow:var(--shadow-dialog);padding:var(--space-6) var(--space-7);display:grid;gap:var(--space-2);justify-items:center;animation:bfl-pop 260ms var(--ease-standard)')}>
        <span style={css('width:4.5rem;height:4.5rem;border-radius:50%;border:3px solid var(--danger);color:var(--danger);display:grid;place-items:center;font-weight:700;transform:rotate(-12deg);font-size:0.9375rem')}>登録済</span>
        <span style={css('font-size:var(--font-size-section-title);font-weight:var(--font-weight-bold)')}>仕訳登録完了</span>
        {S.celebrate.lines.map((t, i) => (
          <span key={i} className="nm-number" style={css('color:var(--brand-800);font-weight:600')}>{t}</span>
        ))}
        {S.celebrate.badgeName && (
          <span className="nm-badge nm-badge--warning">新しいバッジ：{S.celebrate.badgeName}</span>
        )}
      </div>
    </div>
  );
}
