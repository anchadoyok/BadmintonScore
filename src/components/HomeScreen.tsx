import type { MatchState } from "../types/match";

interface HomeScreenProps {
  currentMatch: MatchState | null;
  historyCount: number;
  onNewMatch: () => void;
  onQuickMatch: () => void;
  onResumeMatch: () => void;
  onViewHistory: () => void;
}

export const HomeScreen = ({
  currentMatch,
  historyCount,
  onNewMatch,
  onQuickMatch,
  onResumeMatch,
  onViewHistory
}: HomeScreenProps) => (
  <section className="panel stack-lg">
    <div className="hero-card">
      <div>
        <p className="eyebrow">Fast scoring first</p>
        <h2>Keep score, server, side, and receiver clear every rally.</h2>
      </div>
      <p className="muted">
        Built for casual games and serious doubles where everyone forgets who should serve next.
      </p>
    </div>

    <div className="grid-actions">
      <button className="primary-button tall-button" onClick={onNewMatch}>
        New Match
      </button>
      <button className="accent-button tall-button" onClick={onQuickMatch}>
        Quick Match
        <span className="button-subtext">Singles · 21 pts · no setup</span>
      </button>
      <button className="secondary-button tall-button" onClick={onViewHistory}>
        History
      </button>
      {currentMatch && (
        <button className="secondary-button tall-button" onClick={onResumeMatch}>
          {currentMatch.status === "completed" ? "View Last Summary" : "Resume Match"}
        </button>
      )}
    </div>

    <div className="insight-grid">
      <article className="info-card">
        <span className="stat-chip">{historyCount}</span>
        <h3>Saved matches</h3>
        <p className="muted">Local history is available offline and seeded with sample matches.</p>
      </article>
      <article className="info-card">
        <h3>Why this app works</h3>
        <p className="muted">
          It keeps the scoring flow huge and obvious, while the rules engine handles service
          rotation automatically.
        </p>
      </article>
    </div>
  </section>
);
