import { css } from '../lib/css';
import { useApp } from '../state/store';

export default function Toast() {
  const { S } = useApp();
  if (!S.toast) return null;
  return (
    <div
      className="nm-alert nm-alert--success"
      style={css('position:fixed;right:1rem;bottom:6.5rem;z-index:200;box-shadow:var(--shadow-dialog);max-width:22rem')}
    >{S.toast}</div>
  );
}
