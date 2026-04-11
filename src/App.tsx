import { useEffect, useMemo, useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { LiveMatchScreen } from "./components/LiveMatchScreen";
import { MatchSetupForm } from "./components/MatchSetupForm";
import { MatchSummaryScreen } from "./components/MatchSummaryScreen";
import {
  applyPoint,
  buildManualCorrectionState,
  createCompletedSummary,
  createMatchState,
  createRematchState,
  undoLastPoint
} from "./lib/badmintonRules";
import { ensureSeedHistory, loadCurrentMatch, loadHistory, saveCurrentMatch, saveHistory } from "./lib/storage";
import type { ManualCorrectionInput, MatchSnapshot, MatchState, MatchSetupInput, TeamId } from "./types/match";

type Screen = "home" | "setup" | "live" | "summary" | "history";

const getInitialScreen = (currentMatch: MatchState | null): Screen => {
  if (!currentMatch) {
    return "home";
  }

  return currentMatch.status === "completed" ? "summary" : "live";
};

function App() {
  const [history, setHistory] = useState<MatchSnapshot[]>(() => ensureSeedHistory());
  const [currentMatch, setCurrentMatch] = useState<MatchState | null>(() => loadCurrentMatch());
  const [screen, setScreen] = useState<Screen>(() => getInitialScreen(loadCurrentMatch()));

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

  const handleStartMatch = (setup: MatchSetupInput) => {
    const nextMatch = createMatchState(setup);
    setCurrentMatch(nextMatch);
    setScreen("live");
  };

  const handleScore = (teamId: TeamId) => {
    if (!currentMatch) {
      return;
    }

    const nextMatch = applyPoint(currentMatch, teamId);
    setCurrentMatch(nextMatch);
    if (nextMatch.status === "completed") {
      setScreen("summary");
    }
  };

  const handleUndo = () => {
    if (!currentMatch) {
      return;
    }

    setCurrentMatch(undoLastPoint(currentMatch));
  };

  const handleReset = () => {
    if (!currentMatch) {
      return;
    }

    setCurrentMatch(createRematchState(currentMatch));
    setScreen("live");
  };

  const handleCorrection = (input: ManualCorrectionInput) => {
    if (!currentMatch) {
      return;
    }

    const nextMatch = buildManualCorrectionState(currentMatch, input);
    setCurrentMatch(nextMatch);
    if (nextMatch.status === "completed") {
      setScreen("summary");
    }
  };

  const handleSaveCompletedMatch = () => {
    if (!currentMatch || currentMatch.status !== "completed") {
      return;
    }

    if (history.some((entry) => entry.id === currentMatch.id)) {
      return;
    }

    const saved = {
      ...currentMatch,
      savedToHistory: true
    };

    setCurrentMatch(saved);
    setHistory([saved, ...history]);
  };

  const handleRematch = () => {
    if (!currentMatch) {
      return;
    }

    setCurrentMatch(createRematchState(currentMatch));
    setScreen("live");
  };

  const handleExitToHome = () => {
    setScreen("home");
  };

  const handleDiscardCurrentMatch = () => {
    setCurrentMatch(null);
    setScreen("home");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Badminton Match Assistant</p>
          <h1>Badminton Score</h1>
        </div>
        <button className="ghost-button" onClick={() => setScreen("home")}>
          Home
        </button>
      </header>

      <main className="page-shell">
        {screen === "home" && (
          <HomeScreen
            currentMatch={currentMatch}
            historyCount={history.length}
            onNewMatch={() => setScreen("setup")}
            onResumeMatch={() => setScreen(currentMatch?.status === "completed" ? "summary" : "live")}
            onViewHistory={() => setScreen("history")}
          />
        )}

        {screen === "setup" && (
          <MatchSetupForm onCancel={() => setScreen("home")} onStart={handleStartMatch} />
        )}

        {screen === "live" && currentMatch && (
          <LiveMatchScreen
            match={currentMatch}
            onScore={handleScore}
            onUndo={handleUndo}
            onReset={handleReset}
            onCorrection={handleCorrection}
            onFinishView={() => setScreen("summary")}
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
    </div>
  );
}

export default App;
