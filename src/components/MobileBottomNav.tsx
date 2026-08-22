import { useState } from 'react';
import { useNav } from '../state/nav';
import { useApp } from '../state/store';

type IconName = 'home' | 'learn' | 'book' | 'table' | 'more';

function Icon({ name }: { name: IconName }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'home') return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>;
  if (name === 'learn') return <svg {...common}><path d="m3 6.5 9-3 9 3-9 3-9-3Z"/><path d="M6 8.5v5.2c2.8 2.3 9.2 2.3 12 0V8.5"/><path d="M21 7v6"/></svg>;
  if (name === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/></svg>;
  if (name === 'table') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/></svg>;
  return <svg {...common}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>;
}

export default function MobileBottomNav() {
  const { S, api } = useApp();
  const { goNav, goHome } = useNav();
  const [moreOpen, setMoreOpen] = useState(false);
  const books = ['journal', 'sub', 'gl'].includes(S.view);
  const more = ['fs', 'notes', 'map'].includes(S.view);

  const go = (action: () => void) => {
    setMoreOpen(false);
    action();
  };

  return (
    <>
      {moreOpen && (
        <div className="bfl-mobile-sheet-layer" role="presentation" onClick={() => setMoreOpen(false)}>
          <section className="bfl-mobile-sheet" role="dialog" aria-modal="true" aria-label="その他のメニュー" onClick={e => e.stopPropagation()}>
            <div className="bfl-mobile-sheet__handle" />
            <div className="bfl-mobile-sheet__heading">
              <strong>その他のメニュー</strong>
              <button className="nm-btn nm-btn--tertiary nm-btn--sm" onClick={() => setMoreOpen(false)}>閉じる</button>
            </div>
            <div className="bfl-mobile-sheet__grid">
              <button onClick={() => go(() => goNav('sub'))}>補助元帳<span>相手先ごとの内訳</span></button>
              <button onClick={() => go(() => goNav('gl'))}>総勘定元帳<span>科目ごとの増減</span></button>
              <button onClick={() => go(() => goNav('fs'))}>財務諸表<span>B/S・P/Lを見る</span></button>
              <button onClick={() => go(() => api.set({ view: 'notes', trace: [] }))}>間違いノート<span>誤答を復習する</span></button>
            </div>
            <button className="nm-btn nm-btn--secondary bfl-mobile-sheet__help" onClick={() => { setMoreOpen(false); api.set({ guide: { open: true, kind: 'menu', topic: 0, hintLv: 1 } }); }}>？ カモ先輩に質問する</button>
          </section>
        </div>
      )}

      <nav className="bfl-mobile-bottom-nav" aria-label="スマートフォン用メインナビゲーション">
        <button className={S.view === 'dash' ? 'is-active' : ''} onClick={goHome}><Icon name="home"/><span>ホーム</span></button>
        <button className={['learn', 'scnList', 'scn', 'drill', 'mock'].includes(S.view) ? 'is-active' : ''} onClick={() => goNav('learnGrp')}><Icon name="learn"/><span>学習</span></button>
        <button className={books ? 'is-active' : ''} onClick={() => goNav('journal')}><Icon name="book"/><span>帳簿</span></button>
        <button className={S.view === 'tb' ? 'is-active' : ''} onClick={() => goNav('tb')}><Icon name="table"/><span>試算表</span></button>
        <button className={more || moreOpen ? 'is-active' : ''} onClick={() => setMoreOpen(v => !v)}><Icon name="more"/><span>その他</span></button>
      </nav>
    </>
  );
}
