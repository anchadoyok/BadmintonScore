import { createCompletedSummary } from "../lib/badmintonRules";
import { formatDateTime, formatElapsed } from "../lib/format";
import type { MatchSnapshot } from "../types/match";

interface HistoryScreenProps {
  history: MatchSnapshot[];
  onBack: () => void;
  onReplay: (match: MatchSnapshot) => void;
}

export const HistoryScreen = ({ history, onBack, onReplay }: HistoryScreenProps) => (
  <section className="panel stack-lg">
    <div className="section-heading">
      <div>
        <p className="eyebrow">History</p>
        <h2>Saved matches</h2>
      </div>
      <button className="ghost-button" onClick={onBack}>
        Back
      </button>
    </div>

    <div className="stack-md">
      {history.map((match) => {
        const summary = createCompletedSummary({ ...match, undoStack: [] });
        if (!summary) {
          return null;
        }

        return (
          <article className="history-card" key={match.id}>
            <div>
              <p className="eyebrow">{summary.matchType}</p>
              <h3>
                {summary.teamAName} {summary.scoreA} - {summary.scoreB} {summary.teamBName}
              </h3>
              <p className="muted">
                Winner: {summary.winnerTeam === "A" ? summary.teamAName : summary.teamBName}
              </p>
            </div>
            <div className="history-meta">
              <span>{formatDateTime(summary.completedAt)}</span>
              <span>{formatElapsed(summary.durationSeconds)}</span>
            </div>
            <button className="secondary-button" onClick={() => onReplay(match)}>
              Rematch these teams
            </button>
          </article>
        );
      })}
    </div>
  </section>
);
