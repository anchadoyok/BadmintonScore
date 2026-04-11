import { seedHistory } from "../data/seedHistory";
import type { MatchSnapshot, MatchState } from "../types/match";

const CURRENT_MATCH_KEY = "badminton-score.current-match";
const HISTORY_KEY = "badminton-score.history";
const SEEDED_KEY = "badminton-score.seeded";

const hasWindow = typeof window !== "undefined";

const safeRead = <T,>(key: string, fallback: T): T => {
  if (!hasWindow) {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: unknown) => {
  if (!hasWindow) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const ensureSeedHistory = () => {
  if (!hasWindow) {
    return seedHistory;
  }

  const seeded = window.localStorage.getItem(SEEDED_KEY);
  const existingHistory = safeRead<MatchSnapshot[]>(HISTORY_KEY, []);
  if (!seeded && existingHistory.length === 0) {
    safeWrite(HISTORY_KEY, seedHistory);
    window.localStorage.setItem(SEEDED_KEY, "true");
    return seedHistory;
  }

  return existingHistory;
};

export const loadHistory = () => safeRead<MatchSnapshot[]>(HISTORY_KEY, ensureSeedHistory());
export const saveHistory = (history: MatchSnapshot[]) => safeWrite(HISTORY_KEY, history);
export const loadCurrentMatch = () => safeRead<MatchState | null>(CURRENT_MATCH_KEY, null);
export const saveCurrentMatch = (match: MatchState | null) => {
  if (!hasWindow) {
    return;
  }

  if (!match) {
    window.localStorage.removeItem(CURRENT_MATCH_KEY);
    return;
  }

  safeWrite(CURRENT_MATCH_KEY, match);
};
