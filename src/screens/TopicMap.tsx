/* 論点マップ：出題区分に沿った学習状況（未学習 / 学習中 / 定着 / 要復習）。 */
import { DRILLS } from '../engine/engine';
import { css } from '../lib/css';
import { SCN_BY_TOPIC } from '../state/content';
import { useApp } from '../state/store';

interface Row {
  name: string;
  kind: string;
  total: number;
  done: number;
  wrong: boolean;
  go: () => void;
}

export default function TopicMap() {
  const { S, api } = useApp();
  const rows: Row[] = [];
  Object.keys(SCN_BY_TOPIC).forEach(name => {
    const ids = SCN_BY_TOPIC[name];
    rows.push({
      name, kind: '取引', total: ids.length,
      done: ids.filter(id => S.completed.indexOf(id) >= 0).length,
      wrong: ids.some(id => !!S.wrongLog[id]),
      go: () => api.set({ view: 'scnList' })
    });
  });
  DRILLS.forEach(t => {
    const next = t.items.find(it => !S.drillDone[it.id]) || t.items[0];
    rows.push({
      name: t.topic, kind: 'ドリル', total: t.items.length,
      done: t.items.filter(it => S.drillDone[it.id]).length,
      wrong: t.items.some(it => !!S.wrongLog[it.id]),
      go: () => api.openDrill(next.id, true)
    });
  });

  const stateOf = (r: Row): [string, string, string] =>
    r.wrong ? ['要復習', 'var(--danger)', 'var(--danger-surface)']
      : r.done === 0 ? ['未学習', 'var(--text-muted)', 'transparent']
        : r.done === r.total ? ['定着', 'var(--success-strong)', 'var(--success-surface)']
          : ['学習中', 'var(--brand-800)', 'var(--brand-50)'];

  const view = rows.map(r => {
    const [label, fg, bg] = stateOf(r);
    return {
      ...r, stLabel: label, stFg: fg, stBg: bg,
      progress: r.done + ' / ' + r.total,
      btnLabel: label === '要復習' ? '復習する' : label === '未学習' ? '始める' : label === '定着' ? '見直す' : '続ける'
    };
  });
  const cnt = (l: string) => view.filter(r => r.stLabel === l).length;

  return (
    <section data-screen-label="論点マップ" style={css('display:grid;gap:var(--space-3)')}>
      <h1 className="nm-page-title">論点マップ</h1>
      <p className="nm-supporting-text" style={css('margin:0;max-width:60rem')}>
        日商簿記３級の出題区分に沿った学習状況の一覧です。「要復習」は誤答記録のある論点、「定着」は全問正解済みの論点です。
      </p>
      <p className="nm-number" style={css('margin:0;font-size:var(--font-size-label)')}>
        定着 {cnt('定着')}　学習中 {cnt('学習中')}　要復習 {cnt('要復習')}　未学習 {cnt('未学習')}（全{view.length}論点）
      </p>
      <div style={css('display:grid;max-width:52rem')}>
        {view.map((m, i) => (
          <div key={i} style={css('display:flex;align-items:center;gap:var(--space-3);min-height:2.75rem;padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap')}>
            <span style={css('font-size:var(--font-size-supporting);color:var(--text-muted);width:3rem;flex:none')}>{m.kind}</span>
            <span style={css('flex:1;min-width:12rem;font-size:var(--font-size-body)')}>{m.name}</span>
            <span className="nm-number" style={css('font-size:var(--font-size-supporting);color:var(--text-secondary)')}>{m.progress}</span>
            <span style={{ fontSize: 'var(--font-size-supporting)', fontWeight: 'var(--font-weight-medium)', color: m.stFg, background: m.stBg, padding: '2px 8px', borderRadius: 'var(--radius-control)' }}>
              {m.stLabel}
            </span>
            <button
              className="nm-btn nm-btn--tertiary nm-btn--sm"
              style={css('min-height:2.75rem;color:var(--brand-700)')}
              onClick={m.go}
            >{m.btnLabel} →</button>
          </div>
        ))}
      </div>
    </section>
  );
}
