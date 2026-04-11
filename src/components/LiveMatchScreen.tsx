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
  onDismissInterval: () => void;
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
  onDismissInterval,
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

  // ── Umpire POV: which team is on the left / right UI column ──────────────
  const uiSideSwapped = match.uiSideSwapped ?? false;
  const leftTeamId: TeamId = uiSideSwapped ? "B" : "A";
  const rightTeamId: TeamId = uiSideSwapped ? "A" : "B";

  const completedSets = match.completedSets ?? [];
  const currentSet = match.currentSet ?? 1;
  const set3IntervalPending = match.set3IntervalPending ?? false;

  const correctionPlayers = useMemo(
    () => ({
      serving: match.config.teams[draft.servingTeam].players,
      receiving: match.config.teams[draft.servingTeam === "A" ? "B" : "A"].players
    }),
    [draft.servingTeam, match.config.teams]
  );

  // ── Helpers for team panels ───────────────────────────────────────────────
  const renderTeamPanel = (teamId: TeamId) => {
    const isServing = match.service.servingTeam === teamId;
    const isReceiving = match.service.receivingTeam === teamId;
    const playerName = isServing
      ? getPlayerLabel(match, match.service.serverPlayerId)
      : isReceiving
        ? getPlayerLabel(match, match.service.receiverPlayerId)
        : "";
    const role = isServing ? "Server" : isReceiving ? "Receiver" : "";
    const colorClass = teamId === "A" ? "team-a" : "team-b";

    return (
      <div className={`live-score-card ${colorClass}`}>
        <div className="live-score-top">
          <p className="live-team-name">{getTeamLabel(match, teamId)}</p>
        </div>
        <strong className="live-score-number">{match.teamState[teamId].score}</strong>
        <div className="live-score-bottom">
          {role && (
            <>
              <span className="eyebrow">{role}</span>
              <p>{playerName}</p>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="panel stack-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            Live match · Set {currentSet}
            {match.setWins && (match.setWins.A > 0 || match.setWins.B > 0) && (
              <> · Sets {match.setWins.A}–{match.setWins.B}</>
            )}
          </p>
          <h2>
            {getTeamLabel(match, "A")} vs {getTeamLabel(match, "B")}
          </h2>
        </div>
        <div className="inline-actions">
          <span className="muted">{formatElapsed(elapsedSeconds)}</span>
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

      {/* ── Set history banner ─────────────────────────────────────────────── */}
      {completedSets.length > 0 && (
        <div className="set-history">
          <span className="eyebrow">Set history</span>
          <div className="set-badges">
            {completedSets.map((set) => (
              <span
                key={set.setNumber}
                className={`set-badge ${set.winner === "A" ? "set-badge-a" : "set-badge-b"}`}
              >
                Set {set.setNumber}: {getTeamLabel(match, "A")} {set.scoreA}–{set.scoreB} {getTeamLabel(match, "B")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Set 3 court-change prompt ──────────────────────────────────────── */}
      {set3IntervalPending && (
        <div className="interval-prompt">
          <div>
            <p className="eyebrow">Court change — Set 3</p>
            <strong>Leading side reached 11 pts. Players change ends now.</strong>
          </div>
          <button className="accent-button" onClick={onDismissInterval}>
            ✓ Ends changed
          </button>
        </div>
      )}

      {/* ── Left / Right score columns (umpire POV) ────────────────────────── */}
      <div className="live-columns">
        {renderTeamPanel(leftTeamId)}
        {renderTeamPanel(rightTeamId)}
      </div>

      {/* ── Court visual / singles guidance ───────────────────────────────── */}
      {match.config.matchType === "doubles" ? (
        <MiniCourt match={match} />
      ) : (
        <div className="singles-card">
          <p className="eyebrow">Singles guidance</p>
          <h3>
            {getPlayerLabel(match, match.service.serverPlayerId)} serves from the{" "}
            {match.service.serviceSide} service court.
          </h3>
          <p className="muted">
            Receiver is {getPlayerLabel(match, match.service.receiverPlayerId)}. Side updates
            automatically from the serving score parity.
          </p>
        </div>
      )}

      {/* ── Point buttons (left team / right team) ────────────────────────── */}
      <div className="action-grid">
        <button
          className={`point-button ${leftTeamId === "A" ? "point-a" : "point-b"}`}
          onClick={() => onScore(leftTeamId)}
          disabled={match.status === "completed"}
        >
          Point for {getTeamLabel(match, leftTeamId)}
        </button>
        <button
          className={`point-button ${rightTeamId === "A" ? "point-a" : "point-b"}`}
          onClick={() => onScore(rightTeamId)}
          disabled={match.status === "completed"}
        >
          Point for {getTeamLabel(match, rightTeamId)}
        </button>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="toolbar">
        <button className="secondary-button" onClick={onUndo} disabled={match.undoStack.length === 0}>
          Undo last point
        </button>
        <button className="secondary-button" onClick={() => setShowCorrection((v) => !v)}>
          {showCorrection ? "Hide correction" : "Correction mode"}
        </button>
        <button
          className="ghost-danger"
          onClick={() => {
            if (window.confirm("Reset this match and all scores?")) {
              onReset();
            }
          }}
        >
          Reset match
        </button>
      </div>

      {/* ── Correction panel ──────────────────────────────────────────────── */}
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
            Doubles correction needs server, receiver, and side because score alone does not uniquely determine court
            rotation.
          </p>

          <button className="accent-button" type="submit">
            Apply correction
          </button>
        </form>
      )}
    </section>
  );
};
