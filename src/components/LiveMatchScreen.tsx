import { useEffect, useMemo, useState } from "react";
import { getPlayerLabel, getTeamLabel } from "../lib/badmintonRules";
import { formatElapsed } from "../lib/format";
import type { ManualCorrectionInput, MatchState, TeamId } from "../types/match";
import { MiniCourt } from "./MiniCourt";

interface LiveMatchScreenProps {
  match: MatchState;
  onScore: (teamId: TeamId) => void;
  onUndo: () => void;
  onReset: () => void;
  onCorrection: (input: ManualCorrectionInput) => void;
  onFinishView: () => void;
  onExit: () => void;
}

interface CorrectionDraft {
  scoreA: number;
  scoreB: number;
  servingTeam: TeamId;
  serviceSide: "left" | "right";
  serverPlayerId?: string;
  receiverPlayerId?: string;
}

const buildDraft = (match: MatchState): CorrectionDraft => ({
  scoreA: match.teamState.A.score,
  scoreB: match.teamState.B.score,
  servingTeam: match.service.servingTeam,
  serviceSide: match.service.serviceSide,
  serverPlayerId: match.service.serverPlayerId,
  receiverPlayerId: match.service.receiverPlayerId
});

export const LiveMatchScreen = ({
  match,
  onScore,
  onUndo,
  onReset,
  onCorrection,
  onFinishView,
  onExit
}: LiveMatchScreenProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCorrection, setShowCorrection] = useState(false);
  const [draft, setDraft] = useState<CorrectionDraft>(() => buildDraft(match));

  useEffect(() => {
    setDraft(buildDraft(match));
  }, [match]);

  useEffect(() => {
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(match.createdAt).getTime()) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [match.createdAt]);

  const servingTeamName = getTeamLabel(match, match.service.servingTeam);
  const receivingTeamName = getTeamLabel(match, match.service.receivingTeam);
  const serverName = getPlayerLabel(match, match.service.serverPlayerId);
  const receiverName = getPlayerLabel(match, match.service.receiverPlayerId);

  const correctionPlayers = useMemo(
    () => ({
      serving: match.config.teams[draft.servingTeam].players,
      receiving: match.config.teams[draft.servingTeam === "A" ? "B" : "A"].players
    }),
    [draft.servingTeam, match.config.teams]
  );

  return (
    <section className="panel stack-lg">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live match</p>
          <h2>
            {getTeamLabel(match, "A")} vs {getTeamLabel(match, "B")}
          </h2>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" onClick={onExit}>
            Home
          </button>
          {match.status === "completed" && (
            <button className="accent-button" onClick={onFinishView}>
              Match Summary
            </button>
          )}
        </div>
      </div>

      <div className="scoreboard">
        <article className="score-card team-a">
          <p>{getTeamLabel(match, "A")}</p>
          <strong>{match.teamState.A.score}</strong>
        </article>
        <article className="score-card team-b">
          <p>{getTeamLabel(match, "B")}</p>
          <strong>{match.teamState.B.score}</strong>
        </article>
      </div>

      <div className="status-grid">
        <article className="status-card">
          <span className="eyebrow">Serving team</span>
          <strong>{servingTeamName}</strong>
          <p>{serverName}</p>
        </article>
        <article className="status-card">
          <span className="eyebrow">Receiving team</span>
          <strong>{receivingTeamName}</strong>
          <p>{receiverName}</p>
        </article>
        <article className="status-card">
          <span className="eyebrow">Service court</span>
          <strong>{match.service.serviceSide}</strong>
          <p>{match.config.matchType}</p>
        </article>
        <article className="status-card">
          <span className="eyebrow">Duration</span>
          <strong>{formatElapsed(elapsedSeconds)}</strong>
          <p>Running live</p>
        </article>
      </div>

      {match.config.matchType === "doubles" ? (
        <MiniCourt match={match} />
      ) : (
        <div className="singles-card">
          <p className="eyebrow">Singles guidance</p>
          <h3>{serverName} serves from the {match.service.serviceSide} service court.</h3>
          <p className="muted">The receiver is {receiverName}. Side updates automatically from the serving score parity.</p>
        </div>
      )}

      <div className="action-grid">
        <button className="point-button point-a" onClick={() => onScore("A")} disabled={match.status === "completed"}>
          Point for {getTeamLabel(match, "A")}
        </button>
        <button className="point-button point-b" onClick={() => onScore("B")} disabled={match.status === "completed"}>
          Point for {getTeamLabel(match, "B")}
        </button>
      </div>

      <div className="toolbar">
        <button className="secondary-button" onClick={onUndo} disabled={match.undoStack.length === 0}>
          Undo last point
        </button>
        <button className="secondary-button" onClick={() => setShowCorrection((value) => !value)}>
          {showCorrection ? "Hide correction" : "Correction mode"}
        </button>
        <button
          className="ghost-danger"
          onClick={() => {
            if (window.confirm("Reset this match and scores?")) {
              onReset();
            }
          }}
        >
          Reset match
        </button>
      </div>

      {showCorrection && (
        <form
          className="correction-card"
          onSubmit={(event) => {
            event.preventDefault();
            onCorrection(draft);
            setShowCorrection(false);
          }}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin correction</p>
              <h3>Repair score and service state</h3>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Score A</span>
              <input
                type="number"
                min={0}
                value={draft.scoreA}
                onChange={(event) => setDraft({ ...draft, scoreA: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Score B</span>
              <input
                type="number"
                min={0}
                value={draft.scoreB}
                onChange={(event) => setDraft({ ...draft, scoreB: Number(event.target.value) })}
              />
            </label>
            <label className="field">
              <span>Serving team</span>
              <select
                value={draft.servingTeam}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    servingTeam: event.target.value as TeamId,
                    serverPlayerId: undefined,
                    receiverPlayerId: undefined
                  })
                }
              >
                <option value="A">{getTeamLabel(match, "A")}</option>
                <option value="B">{getTeamLabel(match, "B")}</option>
              </select>
            </label>
            <label className="field">
              <span>Service side</span>
              <select
                value={draft.serviceSide}
                onChange={(event) => setDraft({ ...draft, serviceSide: event.target.value as "left" | "right" })}
              >
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </label>
          </div>

          {match.config.matchType === "doubles" && (
            <div className="form-grid">
              <label className="field">
                <span>Current server</span>
                <select
                  value={draft.serverPlayerId}
                  onChange={(event) => setDraft({ ...draft, serverPlayerId: event.target.value })}
                >
                  {correctionPlayers.serving.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Current receiver</span>
                <select
                  value={draft.receiverPlayerId}
                  onChange={(event) => setDraft({ ...draft, receiverPlayerId: event.target.value })}
                >
                  {correctionPlayers.receiving.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <p className="muted">
            Doubles correction needs server, receiver, and side because score alone does not uniquely determine court rotation.
          </p>

          <button className="accent-button" type="submit">
            Apply correction
          </button>
        </form>
      )}
    </section>
  );
};
