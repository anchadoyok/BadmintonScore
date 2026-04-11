import type {
  CompletedMatchSummary,
  CourtSide,
  ManualCorrectionInput,
  MatchSetupInput,
  MatchSnapshot,
  MatchState,
  PlayerConfig,
  SetScore,
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

/**
 * Build initial positions for doubles.
 * The initial server is placed on the right service court (score 0 = even).
 * If initialReceiverPlayerId is provided, that player is also placed on the
 * right court of the receiving team (diagonal to the server per BWF rules).
 */
const createInitialDoublesPositions = (
  matchTeams: Record<TeamId, TeamConfig>,
  initialServerTeam: TeamId,
  initialServerPlayerId: string,
  initialReceiverPlayerId?: string
) => {
  const receivingTeam = otherTeam(initialServerTeam);

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

  // Place the specified server on the right (score 0 → even → right).
  const servingPartner = matchTeams[initialServerTeam].players.find((p) => p.id !== initialServerPlayerId);
  teamState[initialServerTeam].positions = {
    [initialServerPlayerId]: "right",
    [servingPartner?.id ?? initialServerPlayerId]: "left"
  };

  // Place the specified receiver on the right (diagonal to server per BWF).
  if (initialReceiverPlayerId) {
    const receivingPartner = matchTeams[receivingTeam].players.find((p) => p.id !== initialReceiverPlayerId);
    teamState[receivingTeam].positions = {
      [initialReceiverPlayerId]: "right",
      [receivingPartner?.id ?? initialReceiverPlayerId]: "left"
    };
  }

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
        ? createInitialDoublesPositions(
            teams,
            input.initialServerTeam,
            input.initialServerPlayerId ?? teams[input.initialServerTeam].players[0].id,
            input.initialReceiverPlayerId
          )
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
    savedToHistory: false,
    completedSets: [],
    currentSet: 1,
    setWins: { A: 0, B: 0 },
    uiSideSwapped: input.teamAInitialSide === "right",
    set3IntervalPending: false
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

/**
 * Reset player positions for the start of a new set.
 * The winner serves first, placed on the right court (score 0 = even = right).
 * Their partner goes left. Opponents default to player[0]=right, player[1]=left.
 */
const resetDoublesPositionsForNewSet = (snapshot: MatchSnapshot, setWinner: TeamId): void => {
  const loserTeam = otherTeam(setWinner);
  const winnerPlayers = snapshot.config.teams[setWinner].players;
  const loserPlayers = snapshot.config.teams[loserTeam].players;

  snapshot.teamState[setWinner].positions = {
    [winnerPlayers[0].id]: "right",
    [winnerPlayers[1].id]: "left"
  };
  snapshot.teamState[loserTeam].positions = {
    [loserPlayers[0].id]: "right",
    [loserPlayers[1].id]: "left"
  };
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
      // Serving side won: swap their left/right positions, same server continues.
      next.teamState[scoringTeam].positions = swapTeamPositions(next.teamState[scoringTeam].positions);
    } else {
      // Receiving side won: they keep positions, service passes to them.
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

  // ── Set / match completion ────────────────────────────────────────────────
  const { targetPoints, winBy, maxPoints } = next.config.settings;
  const sA = next.teamState.A.score;
  const sB = next.teamState.B.score;
  const setWon = isMatchPointReached(sA, sB, targetPoints, winBy, maxPoints);

  if (setWon) {
    const setWinner: TeamId = sA > sB ? "A" : "B";

    // Record the completed set.
    const completedSet: SetScore = {
      setNumber: next.currentSet ?? 1,
      scoreA: sA,
      scoreB: sB,
      winner: setWinner
    };
    next.completedSets = [...(next.completedSets ?? []), completedSet];

    const prevWins = next.setWins ?? { A: 0, B: 0 };
    const newSetWins = { ...prevWins, [setWinner]: (prevWins[setWinner] ?? 0) + 1 };
    next.setWins = newSetWins;

    if (newSetWins[setWinner] >= 2) {
      // Match over – team won 2 sets.
      next.status = "completed";
      next.winnerTeam = setWinner;
      next.completedAt = next.updatedAt;
    } else {
      // Start the next set.
      next.currentSet = (next.currentSet ?? 1) + 1;
      next.teamState.A.score = 0;
      next.teamState.B.score = 0;

      if (next.config.matchType === "doubles") {
        resetDoublesPositionsForNewSet(next, setWinner);
      }

      next.service.servingTeam = setWinner;
      next.service.receivingTeam = otherTeam(setWinner);
      next.uiSideSwapped = !(next.uiSideSwapped ?? false);
      next.set3IntervalPending = false;
      refreshService(next);
    }
  } else {
    // ── Set 3 mid-game interval (BWF: change ends when leading score hits 11) ─
    const currentSet = next.currentSet ?? 1;
    if (currentSet === 3 && !(next.set3IntervalPending ?? false)) {
      const leading = Math.max(next.teamState.A.score, next.teamState.B.score);
      if (leading >= 11) {
        next.set3IntervalPending = true;
      }
    }
  }

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

/**
 * Confirms the set-3 end-change at 11 points.
 * Toggles the left/right UI columns and clears the pending flag.
 */
export const dismissSet3Interval = (state: MatchState): MatchState => {
  const next = snapshotFromState(state);
  next.uiSideSwapped = !(next.uiSideSwapped ?? false);
  next.set3IntervalPending = false;
  return { ...next, undoStack: state.undoStack };
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

  // Re-evaluate match status after correction.
  const { targetPoints, winBy, maxPoints } = next.config.settings;
  if (isMatchPointReached(next.teamState.A.score, next.teamState.B.score, targetPoints, winBy, maxPoints)) {
    const correctionWinner: TeamId = next.teamState.A.score > next.teamState.B.score ? "A" : "B";
    next.status = "completed";
    next.winnerTeam = correctionWinner;
    next.completedAt = next.updatedAt;
  }

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
    durationSeconds,
    sets: match.completedSets ?? []
  };
};
