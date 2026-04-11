import { getPlayerCourtSide, getPlayerLabel } from "../lib/badmintonRules";
import type { MatchState, TeamId } from "../types/match";

interface MiniCourtProps {
  match: MatchState;
}

const renderPlayerSlot = (match: MatchState, teamId: TeamId, side: "left" | "right") => {
  const player = match.config.teams[teamId].players.find(
    (entry) => getPlayerCourtSide(match, teamId, entry.id) === side
  );

  if (!player) {
    return null;
  }

  const isServer = player.id === match.service.serverPlayerId;
  const isReceiver = player.id === match.service.receiverPlayerId;

  return (
    <div className={isServer ? "court-player is-server" : isReceiver ? "court-player is-receiver" : "court-player"}>
      <span>{getPlayerLabel(match, player.id)}</span>
      <small>{side}</small>
      {isServer && <strong>Server</strong>}
      {isReceiver && <strong>Receiver</strong>}
    </div>
  );
};

export const MiniCourt = ({ match }: MiniCourtProps) => (
  <div className="court-card">
    <div className="court-header">
      <div>
        <p className="eyebrow">Live positioning</p>
        <h3>Doubles mini court</h3>
      </div>
      <span className="stat-chip">{match.service.serviceSide} serve</span>
    </div>

    <div className="court-grid">
      {renderPlayerSlot(match, "B", "left")}
      {renderPlayerSlot(match, "B", "right")}
      <div className="court-net">Net</div>
      {renderPlayerSlot(match, "A", "left")}
      {renderPlayerSlot(match, "A", "right")}
    </div>
  </div>
);
