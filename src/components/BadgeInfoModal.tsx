import { css, cssWith } from '../lib/css';
import { BADGES, BADGE_SHORTS } from '../state/content';
import { badgeHint } from '../state/derive';
import { useApp } from '../state/store';

/** バッジ詳細・獲得モーダル */
export default function BadgeInfoModal() {
  const { S, api } = useApp();
  const bi = S.badgeInfo ? BADGES.find(b => b[0] === S.badgeInfo) : null;
  if (!bi) return null;
  const earned = !!S.badges[bi[0]];
  const close = () => api.set({ badgeInfo: null });
  return (
    <div className="nm-modal-backdrop" onClick={close}>
      <div
        className="nm-modal"
        style={css('width:min(22rem,100%)')}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="バッジ詳細"
      >
        <div className="nm-modal__header" style={css('display:flex;gap:var(--space-3);align-items:center')}>
          <span style={cssWith('width:3rem;height:3rem;border-radius:50%;display:grid;place-items:center;font-size:0.6875rem;font-weight:700;transform:rotate(-6deg);flex:none', {
            border: '2px solid ' + (earned ? 'var(--brand-600)' : 'var(--gray-300)'),
            color: earned ? 'var(--brand-800)' : 'var(--gray-400)',
            background: earned ? 'var(--brand-50)' : 'transparent'
          })}>{BADGE_SHORTS[bi[0]]}</span>
          <strong style={css('flex:1')}>{bi[1]}</strong>
          <span className={'nm-badge ' + (earned ? 'nm-badge--success' : '')}>{earned ? '獲得済' : '未獲得'}</span>
        </div>
        <div className="nm-modal__body" style={css('display:grid;gap:var(--space-2)')}>
          <p style={css('margin:0')}>条件：{bi[2]}</p>
          <p style={css('margin:0;font-size:var(--font-size-label);color:var(--brand-800)')}>{badgeHint(S, bi[0])}</p>
        </div>
        <div className="nm-modal__footer">
          <button className="nm-btn nm-btn--secondary" onClick={close}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
