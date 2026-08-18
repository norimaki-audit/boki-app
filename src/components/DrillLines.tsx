/* 複合仕訳の入力欄（各側最大4行）。論点別ドリルと第1問模試で共有する。 */
import { DACC } from '../engine/engine';
import type { DrillForm } from '../engine/types';
import { css } from '../lib/css';
import { fmtIn } from '../lib/format';

interface Props {
  form: DrillForm;
  opts: string[];
  onChange: (form: DrillForm) => void;
}

export default function DrillLines({ form, opts, onChange }: Props) {
  const setLine = (side: 'dLines' | 'cLines', idx: number, key: 'acc' | 'amt', value: string) => {
    const lines = form[side].map((l, i) => (i === idx ? { ...l, [key]: key === 'amt' ? fmtIn(value) : value } : l));
    onChange({ ...form, [side]: lines });
  };
  const addLine = (side: 'dLines' | 'cLines') => {
    if (form[side].length >= 4) return;
    onChange({ ...form, [side]: form[side].concat([{ acc: '', amt: '' }]) });
  };

  const column = (side: 'dLines' | 'cLines', label: string, accLabel: string, amtLabel: string, btn: string) => (
    <div style={css('display:grid;gap:var(--space-2);align-content:start')}>
      <span className="nm-label" style={css('color:var(--brand-800)')}>{label}</span>
      {form[side].map((ln, i) => (
        <div key={i} style={css('display:grid;gap:var(--space-1);padding-bottom:var(--space-1);border-bottom:1px dotted var(--border-subtle)')}>
          <select
            className="nm-select" value={ln.acc} aria-label={accLabel}
            onChange={e => setLine(side, i, 'acc', e.target.value)}
          >
            <option value="">科目を選択</option>
            {opts.map(code => <option key={code} value={code}>{DACC[code].name}（{DACC[code].cat}）</option>)}
          </select>
          <input
            className="nm-input nm-number" inputMode="numeric" placeholder="金額" aria-label={amtLabel}
            value={ln.amt} onChange={e => setLine(side, i, 'amt', e.target.value)}
          />
        </div>
      ))}
      <button className="nm-btn nm-btn--tertiary nm-btn--sm" style={css('justify-self:start')} onClick={() => addLine(side)}>
        {btn}
      </button>
    </div>
  );

  return (
    <div style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:var(--space-4)')}>
      {column('dLines', '借方（左）', '借方科目', '借方金額', '＋ 借方行を追加')}
      {column('cLines', '貸方（右）', '貸方科目', '貸方金額', '＋ 貸方行を追加')}
    </div>
  );
}
