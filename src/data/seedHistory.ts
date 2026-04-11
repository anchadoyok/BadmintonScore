import type { MatchSnapshot } from "../types/match";

export const seedHistory: MatchSnapshot[] = [
  {
    id: "seed-1",
    config: {
      matchType: "doubles",
      teams: {
        A: {
          id: "A",
          name: "Smash Club",
          players: [
            { id: "A-1", name: "Dita" },
            { id: "A-2", name: "Raka" }
          ]
        },
        B: {
          id: "B",
          name: "Net Ninjas",
          players: [
            { id: "B-1", name: "Ayu" },
            { id: "B-2", name: "Theo" }
          ]
        }
      },
      settings: {
        targetPoints: 21,
        winBy: 2,
        maxPoints: 30
      }
    },
    teamState: {
      A: {
        score: 21,
        positions: {
          "A-1": "left",
          "A-2": "right"
        }
      },
      B: {
        score: 18,
        positions: {
          "B-1": "left",
          "B-2": "right"
        }
      }
    },
    service: {
      servingTeam: "A",
      receivingTeam: "B",
      serverPlayerId: "A-2",
      receiverPlayerId: "B-2",
      serviceSide: "right"
    },
    rallyHistory: [],
    status: "completed",
    winnerTeam: "A",
    createdAt: "2026-04-09T10:10:00.000Z",
    updatedAt: "2026-04-09T10:42:00.000Z",
    completedAt: "2026-04-09T10:42:00.000Z",
    savedToHistory: true
  },
  {
    id: "seed-2",
    config: {
      matchType: "singles",
      teams: {
        A: {
          id: "A",
          name: "Nadia",
          players: [{ id: "A-1", name: "Nadia" }]
        },
        B: {
          id: "B",
          name: "Miko",
          players: [{ id: "B-1", name: "Miko" }]
        }
      },
      settings: {
        targetPoints: 15,
        winBy: 2,
        maxPoints: 21
      }
    },
    teamState: {
      A: {
        score: 16,
        positions: {
          "A-1": "right"
        }
      },
      B: {
        score: 14,
        positions: {
          "B-1": "right"
        }
      }
    },
    service: {
      servingTeam: "A",
      receivingTeam: "B",
      serverPlayerId: "A-1",
      receiverPlayerId: "B-1",
      serviceSide: "right"
    },
    rallyHistory: [],
    status: "completed",
    winnerTeam: "A",
    createdAt: "2026-04-08T08:00:00.000Z",
    updatedAt: "2026-04-08T08:22:00.000Z",
    completedAt: "2026-04-08T08:22:00.000Z",
    savedToHistory: true
  }
];
