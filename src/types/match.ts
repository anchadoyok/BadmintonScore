export type MatchType = "singles" | "doubles";
export type TeamId = "A" | "B";
export type CourtSide = "left" | "right";
export type MatchStatus = "live" | "completed";

export interface PlayerConfig {
  id: string;
  name: string;
}

export interface TeamConfig {
  id: TeamId;
  name: string;
  players: PlayerConfig[];
}

export interface MatchSettings {
  targetPoints: number;
  winBy: number;
  maxPoints: number;
}

export interface MatchConfig {
  matchType: MatchType;
  teams: Record<TeamId, TeamConfig>;
  settings: MatchSettings;
}

export interface MatchSetupInput {
  matchType: MatchType;
  teamAName: string;
  teamBName: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  targetPoints: number;
  winBy: number;
  maxPoints: number;
  initialServerTeam: TeamId;
  initialServerPlayerId?: string;
}

export interface TeamRuntimeState {
  score: number;
  positions: Record<string, CourtSide>;
}

export interface ServiceState {
  servingTeam: TeamId;
  receivingTeam: TeamId;
  serverPlayerId: string;
  receiverPlayerId: string;
  serviceSide: CourtSide;
}

export interface RallyEvent {
  id: string;
  scoringTeam: TeamId;
  timestamp: string;
  scoreAfter: Record<TeamId, number>;
}

export interface MatchSnapshot {
  id: string;
  config: MatchConfig;
  teamState: Record<TeamId, TeamRuntimeState>;
  service: ServiceState;
  rallyHistory: RallyEvent[];
  status: MatchStatus;
  winnerTeam?: TeamId;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  savedToHistory: boolean;
}

export interface MatchState extends MatchSnapshot {
  undoStack: MatchSnapshot[];
}

export interface ManualCorrectionInput {
  scoreA: number;
  scoreB: number;
  servingTeam: TeamId;
  serviceSide: CourtSide;
  serverPlayerId?: string;
  receiverPlayerId?: string;
}

export interface CompletedMatchSummary {
  id: string;
  matchType: MatchType;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winnerTeam: TeamId;
  completedAt: string;
  durationSeconds: number;
}
