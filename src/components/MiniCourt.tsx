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
 * Physical mapping — players face the net:
 *
 *   LEFT SIDE team (faces →)            RIGHT SIDE team (faces ←)
 *   ──────────────────────────  Net │  ──────────────────────────
 *   [their LEFT  court]  (top)   │  │  [their RIGHT court] (top)
 *   [their RIGHT court]  (bot)   │  │  [their LEFT  court] (bot)
 *
 * Right serve → server LEFT-BOT, receiver RIGHT-TOP  → diagonal ✓
 * Left  serve → server LEFT-TOP, receiver RIGHT-BOT  → diagonal ✓
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
        {/*
          LEFT half — player faces RIGHT (toward net).
          Their right hand points DOWN  → RIGHT court = bottom.
          Their left  hand points UP    → LEFT  court = top.
        */}
        <div className="court-half-v">
          {renderSlot(match, leftTeam, "left")}   {/* top    */}
          {renderSlot(match, leftTeam, "right")}  {/* bottom */}
        </div>

        {/* Vertical net */}
        <div className="court-net-v">Net</div>

        {/*
          RIGHT half — player faces LEFT (toward net).
          Their right hand points UP   → RIGHT court = top.
          Their left  hand points DOWN → LEFT  court = bottom.
        */}
        <div className="court-half-v">
          {renderSlot(match, rightTeam, "right")}  {/* top    */}
          {renderSlot(match, rightTeam, "left")}   {/* bottom */}
        </div>
      </div>
    </div>
  );
};
