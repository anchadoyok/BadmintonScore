import { useMemo, useState } from "react";
import type { MatchSetupInput, MatchType, TeamId } from "../types/match";

interface MatchSetupFormProps {
  onStart: (setup: MatchSetupInput) => void;
  onCancel: () => void;
}

interface SetupFormState {
  matchType: MatchType;
  teamAName: string;
  teamBName: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  targetPoints: number;
  winBy: number;
  maxPoints: number;
  initialServerTeam: TeamId;
}

const initialState: SetupFormState = {
  matchType: "doubles",
  teamAName: "Team A",
  teamBName: "Team B",
  teamAPlayers: ["Player A1", "Player A2"],
  teamBPlayers: ["Player B1", "Player B2"],
  targetPoints: 21,
  winBy: 2,
  maxPoints: 30,
  initialServerTeam: "A"
};

export const MatchSetupForm = ({ onStart, onCancel }: MatchSetupFormProps) => {
  const [form, setForm] = useState<SetupFormState>(initialState);
  const [initialServerPlayerId, setInitialServerPlayerId] = useState<string>("A-1");

  const servingPlayers = useMemo(
    () => (form.initialServerTeam === "A" ? form.teamAPlayers : form.teamBPlayers),
    [form.initialServerTeam, form.teamAPlayers, form.teamBPlayers]
  );

  const handleMatchTypeChange = (matchType: MatchType) => {
    setForm((current) => ({
      ...current,
      matchType,
      teamAPlayers: matchType === "singles" ? [current.teamAPlayers[0]] : [current.teamAPlayers[0], current.teamAPlayers[1] ?? ""],
      teamBPlayers: matchType === "singles" ? [current.teamBPlayers[0]] : [current.teamBPlayers[0], current.teamBPlayers[1] ?? ""]
    }));
    setInitialServerPlayerId("A-1");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onStart({
      ...form,
      teamAPlayers: form.matchType === "singles" ? [form.teamAPlayers[0]] : form.teamAPlayers,
      teamBPlayers: form.matchType === "singles" ? [form.teamBPlayers[0]] : form.teamBPlayers,
      initialServerPlayerId: form.matchType === "doubles" ? initialServerPlayerId : undefined
    });
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">New match</p>
          <h2>Set up the game</h2>
        </div>
        <button className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <form className="stack-lg" onSubmit={handleSubmit}>
        <div className="segment">
          <button
            type="button"
            className={form.matchType === "singles" ? "segment-option is-active" : "segment-option"}
            onClick={() => handleMatchTypeChange("singles")}
          >
            Singles
          </button>
          <button
            type="button"
            className={form.matchType === "doubles" ? "segment-option is-active" : "segment-option"}
            onClick={() => handleMatchTypeChange("doubles")}
          >
            Doubles
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Team A name</span>
            <input value={form.teamAName} onChange={(event) => setForm({ ...form, teamAName: event.target.value })} />
          </label>
          <label className="field">
            <span>Team B name</span>
            <input value={form.teamBName} onChange={(event) => setForm({ ...form, teamBName: event.target.value })} />
          </label>
        </div>

        <div className="player-columns">
          <div className="player-card">
            <h3>{form.teamAName || "Team A"}</h3>
            {form.teamAPlayers.map((player, index) => (
              <label className="field" key={`team-a-${index}`}>
                <span>{form.matchType === "singles" ? "Player" : `Player ${index + 1}`}</span>
                <input
                  value={player}
                  onChange={(event) => {
                    const nextPlayers = [...form.teamAPlayers];
                    nextPlayers[index] = event.target.value;
                    setForm({ ...form, teamAPlayers: nextPlayers });
                  }}
                />
              </label>
            ))}
          </div>

          <div className="player-card">
            <h3>{form.teamBName || "Team B"}</h3>
            {form.teamBPlayers.map((player, index) => (
              <label className="field" key={`team-b-${index}`}>
                <span>{form.matchType === "singles" ? "Player" : `Player ${index + 1}`}</span>
                <input
                  value={player}
                  onChange={(event) => {
                    const nextPlayers = [...form.teamBPlayers];
                    nextPlayers[index] = event.target.value;
                    setForm({ ...form, teamBPlayers: nextPlayers });
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Target points</span>
            <input
              type="number"
              min={1}
              value={form.targetPoints}
              onChange={(event) => setForm({ ...form, targetPoints: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Win by</span>
            <input
              type="number"
              min={1}
              value={form.winBy}
              onChange={(event) => setForm({ ...form, winBy: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Max cap</span>
            <input
              type="number"
              min={form.targetPoints}
              value={form.maxPoints}
              onChange={(event) => setForm({ ...form, maxPoints: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Initial serving team</span>
            <select
              value={form.initialServerTeam}
              onChange={(event) => {
                const team = event.target.value as TeamId;
                setForm({ ...form, initialServerTeam: team });
                setInitialServerPlayerId(team === "A" ? "A-1" : "B-1");
              }}
            >
              <option value="A">{form.teamAName || "Team A"}</option>
              <option value="B">{form.teamBName || "Team B"}</option>
            </select>
          </label>

          {form.matchType === "doubles" && (
            <label className="field">
              <span>First server</span>
              <select value={initialServerPlayerId} onChange={(event) => setInitialServerPlayerId(event.target.value)}>
                {servingPlayers.map((player, index) => {
                  const id = `${form.initialServerTeam}-${index + 1}`;
                  return (
                    <option key={id} value={id}>
                      {player || `Player ${form.initialServerTeam}${index + 1}`}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
        </div>

        <p className="muted">
          Standard badminton starts at 0-0 with service from the right court. Detailed side overrides are handled in correction mode.
        </p>

        <button className="primary-button" type="submit">
          Start Match
        </button>
      </form>
    </section>
  );
};
