import { getPlayerCourtSide, getPlayerLabel } from "../lib/badmintonRules";
import type { CourtSide, MatchState, TeamId } from "../types/match";

interface MiniCourtProps {
  match: MatchState;
}

/**
 * Render a single service-court cell.
 *
 * @param match      Live match state.
 * @param teamId     Which team owns this half.
 * @param courtSide  The player's OWN service court ("left" or "right" from their POV).
 */
const renderSlot = (match: MatchState, teamId: TeamId, courtSide: CourtSide) => {
  const player = match.config.teams[teamId].players.find(
    (p) => getPlayerCourtSide(match, teamId, p.id) === courtSide
  );

  if (!player) {
    return <div className="court-player court-player--empty" />;
  }

  const isServer = player.id === match.service.serverPlayerId;
  const isReceiver = player.id === match.service.receiverPlayerId;
  const cls = isServer
    ? "court-player is-server"
    : isReceiver
      ? "court-player is-receiver"
      : "court-player";

  return (
    <div className={cls}>
      <span>{getPlayerLabel(match, player.id)}</span>
      <small>{courtSide.toUpperCase()}</small>
      {isServer && <strong>Server</strong>}
      {isReceiver && <strong>Receiver</strong>}
    </div>
  );
};

/**
 * Doubles mini court — umpire's point of view with a VERTICAL net.
 *
 * Physical mapping (looking from umpire's chair at the side of the court):
 *
 *   LEFT SIDE team (facing →)           RIGHT SIDE team (facing ←)
 *   ─────────────────────────  Net │  ─────────────────────────────
 *   [their RIGHT court]  (top)  │  │  [their LEFT court]  (top)
 *   [their LEFT  court]  (bot)  │  │  [their RIGHT court] (bot)
 *
 * This ensures the server (e.g., left-top for a right serve) and receiver
 * (right-bottom) are always in DIAGONALLY OPPOSITE cells. ✓
 */
export const MiniCourt = ({ match }: MiniCourtProps) => {
  const uiSideSwapped = match.uiSideSwapped ?? false;

  // Which team is on the LEFT vs RIGHT side of the umpire's view.
  const leftTeam: TeamId = uiSideSwapped ? "B" : "A";
  const rightTeam: TeamId = uiSideSwapped ? "A" : "B";

  const leftColorClass = leftTeam === "A" ? "court-label-a" : "court-label-b";
  const rightColorClass = rightTeam === "A" ? "court-label-a" : "court-label-b";

  return (
    <div className="court-card">
      <div className="court-header">
        <div>
          <p className="eyebrow">Live positioning</p>
          <h3>Doubles mini court</h3>
        </div>
        <span className="stat-chip">{match.service.serviceSide} serve</span>
      </div>

      {/* Team name labels above each half */}
      <div className="court-side-labels">
        <span className={leftColorClass}>
          {match.config.teams[leftTeam].name}
        </span>
        <span />
        <span className={rightColorClass}>
          {match.config.teams[rightTeam].name}
        </span>
      </div>

      {/* Vertical-net court layout */}
      <div className="court-layout-v">
        {/* LEFT half — right court on top, left court on bottom */}
        <div className="court-half-v">
          {renderSlot(match, leftTeam, "right")}
          {renderSlot(match, leftTeam, "left")}
        </div>

        {/* Vertical net */}
        <div className="court-net-v">Net</div>

        {/* RIGHT half — left court on top (mirrored), right court on bottom */}
        <div className="court-half-v">
          {renderSlot(match, rightTeam, "left")}
          {renderSlot(match, rightTeam, "right")}
        </div>
      </div>
    </div>
  );
};
