import { describe, expect, it } from "vitest";
import { applyPoint, buildManualCorrectionState, createMatchState, undoLastPoint } from "./badmintonRules";

describe("badminton rules engine", () => {
  it("keeps the singles server and flips service side after the server wins", () => {
    const match = createMatchState({
      matchType: "singles",
      teamAName: "A",
      teamBName: "B",
      teamAPlayers: ["Nadia"],
      teamBPlayers: ["Miko"],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A"
    });

    const next = applyPoint(match, "A");

    expect(next.teamState.A.score).toBe(1);
    expect(next.service.servingTeam).toBe("A");
    expect(next.service.serverPlayerId).toBe("A-1");
    expect(next.service.serviceSide).toBe("left");
  });

  it("passes singles service to the rally winner", () => {
    const match = createMatchState({
      matchType: "singles",
      teamAName: "A",
      teamBName: "B",
      teamAPlayers: ["Nadia"],
      teamBPlayers: ["Miko"],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A"
    });

    const next = applyPoint(match, "B");

    expect(next.teamState.B.score).toBe(1);
    expect(next.service.servingTeam).toBe("B");
    expect(next.service.receiverPlayerId).toBe("A-1");
    expect(next.service.serviceSide).toBe("left");
  });

  it("swaps only the serving doubles pair after they win a rally", () => {
    const match = createMatchState({
      matchType: "doubles",
      teamAName: "A",
      teamBName: "B",
      teamAPlayers: ["A1", "A2"],
      teamBPlayers: ["B1", "B2"],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A",
      initialServerPlayerId: "A-1"
    });

    const next = applyPoint(match, "A");

    expect(next.teamState.A.positions["A-1"]).toBe("left");
    expect(next.teamState.A.positions["A-2"]).toBe("right");
    expect(next.teamState.B.positions["B-1"]).toBe("right");
    expect(next.service.serverPlayerId).toBe("A-1");
    expect(next.service.receiverPlayerId).toBe("B-2");
    expect(next.service.serviceSide).toBe("left");
  });

  it("keeps the receiving doubles pair in place when they win and become servers", () => {
    const match = createMatchState({
      matchType: "doubles",
      teamAName: "A",
      teamBName: "B",
      teamAPlayers: ["A1", "A2"],
      teamBPlayers: ["B1", "B2"],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A",
      initialServerPlayerId: "A-1"
    });

    const next = applyPoint(match, "B");

    expect(next.teamState.B.positions["B-1"]).toBe("right");
    expect(next.teamState.B.positions["B-2"]).toBe("left");
    expect(next.service.servingTeam).toBe("B");
    expect(next.service.serverPlayerId).toBe("B-2");
    expect(next.service.receiverPlayerId).toBe("A-2");
    expect(next.service.serviceSide).toBe("left");
  });

  it("restores the previous rally state on undo", () => {
    const match = createMatchState({
      matchType: "doubles",
      teamAName: "A",
      teamBName: "B",
      teamAPlayers: ["A1", "A2"],
      teamBPlayers: ["B1", "B2"],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A",
      initialServerPlayerId: "A-1"
    });

    const advanced = applyPoint(match, "A");
    const reverted = undoLastPoint(advanced);

    expect(reverted.teamState.A.score).toBe(0);
    expect(reverted.service.serverPlayerId).toBe("A-1");
    expect(reverted.service.serviceSide).toBe("right");
  });

  it("rebuilds doubles positions safely from manual correction context", () => {
    const match = createMatchState({
      matchType: "doubles",
      teamAName: "A",
      teamBName: "B",
      teamAPlayers: ["A1", "A2"],
      teamBPlayers: ["B1", "B2"],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A",
      initialServerPlayerId: "A-1"
    });

    const corrected = buildManualCorrectionState(match, {
      scoreA: 12,
      scoreB: 13,
      servingTeam: "B",
      serviceSide: "left",
      serverPlayerId: "B-2",
      receiverPlayerId: "A-1"
    });

    expect(corrected.teamState.B.positions["B-2"]).toBe("left");
    expect(corrected.teamState.A.positions["A-1"]).toBe("left");
    expect(corrected.service.serverPlayerId).toBe("B-2");
    expect(corrected.service.receiverPlayerId).toBe("A-1");
  });
});
