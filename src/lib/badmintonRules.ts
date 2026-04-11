import type {
  CompletedMatchSummary,
  CourtSide,
  ManualCorrectionInput,
  MatchSetupInput,
  MatchSnapshot,
  MatchState,
  PlayerConfig,
  TeamConfig,
  TeamId
} from "../types/match";

const TEAM_IDS: TeamId[] = ["A", "B"];

const otherTeam = (teamId: TeamId): TeamId => (teamId === "A" ? "B" : "A");
const oppositeSide = (side: CourtSide): CourtSide => (side === "left" ? "right" : "left");
const sideFromScore = (score: number): CourtSide => (score % 2 === 0 ? "right" : "left");

const cloneSnapshot = (snapshot: MatchSnapshot): MatchSnapshot => structuredClone(snapshot);
const snapshotFromState = (state: MatchState): MatchSnapshot => {
  const { undoStack: _ignored, ...rest } = state;
  return structuredClone(rest);
};

const toPlayerId = (teamId: TeamId, index: number) => `${teamId}-${index + 1}`;

const normalisePlayerName = (name: string, fallback: string) => {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const createPlayers = (teamId: TeamId, names: string[]) =>
  names.map<PlayerConfig>((name, index) => ({
    id: toPlayerId(teamId, index),
    name: normalisePlayerName(name, `Player ${teamId}${index + 1}`)
  }));

const createTeamConfig = (teamId: TeamId, name: string, players: string[], matchType: MatchSetupInput["matchType"]): TeamConfig => {
  const requiredPlayers = matchType === "singles" ? 1 : 2;
  const sourceNames = players.slice(0, requiredPlayers);
  while (sourceNames.length < requiredPlayers) {
    sourceNames.push("");
  }

  return {
    id: teamId,
    name: normalisePlayerName(name, `Team ${teamId}`),
    players: createPlayers(teamId, sourceNames)
  };
};

const getPlayerName = (match: MatchSnapshot | MatchState, playerId: string) => {
  for (const teamId of TEAM_IDS) {
    const player = match.config.teams[teamId].players.find((entry) => entry.id === playerId);
    if (player) {
      return player.name;
    }
  }

  return "Unknown player";
};

const createScoreRecord = (scoreA: number, scoreB: number) => ({
  A: scoreA,
  B: scoreB
});

const defaultPositions = (players: PlayerConfig[]) => ({
  [players[0].id]: "right" as CourtSide,
  [players[1].id]: "left" as CourtSide
});

const swapTeamPositions = (positions: Record<string, CourtSide>) => {
  const next: Record<string, CourtSide> = {};
  Object.entries(positions).forEach(([playerId, side]) => {
    next[playerId] = oppositeSide(side);
  });
  return next;
};

const getPlayerOnSide = (positions: Record<string, CourtSide>, side: CourtSide) =>
  Object.entries(positions).find(([, value]) => value === side)?.[0];

const getCurrentScore = (match: MatchSnapshot | MatchState, teamId: TeamId) => match.teamState[teamId].score;

export const isMatchPointReached = (scoreA: number, scoreB: number, targetPoints: number, winBy: number, maxPoints: number) => {
  const highest = Math.max(scoreA, scoreB);
  const lowest = Math.min(scoreA, scoreB);
  if (highest < targetPoints) {
    return false;
  }

  if (highest >= maxPoints) {
    return true;
  }

  return highest - lowest >= winBy;
};

export const getWinner = (match: MatchSnapshot | MatchState): TeamId | undefined => {
  const scoreA = match.teamState.A.score;
  const scoreB = match.teamState.B.score;
  return isMatchPointReached(
    scoreA,
    scoreB,
    match.config.settings.targetPoints,
    match.config.settings.winBy,
    match.config.settings.maxPoints
  )
    ? scoreA > scoreB
      ? "A"
      : "B"
    : undefined;
};

const createInitialDoublesPositions = (matchTeams: Record<TeamId, TeamConfig>, initialServerTeam: TeamId, initialServerPlayerId: string) => {
  const teamState = {
    A: {
      score: 0,
      positions: defaultPositions(matchTeams.A.players)
    },
    B: {
      score: 0,
      positions: defaultPositions(matchTeams.B.players)
    }
  };

  const servingPlayers = matchTeams[initialServerTeam].players;
  const partner = servingPlayers.find((player) => player.id !== initialServerPlayerId);
  teamState[initialServerTeam].positions = {
    [initialServerPlayerId]: "right",
    [partner?.id ?? initialServerPlayerId]: "left"
  };

  return teamState;
};

const refreshServiceForSingles = (snapshot: MatchSnapshot): MatchSnapshot => {
  const servingTeam = snapshot.service.servingTeam;
  const receivingTeam = otherTeam(servingTeam);
  const serverPlayerId = snapshot.config.teams[servingTeam].players[0].id;
  const receiverPlayerId = snapshot.config.teams[receivingTeam].players[0].id;

  snapshot.service = {
    servingTeam,
    receivingTeam,
    serverPlayerId,
    receiverPlayerId,
    serviceSide: sideFromScore(snapshot.teamState[servingTeam].score)
  };

  return snapshot;
};

const refreshServiceForDoubles = (snapshot: MatchSnapshot): MatchSnapshot => {
  const servingTeam = snapshot.service.servingTeam;
  const receivingTeam = otherTeam(servingTeam);
  const serviceSide = sideFromScore(snapshot.teamState[servingTeam].score);
  const serverPlayerId = getPlayerOnSide(snapshot.teamState[servingTeam].positions, serviceSide);
  const receiverPlayerId = getPlayerOnSide(snapshot.teamState[receivingTeam].positions, serviceSide);

  if (!serverPlayerId || !receiverPlayerId) {
    throw new Error("Unable to resolve doubles server or receiver from current court positions.");
  }

  snapshot.service = {
    servingTeam,
    receivingTeam,
    serverPlayerId,
    receiverPlayerId,
    serviceSide
  };

  return snapshot;
};

const refreshService = (snapshot: MatchSnapshot) =>
  snapshot.config.matchType === "singles" ? refreshServiceForSingles(snapshot) : refreshServiceForDoubles(snapshot);

const finishMatchIfNeeded = (snapshot: MatchSnapshot) => {
  const winnerTeam = getWinner(snapshot);
  if (winnerTeam) {
    snapshot.status = "completed";
    snapshot.winnerTeam = winnerTeam;
    snapshot.completedAt = snapshot.updatedAt;
  }
  return snapshot;
};

export const createMatchState = (input: MatchSetupInput): MatchState => {
  const matchType = input.matchType;
  const teams = {
    A: createTeamConfig("A", input.teamAName, input.teamAPlayers, matchType),
    B: createTeamConfig("B", input.teamBName, input.teamBPlayers, matchType)
  };

  const now = new Date().toISOString();
  const serviceSide = "right" as CourtSide;

  const baseSnapshot: MatchSnapshot = {
    id: crypto.randomUUID(),
    config: {
      matchType,
      teams,
      settings: {
        targetPoints: input.targetPoints,
        winBy: input.winBy,
        maxPoints: input.maxPoints
      }
    },
    teamState:
      matchType === "doubles"
        ? createInitialDoublesPositions(teams, input.initialServerTeam, input.initialServerPlayerId ?? teams[input.initialServerTeam].players[0].id)
        : {
            A: {
              score: 0,
              positions: {
                [teams.A.players[0].id]: serviceSide
              }
            },
            B: {
              score: 0,
              positions: {
                [teams.B.players[0].id]: serviceSide
              }
            }
          },
    service: {
      servingTeam: input.initialServerTeam,
      receivingTeam: otherTeam(input.initialServerTeam),
      serverPlayerId:
        matchType === "doubles"
          ? input.initialServerPlayerId ?? teams[input.initialServerTeam].players[0].id
          : teams[input.initialServerTeam].players[0].id,
      receiverPlayerId: teams[otherTeam(input.initialServerTeam)].players[0].id,
      serviceSide
    },
    rallyHistory: [],
    status: "live",
    createdAt: now,
    updatedAt: now,
    savedToHistory: false
  };

  const refreshed = refreshService(baseSnapshot);

  return {
    ...refreshed,
    undoStack: []
  };
};

const pushUndo = (state: MatchState) => {
  return [...state.undoStack, snapshotFromState(state)];
};

export const applyPoint = (state: MatchState, scoringTeam: TeamId): MatchState => {
  if (state.status === "completed") {
    return state;
  }

  const next: MatchSnapshot = snapshotFromState(state);

  next.updatedAt = new Date().toISOString();
  next.teamState[scoringTeam].score += 1;

  if (state.config.matchType === "doubles") {
    if (state.service.servingTeam === scoringTeam) {
      // In doubles, only the serving side swaps left/right after winning a rally.
      // The same player continues serving from the alternate service court.
      next.teamState[scoringTeam].positions = swapTeamPositions(next.teamState[scoringTeam].positions);
    } else {
      // When the receiving side wins, they keep their current left/right positions.
      // Service passes to the player already standing on the service court that
      // matches their new score parity.
      next.service.servingTeam = scoringTeam;
    }
  } else if (state.service.servingTeam !== scoringTeam) {
    next.service.servingTeam = scoringTeam;
  }

  if (state.config.matchType === "doubles" && state.service.servingTeam === scoringTeam) {
    next.service.servingTeam = scoringTeam;
  }

  next.service.receivingTeam = otherTeam(next.service.servingTeam);
  refreshService(next);

  next.rallyHistory.push({
    id: crypto.randomUUID(),
    scoringTeam,
    timestamp: next.updatedAt,
    scoreAfter: createScoreRecord(next.teamState.A.score, next.teamState.B.score)
  });

  finishMatchIfNeeded(next);

  return {
    ...next,
    undoStack: pushUndo(state)
  };
};

export const undoLastPoint = (state: MatchState): MatchState => {
  const previous = state.undoStack[state.undoStack.length - 1];
  if (!previous) {
    return state;
  }

  return {
    ...cloneSnapshot(previous),
    undoStack: state.undoStack.slice(0, -1)
  };
};

export const buildManualCorrectionState = (state: MatchState, input: ManualCorrectionInput): MatchState => {
  const next: MatchSnapshot = snapshotFromState(state);

  next.updatedAt = new Date().toISOString();
  next.teamState.A.score = input.scoreA;
  next.teamState.B.score = input.scoreB;
  next.service.servingTeam = input.servingTeam;
  next.service.receivingTeam = otherTeam(input.servingTeam);
  next.service.serviceSide = input.serviceSide;
  next.winnerTeam = undefined;
  next.completedAt = undefined;
  next.status = "live";

  if (next.config.matchType === "doubles") {
    if (!input.serverPlayerId || !input.receiverPlayerId) {
      throw new Error("Manual correction for doubles requires both the current server and receiver.");
    }

    const servingTeamPlayers = next.config.teams[input.servingTeam].players;
    const receivingTeamPlayers = next.config.teams[otherTeam(input.servingTeam)].players;
    const servingPartner = servingTeamPlayers.find((player) => player.id !== input.serverPlayerId);
    const receivingPartner = receivingTeamPlayers.find((player) => player.id !== input.receiverPlayerId);

    next.teamState[input.servingTeam].positions = {
      [input.serverPlayerId]: input.serviceSide,
      [servingPartner?.id ?? input.serverPlayerId]: oppositeSide(input.serviceSide)
    };

    next.teamState[otherTeam(input.servingTeam)].positions = {
      [input.receiverPlayerId]: input.serviceSide,
      [receivingPartner?.id ?? input.receiverPlayerId]: oppositeSide(input.serviceSide)
    };
  }

  refreshService(next);
  finishMatchIfNeeded(next);

  return {
    ...next,
    undoStack: pushUndo(state)
  };
};

export const createRematchState = (state: MatchState) =>
  createMatchState({
    matchType: state.config.matchType,
    teamAName: state.config.teams.A.name,
    teamBName: state.config.teams.B.name,
    teamAPlayers: state.config.teams.A.players.map((player) => player.name),
    teamBPlayers: state.config.teams.B.players.map((player) => player.name),
    targetPoints: state.config.settings.targetPoints,
    winBy: state.config.settings.winBy,
    maxPoints: state.config.settings.maxPoints,
    initialServerTeam: state.service.servingTeam,
    initialServerPlayerId: state.config.matchType === "doubles" ? state.service.serverPlayerId : undefined
  });

export const getTeamLabel = (match: MatchSnapshot | MatchState, teamId: TeamId) => match.config.teams[teamId].name;
export const getPlayerLabel = getPlayerName;

export const getPlayerCourtSide = (match: MatchSnapshot | MatchState, teamId: TeamId, playerId: string) =>
  match.teamState[teamId].positions[playerId];

export const getReceiverTeamId = (match: MatchSnapshot | MatchState) => match.service.receivingTeam;

export const createCompletedSummary = (match: MatchSnapshot | MatchState): CompletedMatchSummary | undefined => {
  if (!match.winnerTeam || !match.completedAt) {
    return undefined;
  }

  const durationSeconds = Math.max(
    0,
    Math.round((new Date(match.completedAt).getTime() - new Date(match.createdAt).getTime()) / 1000)
  );

  return {
    id: match.id,
    matchType: match.config.matchType,
    teamAName: getTeamLabel(match, "A"),
    teamBName: getTeamLabel(match, "B"),
    scoreA: getCurrentScore(match, "A"),
    scoreB: getCurrentScore(match, "B"),
    winnerTeam: match.winnerTeam,
    completedAt: match.completedAt,
    durationSeconds
  };
};
