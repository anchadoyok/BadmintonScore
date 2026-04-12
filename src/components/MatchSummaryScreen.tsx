import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useRef, useState } from "react";
import { getTeamLabel } from "../lib/badmintonRules";
import { formatDateTime, formatElapsed } from "../lib/format";
import type { CompletedMatchSummary, MatchState } from "../types/match";

interface MatchSummaryScreenProps {
  match: MatchState;
  summary: CompletedMatchSummary;
  onSave: () => void;
  onRematch: () => void;
  onHome: () => void;
  onClearCurrent: () => void;
}

const SITE_URL = "badminton-score.vercel.app";

const buildShareText = (summary: CompletedMatchSummary, winnerName: string): string => {
  const setLine =
    summary.sets && summary.sets.length > 0
      ? summary.sets.map((s) => `Set ${s.setNumber}: ${s.scoreA}–${s.scoreB}`).join(" | ")
      : `Score: ${summary.scoreA}–${summary.scoreB}`;

  return [
    "🏸 Badminton Match Result",
    `${summary.teamAName} vs ${summary.teamBName}`,
    setLine,
    `Winner: ${winnerName} 🏆`,
    `Duration: ${formatElapsed(summary.durationSeconds)}`
  ].join("\n");
};

export const MatchSummaryScreen = ({
  match,
  summary,
  onSave,
  onRematch,
  onHome,
  onClearCurrent
}: MatchSummaryScreenProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copyLabel, setCopyLabel] = useState("Copy / Share");
  const [isCapturing, setIsCapturing] = useState(false);

  const winnerName = getTeamLabel(match, summary.winnerTeam);
  const shareText = buildShareText(summary, winnerName);

  // ── 1A: Copy / Web Share API ────────────────────────────────────────────
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Badminton Match Result", text: shareText });
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyLabel("Copied! ✓");
      setTimeout(() => setCopyLabel("Copy / Share"), 2200);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy / Share"), 2200);
    }
  };

  // ── 1B: Download PNG ────────────────────────────────────────────────────
  const handleDownloadImage = async () => {
    if (!cardRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0b1c17",
        scale: 2,
        useCORS: true
      });
      const link = document.createElement("a");
      link.download = "match-result.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };

  // ── 1C: Download PDF ────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    let y = margin;

    // Background
    doc.setFillColor(11, 28, 23);
    doc.rect(0, 0, 210, 297, "F");

    // App label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(244, 211, 94);
    doc.text("BADMINTON MATCH ASSISTANT", margin, y);
    y += 14;

    // Match heading
    doc.setFontSize(28);
    doc.setTextColor(245, 251, 246);
    doc.text(`${summary.teamAName} vs ${summary.teamBName}`, margin, y);
    y += 12;

    doc.setFontSize(13);
    doc.setTextColor(180, 202, 190);
    doc.text(formatDateTime(summary.completedAt), margin, y);
    y += 16;

    // Divider
    doc.setDrawColor(244, 211, 94);
    doc.setLineWidth(0.4);
    doc.line(margin, y, 210 - margin, y);
    y += 12;

    // Sets or score
    if (summary.sets && summary.sets.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(244, 211, 94);
      doc.text("SET SCORES", margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(245, 251, 246);
      for (const s of summary.sets) {
        doc.text(
          `Set ${s.setNumber}:  ${summary.teamAName} ${s.scoreA} – ${s.scoreB} ${summary.teamBName}`,
          margin,
          y
        );
        y += 8;
      }
    } else {
      doc.setFontSize(13);
      doc.setTextColor(245, 251, 246);
      doc.text(`Final Score: ${summary.scoreA} – ${summary.scoreB}`, margin, y);
      y += 8;
    }
    y += 8;

    // Winner
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(116, 198, 157);
    doc.text(`Winner: ${winnerName}`, margin, y);
    y += 12;

    // Meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(180, 202, 190);
    doc.text(`Duration: ${formatElapsed(summary.durationSeconds)}`, margin, y);
    y += 8;
    doc.text(`Format: ${summary.matchType}`, margin, y);

    // Footer URL
    doc.setFontSize(9);
    doc.setTextColor(100, 140, 120);
    doc.text(SITE_URL, margin, 285);

    doc.save("match-result.pdf");
  };

  return (
    <section className="panel stack-lg">
      {/* ── Result hero ───────────────────────────────────────────────────── */}
      <div className="summary-hero">
        <p className="eyebrow">Match complete</p>
        <h2>{winnerName} wins</h2>
        {summary.sets && summary.sets.length > 0 ? (
          <div className="set-badges" style={{ marginTop: "0.5rem" }}>
            {summary.sets.map((set) => (
              <span
                key={set.setNumber}
                className={`set-badge ${set.winner === "A" ? "set-badge-a" : "set-badge-b"}`}
              >
                Set {set.setNumber}: {set.scoreA}–{set.scoreB}
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">
            Final score {summary.scoreA}–{summary.scoreB}
          </p>
        )}
        <p className="muted">{formatElapsed(summary.durationSeconds)}</p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="status-grid">
        <article className="status-card">
          <span className="eyebrow">Team A</span>
          <strong>{summary.teamAName}</strong>
          <p>
            {match.setWins?.A ?? 0} set{(match.setWins?.A ?? 0) !== 1 ? "s" : ""} won
          </p>
        </article>
        <article className="status-card">
          <span className="eyebrow">Team B</span>
          <strong>{summary.teamBName}</strong>
          <p>
            {match.setWins?.B ?? 0} set{(match.setWins?.B ?? 0) !== 1 ? "s" : ""} won
          </p>
        </article>
        <article className="status-card">
          <span className="eyebrow">Finished</span>
          <strong>{formatDateTime(summary.completedAt)}</strong>
          <p>{summary.matchType}</p>
        </article>
      </div>

      {/* ── Action toolbar ────────────────────────────────────────────────── */}
      <div className="toolbar">
        <button className="primary-button" onClick={onSave} disabled={match.savedToHistory}>
          {match.savedToHistory ? "Saved ✓" : "Save to history"}
        </button>
        <button className="secondary-button" onClick={onRematch}>
          Rematch
        </button>
        <button className="secondary-button" onClick={onHome}>
          Back home
        </button>
        <button className="ghost-danger" onClick={onClearCurrent}>
          Clear match
        </button>
      </div>

      {/* ── Share section ─────────────────────────────────────────────────── */}
      <div className="share-section">
        <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Share result</p>
        <div className="share-toolbar">
          <button className="secondary-button" onClick={handleShare}>
            📋 {copyLabel}
          </button>
          <button
            className="secondary-button"
            onClick={handleDownloadImage}
            disabled={isCapturing}
          >
            {isCapturing ? "Capturing…" : "🖼 Save image"}
          </button>
          <button className="secondary-button" onClick={handleDownloadPDF}>
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* ── Hidden share card (html2canvas target) ───────────────────────── */}
      <div ref={cardRef} className="share-card" aria-hidden="true">
        <div className="share-card-header">
          <span className="share-card-app">🏸 Badminton Score</span>
        </div>
        <div className="share-card-winner">{winnerName} wins 🏆</div>
        <div className="share-card-matchup">
          {summary.teamAName} vs {summary.teamBName}
        </div>
        {summary.sets && summary.sets.length > 0 && (
          <div className="share-card-sets">
            {summary.sets.map((s) => (
              <span
                key={s.setNumber}
                className={`set-badge ${s.winner === "A" ? "set-badge-a" : "set-badge-b"}`}
              >
                Set {s.setNumber}: {s.scoreA}–{s.scoreB}
              </span>
            ))}
          </div>
        )}
        <div className="share-card-meta">
          <span>⏱ {formatElapsed(summary.durationSeconds)}</span>
          <span>{formatDateTime(summary.completedAt)}</span>
        </div>
        <div className="share-card-url">{SITE_URL}</div>
      </div>
    </section>
  );
};
