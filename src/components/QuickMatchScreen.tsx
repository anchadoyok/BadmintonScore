import { getTeamLabel } from "../lib/badmintonRules";
import type { MatchState, TeamId } from "../types/match";

interface QuickMatchScreenProps {
  match: MatchState;
  onScore: (teamId: TeamId) => void;
  onUndo: () => void;
  onExit: () => void;
}

export const QuickMatchScreen = ({
  match,
  onScore,
  onUndo,
  onExit
}: QuickMatchScreenProps) => {
  const teamA = getTeamLabel(match, "A");
  const teamB = getTeamLabel(match, "B");
  const scoreA = match.teamState.A.score;
  const scoreB = match.teamState.B.score;
  const isServing = (teamId: TeamId) => match.service.servingTeam === teamId;

  return (
    <div className="quick-shell">
      {/* ── Team A tap area ───────────────────────────────────────────────── */}
      <button
        className="quick-half quick-half-a"
        onClick={() => onScore("A")}
        disabled={match.status === "completed"}
        aria-label={`Score point for ${teamA}`}
      >
        <span className="quick-eyebrow">
          {teamA}
          {isServing("A") && <span className="quick-serving-dot" aria-label="serving" />}
        </span>
        <span className="quick-score">{scoreA}</span>
      </button>

      {/* ── Team B tap area ───────────────────────────────────────────────── */}
      <button
        className="quick-half quick-half-b"
        onClick={() => onScore("B")}
        disabled={match.status === "completed"}
        aria-label={`Score point for ${teamB}`}
      >
        <span className="quick-eyebrow">
          {teamB}
          {isServing("B") && <span className="quick-serving-dot" aria-label="serving" />}
        </span>
        <span className="quick-score">{scoreB}</span>
      </button>

      {/* ── Bottom toolbar ────────────────────────────────────────────────── */}
      <div className="quick-toolbar">
        <button
          className="secondary-button"
          onClick={onUndo}
          disabled={match.undoStack.length === 0}
        >
          Undo
        </button>
        <button className="ghost-danger" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  );
};
