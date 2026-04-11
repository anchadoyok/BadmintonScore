import { getPlayerCourtSide, getPlayerLabel } from "../lib/badmintonRules";
import type { CourtSide, MatchState, TeamId } from "../types/match";

interface MiniCourtProps {
  match: MatchState;
}

/**
 * Render one service-court cell.
 *
 * @param match       Live match state.
 * @param teamId      Which team owns this cell.
 * @param playerSide  The player's OWN court side ("left" or "right" from their perspective).
 * @param label       Umpire-POV column label ("LEFT" or "RIGHT") shown in the cell.
 */
const renderPlayerSlot = (
  match: MatchState,
  teamId: TeamId,
  playerSide: CourtSide,
  label: string
) => {
  const player = match.config.teams[teamId].players.find(
    (entry) => getPlayerCourtSide(match, teamId, entry.id) === playerSide
  );

  if (!player) {
    return <div className="court-player court-player--empty" />;
  }

  const isServer = player.id === match.service.serverPlayerId;
  const isReceiver = player.id === match.service.receiverPlayerId;

  return (
    <div className={isServer ? "court-player is-server" : isReceiver ? "court-player is-receiver" : "court-player"}>
      <span>{getPlayerLabel(match, player.id)}</span>
      <small>{label}</small>
      {isServer && <strong>Server</strong>}
      {isReceiver && <strong>Receiver</strong>}
    </div>
  );
};

export const MiniCourt = ({ match }: MiniCourtProps) => {
  const uiSideSwapped = match.uiSideSwapped ?? false;

  /**
   * Physical layout from the umpire's chair:
   *
   *   FAR  team (top):   their RIGHT court is on the UMPIRE'S LEFT column,
   *                      because they face TOWARD the umpire (opposite direction to near team).
   *   NEAR team (bottom): their LEFT court is on the UMPIRE'S LEFT column  (normal orientation).
   *
   * Default:   near = A, far = B
   * Swapped:   near = B, far = A  (teams changed ends after set 1)
   */
  const nearTeam: TeamId = uiSideSwapped ? "B" : "A";
  const farTeam: TeamId = uiSideSwapped ? "A" : "B";

  return (
    <div className="court-card">
      <div className="court-header">
        <div>
          <p className="eyebrow">Live positioning</p>
          <h3>Doubles mini court</h3>
        </div>
        <span className="stat-chip">{match.service.serviceSide} serve</span>
      </div>

      {/* Umpire-POV column headers */}
      <div className="court-col-labels">
        <span>LEFT</span>
        <span>RIGHT</span>
      </div>

      <div className="court-grid">
        {/*
          FAR team (top row) — facing TOWARD the umpire.
          Their "right" court is physically on the umpire's LEFT.
          Render right first → appears in left column.
        */}
        {renderPlayerSlot(match, farTeam, "right", "LEFT")}
        {renderPlayerSlot(match, farTeam, "left", "RIGHT")}

        <div className="court-net">Net</div>

        {/*
          NEAR team (bottom row) — facing AWAY from the umpire.
          Their "left" is umpire's left, "right" is umpire's right (normal).
        */}
        {renderPlayerSlot(match, nearTeam, "left", "LEFT")}
        {renderPlayerSlot(match, nearTeam, "right", "RIGHT")}
      </div>

      {/* Team labels so the umpire knows who is who */}
      <div className="court-team-labels">
        <span className={farTeam === "A" ? "court-label-a" : "court-label-b"}>
          ↑ {match.config.teams[farTeam].name} (far)
        </span>
        <span className={nearTeam === "A" ? "court-label-a" : "court-label-b"}>
          ↓ {match.config.teams[nearTeam].name} (near)
        </span>
      </div>
    </div>
  );
};
