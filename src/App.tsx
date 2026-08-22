import BadgeInfoModal from './components/BadgeInfoModal';
import CelebrateOverlay from './components/CelebrateOverlay';
import DuckAssistant from './components/DuckAssistant';
import EvidenceModal from './components/EvidenceModal';
import ShareModal from './components/ShareModal';
import Toast from './components/Toast';
import TraceBar from './components/TraceBar';
import { css } from './lib/css';
import { COMPANY, SCENARIOS } from './engine/engine';
import Dashboard from './screens/Dashboard';
import Drill from './screens/Drill';
import FinancialStatements from './screens/FinancialStatements';
import GeneralLedger from './screens/GeneralLedger';
import Journal from './screens/Journal';
import MobileBottomNav from './components/MobileBottomNav';
import Learn from './screens/Learn';
import Mock from './screens/Mock';
import Notes from './screens/Notes';
import ScenarioFlow from './screens/ScenarioFlow';
import ScenarioList from './screens/ScenarioList';
import SubLedger from './screens/SubLedger';
import TopicMap from './screens/TopicMap';
import TrialBalance from './screens/TrialBalance';
import { MODES } from './state/content';
import { level } from './state/derive';
import { NAVS, SUB_NAVS, useNav } from './state/nav';
import { useApp } from './state/store';

export default function App() {
  const { S, api } = useApp();
  const { goNav, goHome, goSub, inLearnGrp, viewKey, subKey } = useNav();
  const mode = MODES.find(m => m[0] === S.mode) || MODES[1];

  return (
    <div style={css('min-height:100vh;display:flex;flex-direction:column;font-family:var(--font-sans)')}>
      <header className="nm-appbar bfl-appbar" style={css('flex-wrap:wrap')}>
        <button
          className="nm-appbar__brand"
          onClick={goHome}
          title="ダッシュボードへ戻る"
          style={css('border:0;background:transparent;padding:0;cursor:pointer;font:inherit;color:inherit;display:inline-flex;align-items:center;gap:0.625rem;text-align:left')}
        >
          <span style={css('width:2.25rem;height:2.25rem;border-radius:var(--radius-panel);background:var(--brand-700);display:grid;place-items:center;flex:none')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="16" height="20" x="4" y="2" rx="2"></rect>
              <line x1="8" x2="16" y1="6" y2="6"></line>
              <line x1="16" x2="16" y1="14" y2="18"></line>
              <path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path>
              <path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path>
              <path d="M8 18h.01"></path>
            </svg>
          </span>
          <span style={css('display:grid;gap:1px;line-height:1.2')}>
            <span style={css('font-weight:var(--font-weight-bold);font-size:1.0625rem')}>仕訳の先へ</span>
            <span className="bfl-brand-subtitle" style={css('color:var(--text-muted);font-size:0.6875rem;font-weight:var(--font-weight-regular)')}>by のりまき　日商簿記3級</span>
          </span>
        </button>
        <div className="bfl-appbar-meta">
          <span>{mode[1]}モード</span>
          <span className="nm-number">LV.{level(S.xp)}　{S.xp.toLocaleString('ja-JP')} XP</span>
          <span>学習用サンプル</span>
        </div>
        <div className="nm-appbar__actions bfl-appbar-actions" style={css('margin-left:0')}>
          <button
            className="nm-btn nm-btn--tertiary nm-btn--sm"
            onClick={() => api.set({ guide: { open: true, kind: 'menu', topic: 0, hintLv: 1 } })}
          ><span aria-hidden="true">？</span><span className="bfl-help-label">ヘルプ</span></button>
        </div>
      </header>

      <nav
        className="nm-tabs"
        style={css('background:var(--surface-card);padding:0 var(--space-4);overflow-x:auto;flex-wrap:nowrap;scrollbar-width:thin')}
        aria-label="帳簿ナビゲーション"
      >
        {NAVS.map(([k, label]) => (
          <button
            key={k}
            className={'nm-tab ' + (viewKey === k ? 'is-active' : '') + (k === 'journal' ? ' bfl-tab-sep' : '') + (k === 'dash' ? ' bfl-tab-home' : '')}
            onClick={() => goNav(k)}
          >{label}</button>
        ))}
      </nav>

      {inLearnGrp && (
        <nav
          className="nm-tabs"
          style={css('background:var(--surface-muted);padding:0 var(--space-4);overflow-x:auto;flex-wrap:nowrap;scrollbar-width:thin;border-bottom:1px solid var(--border-subtle)')}
          aria-label="学習ナビゲーション"
        >
          {SUB_NAVS.map(([k, label]) => (
            <button
              key={k}
              className={'nm-tab ' + (subKey === k ? 'is-active' : '')}
              style={css('min-height:2.75rem')}
              onClick={() => goSub(k)}
            >{label}</button>
          ))}
        </nav>
      )}

      <TraceBar />

      <main className="bfl-main" style={css('flex:1;width:100%;max-width:74rem;margin:0 auto;padding:var(--space-5) var(--space-4);display:grid;gap:var(--space-5);align-content:start')}>
        {!S.ready && <p style={css('color:var(--text-muted)')}>会計エンジンを読み込み中…</p>}
        {S.ready && (
          <>
            {S.view === 'dash' && <Dashboard />}
            {S.view === 'learn' && <Learn />}
            {S.view === 'scnList' && <ScenarioList />}
            {S.view === 'scn' && (S.sid ? <ScenarioFlow /> : <ScenarioList />)}
            {S.view === 'drill' && <Drill />}
            {S.view === 'mock' && (S.mock ? <Mock /> : <Drill />)}
            {S.view === 'map' && <TopicMap />}
            {S.view === 'notes' && <Notes />}
            {S.view === 'journal' && <Journal />}
            {S.view === 'sub' && <SubLedger />}
            {S.view === 'gl' && <GeneralLedger />}
            {S.view === 'tb' && <TrialBalance />}
            {S.view === 'fs' && <FinancialStatements />}
          </>
        )}
      </main>

      <footer style={css('padding:var(--space-3) var(--space-4);border-top:1px solid var(--border-default);background:var(--surface-card);display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center')}>
        <span className="nm-supporting-text">仕訳の先へ by のりまき — 学習用シミュレーション（架空会社）。実在の企業・個人の情報は入力しないでください。</span>
        <span className="nm-supporting-text" style={css('margin-left:auto')}>データはこのブラウザにのみ保存されます</span>
        {import.meta.env.DEV && S.tests && (
          <span className="nm-supporting-text">
            エンジン自己テスト {S.tests.filter(t => t.pass).length} / {S.tests.length} 合格
            {'　'}（{S.companyName || COMPANY.name}・全{SCENARIOS.length}取引）
          </span>
        )}
      </footer>

      <BadgeInfoModal />
      <CelebrateOverlay />
      <Toast />
      <DuckAssistant />
      <ShareModal />
      <EvidenceModal />
      <MobileBottomNav />
    </div>
  );
}
