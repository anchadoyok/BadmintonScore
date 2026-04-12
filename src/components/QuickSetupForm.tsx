import { useState } from "react";

interface QuickSetupFormProps {
  onStart: (teamAName: string, teamBName: string) => void;
  onCancel: () => void;
}

export const QuickSetupForm = ({ onStart, onCancel }: QuickSetupFormProps) => {
  const [teamA, setTeamA] = useState("Us");
  const [teamB, setTeamB] = useState("Them");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onStart(teamA.trim() || "Us", teamB.trim() || "Them");
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quick match</p>
          <h2>Jump straight in</h2>
        </div>
        <button className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <form className="stack-lg" onSubmit={handleSubmit}>
        <p className="muted">
          Singles format, 21 pts, win by 2. No player names, no fuss.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Team A name</span>
            <input
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="Us"
              autoFocus
            />
          </label>
          <label className="field">
            <span>Team B name</span>
            <input
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="Them"
            />
          </label>
        </div>

        <button className="primary-button" type="submit">
          Start Quick Match
        </button>
      </form>
    </section>
  );
};
