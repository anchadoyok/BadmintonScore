import { getTeamLabel } from "../lib/badmintonRules";
import { formatDateTime, formatElapsed } from "../lib/format";
import type { CompletedMatchSummary, MatchState } from "../types/match";

interface MatchSummaryScreenProps {
  match: MatchState;
  summary: CompletedMatchSummary;
  onSave: () => void;
  onRematch: () => void;
  onHome: () => void;
  onClearCurrent: () => void;
}

export const MatchSummaryScreen = ({
  match,
  summary,
  onSave,
  onRematch,
  onHome,
  onClearCurrent
}: MatchSummaryScreenProps) => (
  <section className="panel stack-lg">
    <div className="summary-hero">
      <p className="eyebrow">Match complete</p>
      <h2>{getTeamLabel(match, summary.winnerTeam)} wins</h2>
      <p className="muted">
        Final score {summary.scoreA} - {summary.scoreB} • {formatElapsed(summary.durationSeconds)}
      </p>
    </div>

    <div className="status-grid">
      <article className="status-card">
        <span className="eyebrow">Team A</span>
        <strong>{summary.teamAName}</strong>
        <p>{summary.scoreA} points</p>
      </article>
      <article className="status-card">
        <span className="eyebrow">Team B</span>
        <strong>{summary.teamBName}</strong>
        <p>{summary.scoreB} points</p>
      </article>
      <article className="status-card">
        <span className="eyebrow">Finished</span>
        <strong>{formatDateTime(summary.completedAt)}</strong>
        <p>{summary.matchType}</p>
      </article>
    </div>

    <div className="toolbar">
      <button className="primary-button" onClick={onSave} disabled={match.savedToHistory}>
        {match.savedToHistory ? "Saved to history" : "Save to history"}
      </button>
      <button className="secondary-button" onClick={onRematch}>
        Rematch
      </button>
      <button className="secondary-button" onClick={onHome}>
        Back home
      </button>
      <button className="ghost-danger" onClick={onClearCurrent}>
        Clear current match
      </button>
    </div>
  </section>
);
