import { getPlayerLabel } from "../lib/badmintonRules";
import type { MatchState } from "../types/match";

interface SinglesCourtProps {
  match: MatchState;
}

/**
 * Top-down SVG badminton court for singles.
 *
 * Umpire POV: net is the vertical centre line.
 * Left side = team shown on left (A by default, B when uiSideSwapped).
 * Service box parity: server's score even → right box, odd → left box.
 * Receiver is always diagonally opposite.
 */
export const SinglesCourt = ({ match }: SinglesCourtProps) => {
  const uiSideSwapped = match.uiSideSwapped ?? false;
  const leftTeamId = uiSideSwapped ? "B" : "A";
  const rightTeamId = uiSideSwapped ? "A" : "B";

  const servingTeam = match.service.servingTeam;
  const serverIsLeft = servingTeam === leftTeamId;

  const serverName = getPlayerLabel(match, match.service.serverPlayerId);
  const receiverName = getPlayerLabel(match, match.service.receiverPlayerId);

  // service side from the SERVER's own perspective ("right" = even score)
  const serviceSide = match.service.serviceSide; // "right" | "left"

  // ── SVG coordinate system ────────────────────────────────────────────────
  // Court is 400 wide × 220 tall (umpire sees it landscape, net is vertical centre)
  const W = 400;
  const H = 220;
  const cx = W / 2; // net x

  // Singles sidelines: 15% inset from each horizontal edge
  const sidelineInset = 0.1 * H;
  const topLine = sidelineInset;
  const botLine = H - sidelineInset;

  // Short service line: 25% from net on each side
  const ssl = 0.25 * cx; // distance from net
  const leftSsl = cx - ssl;
  const rightSsl = cx + ssl;

  // Back service line (singles = full back)
  const leftBack = 12;
  const rightBack = W - 12;

  // ── Player positions ──────────────────────────────────────────────────────
  // Server side
  const serverSideLeft = serverIsLeft;
  // "right" service box from the player's POV:
  //   left-side player faces right → their "right" = bottom half of court
  //   right-side player faces left → their "right" = top half of court
  const serverInBottom = serverSideLeft
    ? serviceSide === "right"
    : serviceSide !== "right";

  const serverX = serverSideLeft
    ? (leftBack + leftSsl) / 2
    : (rightSsl + rightBack) / 2;
  const serverY = serverInBottom ? (H / 2 + botLine) / 2 : (topLine + H / 2) / 2;

  // Receiver is diagonally opposite
  const receiverInBottom = !serverInBottom;
  const receiverX = serverSideLeft
    ? (rightSsl + rightBack) / 2
    : (leftBack + leftSsl) / 2;
  const receiverY = receiverInBottom ? (H / 2 + botLine) / 2 : (topLine + H / 2) / 2;

  const leftName = match.config.teams[leftTeamId].name;
  const rightName = match.config.teams[rightTeamId].name;
  const leftColor = leftTeamId === "A" ? "var(--team-a)" : "var(--team-b)";
  const rightColor = rightTeamId === "A" ? "var(--team-a)" : "var(--team-b)";

  return (
    <div className="court-card">
      <div className="court-header">
        <div>
          <p className="eyebrow">Live positioning</p>
          <h3>Singles court</h3>
        </div>
        <span className="stat-chip">{serviceSide} serve</span>
      </div>

      {/* Team name labels */}
      <div className="court-side-labels">
        <span style={{ color: leftColor, fontWeight: 700 }}>{leftName}</span>
        <span />
        <span style={{ color: rightColor, fontWeight: 700, textAlign: "right" }}>{rightName}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", borderRadius: 14, overflow: "hidden" }}
        role="img"
        aria-label="Singles badminton court diagram"
      >
        {/* Court surface (Tournament Blue) */}
        <rect x={0} y={0} width={W} height={H} fill="#142654" rx={14} />

        {/* Outer boundary */}
        <rect
          x={leftBack}
          y={topLine}
          width={rightBack - leftBack}
          height={botLine - topLine}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.75}
          strokeWidth={1.5}
        />

        {/* Centre (horizontal midline) */}
        <line
          x1={leftBack}
          y1={H / 2}
          x2={rightBack}
          y2={H / 2}
          stroke="#ffffff"
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Net (vertical centre) */}
        <line
          x1={cx}
          y1={topLine}
          x2={cx}
          y2={botLine}
          stroke="#ffffff"
          strokeWidth={2.5}
        />
        <text x={cx} y={topLine - 4} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.9)" fontWeight="bold">
          NET
        </text>

        {/* Short service lines */}
        <line
          x1={leftSsl}
          y1={topLine}
          x2={leftSsl}
          y2={botLine}
          stroke="#ffffff"
          strokeOpacity={0.6}
          strokeWidth={1}
        />
        <line
          x1={rightSsl}
          y1={topLine}
          x2={rightSsl}
          y2={botLine}
          stroke="#ffffff"
          strokeOpacity={0.6}
          strokeWidth={1}
        />

        {/* ── Diagonal serve trajectory ─────────────────────────────────── */}
        <line
          x1={serverX}
          y1={serverY}
          x2={receiverX}
          y2={receiverY}
          stroke="rgba(244,211,94,0.4)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* ── Server marker ─────────────────────────────────────────────── */}
        <circle
          cx={serverX}
          cy={serverY}
          r={15}
          fill={serverIsLeft ? leftColor : rightColor}
          stroke="#f4d35e"
          strokeWidth={2}
          opacity={0.95}
        />
        <text
          x={serverX}
          y={serverY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7.5}
          fontWeight="bold"
          fill="#fff"
        >
          {serverName.slice(0, 6)}
        </text>
        <text
          x={serverX}
          y={serverY + 22}
          textAnchor="middle"
          fontSize={7.5}
          fill="rgba(244,211,94,1)"
          fontWeight="bold"
        >
          🏸 SERVER
        </text>

        {/* ── Receiver marker ───────────────────────────────────────────── */}
        <circle
          cx={receiverX}
          cy={receiverY}
          r={15}
          fill="none"
          stroke={serverIsLeft ? rightColor : leftColor}
          strokeWidth={2.5}
          strokeDasharray="2 2"
          opacity={0.95}
        />
        <text
          x={receiverX}
          y={receiverY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7.5}
          fontWeight="bold"
          fill={serverIsLeft ? rightColor : leftColor}
        >
          {receiverName.slice(0, 6)}
        </text>
        <text
          x={receiverX}
          y={receiverY + 22}
          textAnchor="middle"
          fontSize={7.5}
          fill="rgba(116,198,157,1)"
          fontWeight="bold"
        >
          🎯 RECEIVER
        </text>
      </svg>
    </div>
  );
};
