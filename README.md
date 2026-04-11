# Badminton Score

Mobile-first badminton scoring app built with React + TypeScript. The MVP focuses on one real problem: players forget the score, who serves next, which side the serve comes from, and who should receive, especially in doubles.

## What the app does

- Starts singles or doubles matches quickly.
- Tracks score live with large one-tap point buttons.
- Shows the current server, receiver, serving team, receiving team, and service side.
- Visualizes doubles left/right court positions on a mini court.
- Supports undo, full match reset, and correction mode.
- Saves completed matches to local history in `localStorage`.

## How scoring works in this app

### Singles

- If the serving side has an even score, serve is from the right service court.
- If the serving side has an odd score, serve is from the left service court.
- If the server wins the rally, they score and keep serving.
- If the receiver wins the rally, they score and service changes to them.

### Doubles

The app uses a dedicated rules engine in [src/lib/badmintonRules.ts](C:\Users\ancha\Downloads\Badminton Score\src\lib\badmintonRules.ts) with explicit rotation logic:

- Each team tracks two players and their current left/right court positions.
- When the serving side wins a rally:
  - that team scores,
  - the same player keeps serving,
  - only the serving pair swaps left/right,
  - the receiving pair stays in place.
- When the receiving side wins a rally:
  - that team scores,
  - service passes to that team,
  - the new server is whichever player is already standing on the service court that matches the new score parity,
  - the new receiver is the opponent standing on the same service side.

### Doubles assumptions made explicit

- For a fresh 0-0 doubles game, service starts from the right court.
- On a brand-new match, the first listed player on each team is placed on the right side by default.
- If you choose the second player as the initial server, the app swaps that serving pair so the selected server starts on the right.
- In correction mode, doubles asks for current server, receiver, and service side because score alone does not uniquely reconstruct doubles rotation.

## Manual correction and safety

Correction mode is intentionally more detailed for doubles. Editing only the score is not enough to safely recover service order after a few rallies, so the app asks for:

- score,
- serving team,
- service side,
- current server,
- current receiver.

That lets the rules engine rebuild a deterministic state and continue from there.

## Project structure

- [src/lib/badmintonRules.ts](C:\Users\ancha\Downloads\Badminton Score\src\lib\badmintonRules.ts): Pure scoring and service rotation engine.
- [src/lib/badmintonRules.test.ts](C:\Users\ancha\Downloads\Badminton Score\src\lib\badmintonRules.test.ts): Unit tests for service logic, undo, and correction.
- [src/lib/storage.ts](C:\Users\ancha\Downloads\Badminton Score\src\lib\storage.ts): Local storage persistence.
- [src/components](C:\Users\ancha\Downloads\Badminton Score\src\components): Home, setup, live scoring, summary, history, and doubles court UI.

## Run locally

```bash
npm install
npm run dev
```

For tests and production build:

```bash
npm run test
npm run build
```
