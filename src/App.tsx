import { useEffect, useMemo, useState } from "react";
import { HistoryScreen } from "./components/HistoryScreen";
import { HomeScreen } from "./components/HomeScreen";
import { LiveMatchScreen } from "./components/LiveMatchScreen";
import { MatchSetupForm } from "./components/MatchSetupForm";
import { MatchSummaryScreen } from "./components/MatchSummaryScreen";
import { QuickMatchScreen } from "./components/QuickMatchScreen";
import { QuickSetupForm } from "./components/QuickSetupForm";
import {
  applyPoint,
  buildManualCorrectionState,
  createCompletedSummary,
  createMatchState,
  createRematchState,
  dismissSet3Interval,
  undoLastPoint
} from "./lib/badmintonRules";
import { ensureSeedHistory, loadCurrentMatch, loadHistory, saveCurrentMatch, saveHistory } from "./lib/storage";
import type { ManualCorrectionInput, MatchSnapshot, MatchSetupInput, MatchState, TeamId } from "./types/match";

type Screen = "home" | "setup" | "live" | "summary" | "history" | "quick-setup" | "quick-live";

const THEME_KEY = "badminton-score.theme";

const getInitialScreen = (currentMatch: MatchState | null): Screen => {
  if (!currentMatch) return "home";
  return currentMatch.status === "completed" ? "summary" : "live";
};

const getInitialTheme = (): "dark" | "light" => {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
};

function App() {
  const [history, setHistory] = useState<MatchSnapshot[]>(() => ensureSeedHistory());
  const [currentMatch, setCurrentMatch] = useState<MatchState | null>(() => loadCurrentMatch());
  const [screen, setScreen] = useState<Screen>(() => getInitialScreen(loadCurrentMatch()));
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle("theme-light", theme === "light");
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    setHistory(loadHistory());
  }, []);
  useEffect(() => {
    saveCurrentMatch(currentMatch);
  }, [currentMatch]);
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const completedSummary = useMemo(
    () => (currentMatch ? createCompletedSummary(currentMatch) : undefined),
    [currentMatch]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStartMatch = (setup: MatchSetupInput) => {
    setCurrentMatch(createMatchState(setup));
    setScreen("live");
  };

  const handleStartQuickMatch = (teamAName: string, teamBName: string) => {
    const match = createMatchState({
      matchType: "singles",
      teamAName,
      teamBName,
      teamAPlayers: [teamAName],
      teamBPlayers: [teamBName],
      targetPoints: 21,
      winBy: 2,
      maxPoints: 30,
      initialServerTeam: "A"
    });
    setCurrentMatch(match);
    setScreen("quick-live");
  };

  const handleScore = (teamId: TeamId) => {
    if (!currentMatch) return;
    const next = applyPoint(currentMatch, teamId);
    setCurrentMatch(next);
    if (next.status === "completed") setScreen("summary");
  };

  const handleQuickScore = (teamId: TeamId) => {
    if (!currentMatch) return;
    const next = applyPoint(currentMatch, teamId);
    setCurrentMatch(next);
    if (next.status === "completed") setScreen("summary");
  };

  const handleUndo = () => {
    if (!currentMatch) return;
    setCurrentMatch(undoLastPoint(currentMatch));
  };

  const handleReset = () => {
    if (!currentMatch) return;
    setCurrentMatch(createRematchState(currentMatch));
    setScreen("live");
  };

  const handleDismissInterval = () => {
    if (!currentMatch) return;
    setCurrentMatch(dismissSet3Interval(currentMatch));
  };

  const handleCorrection = (input: ManualCorrectionInput) => {
    if (!currentMatch) return;
    const next = buildManualCorrectionState(currentMatch, input);
    setCurrentMatch(next);
    if (next.status === "completed") setScreen("summary");
  };

  const handleSaveCompletedMatch = () => {
    if (!currentMatch || currentMatch.status !== "completed") return;
    if (history.some((entry) => entry.id === currentMatch.id)) return;
    const saved = { ...currentMatch, savedToHistory: true };
    setCurrentMatch(saved);
    setHistory([saved, ...history]);
  };

  const handleRematch = () => {
    if (!currentMatch) return;
    setCurrentMatch(createRematchState(currentMatch));
    setScreen("live");
  };

  const handleExitToHome = () => setScreen("home");

  const handleDiscardCurrentMatch = () => {
    setCurrentMatch(null);
    setScreen("home");
  };

  return (
    <div className="app-shell">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div>
          <p className="eyebrow">Badminton Match Assistant</p>
          <h1>Badminton Score</h1>
        </div>
        <div className="inline-actions">
          <button
            className="ghost-button theme-toggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle colour theme"
          >
            {theme === "dark" ? "☀ Light" : "☽ Dark"}
          </button>
          <button className="ghost-button" onClick={() => setScreen("home")}>
            Home
          </button>
        </div>
      </header>

      {/* ── Screens ──────────────────────────────────────────────────────── */}
      <main className="page-shell">
        {screen === "home" && (
          <HomeScreen
            currentMatch={currentMatch}
            historyCount={history.length}
            onNewMatch={() => setScreen("setup")}
            onQuickMatch={() => setScreen("quick-setup")}
            onResumeMatch={() =>
              setScreen(currentMatch?.status === "completed" ? "summary" : "live")
            }
            onViewHistory={() => setScreen("history")}
          />
        )}

        {screen === "setup" && (
          <MatchSetupForm onCancel={() => setScreen("home")} onStart={handleStartMatch} />
        )}

        {screen === "quick-setup" && (
          <QuickSetupForm onCancel={() => setScreen("home")} onStart={handleStartQuickMatch} />
        )}

        {screen === "live" && currentMatch && (
          <LiveMatchScreen
            match={currentMatch}
            onScore={handleScore}
            onUndo={handleUndo}
            onReset={handleReset}
            onCorrection={handleCorrection}
            onDismissInterval={handleDismissInterval}
            onFinishView={() => setScreen("summary")}
            onExit={handleExitToHome}
          />
        )}

        {screen === "quick-live" && currentMatch && (
          <QuickMatchScreen
            match={currentMatch}
            onScore={handleQuickScore}
            onUndo={handleUndo}
            onExit={handleExitToHome}
          />
        )}

        {screen === "summary" && currentMatch && completedSummary && (
          <MatchSummaryScreen
            match={currentMatch}
            summary={completedSummary}
            onSave={handleSaveCompletedMatch}
            onRematch={handleRematch}
            onHome={handleExitToHome}
            onClearCurrent={handleDiscardCurrentMatch}
          />
        )}

        {screen === "history" && (
          <HistoryScreen
            history={history}
            onBack={() => setScreen("home")}
            onReplay={(match) => {
              setCurrentMatch(createRematchState({ ...match, undoStack: [] }));
              setScreen("live");
            }}
          />
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="app-footer">by anchadoyok</footer>
    </div>
  );
}

export default App;
