import { SCN } from '../engine/engine';
import { css } from '../lib/css';
import { useApp } from '../state/store';

/** 証憑モーダル（仕訳帳・各ステップから参照） */
export default function EvidenceModal() {
  const { S, api } = useApp();
  const scn = S.evidenceSid ? SCN[S.evidenceSid] : null;
  if (!scn) return null;
  const close = () => api.set({ evidenceSid: null });
  const openScn = () => {
    if (S.view === 'scn' && S.sid === scn.id) { close(); return; }
    api.set({ evidenceSid: null });
    api.startScenario(scn.id);
  };
  return (
    <div className="nm-modal-backdrop" onClick={close}>
      <div className="nm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="証憑">
        <div className="nm-modal__header" style={css('display:flex;align-items:center;gap:var(--space-2)')}>
          <span className="nm-badge nm-badge--brand">{scn.evidence.kind}</span>
          <strong style={css('flex:1')}>{scn.evidence.title}</strong>
          <button className="nm-btn nm-btn--sm" onClick={close}>閉じる</button>
        </div>
        <div className="nm-modal__body" style={css('display:grid;gap:var(--space-2)')}>
          {scn.evidence.rows.map(([k, v], i) => (
            <div key={i} style={css('display:flex;justify-content:space-between;gap:var(--space-3);font-size:var(--font-size-label);border-bottom:1px dotted var(--border-subtle);padding-bottom:2px')}>
              <span style={css('color:var(--text-muted)')}>{k}</span>
              <span className="nm-number" style={css('font-weight:var(--font-weight-medium)')}>{v}</span>
            </div>
          ))}
          <p className="nm-supporting-text" style={css('margin:0')}>{scn.evidence.note || '取引：' + scn.title}</p>
        </div>
        <div className="nm-modal__footer">
          <button className="nm-btn nm-btn--secondary" onClick={openScn}>この取引のシナリオを開く</button>
        </div>
      </div>
    </div>
  );
}
