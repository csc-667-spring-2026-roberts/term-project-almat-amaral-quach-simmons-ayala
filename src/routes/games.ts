import { Router } from "express";
import Games from "../db/games.js";
import Uno from "../db/uno.js";
import SSE from "../sse.js";

const router = Router();

router.get("/", async (_request, response) => {
  const games = await Games.list();

  response.json({ games });
});

router.get("/:gameId/state", async (request, response) => {
  const user = request.session.user;

  if (!user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const gameId = Number(request.params.gameId);

  if (!Number.isInteger(gameId) || gameId <= 0) {
    response.status(400).json({ error: "Invalid game id" });
    return;
  }

  try {
    const state = await Uno.getUnoGameState(gameId, user.id);

    response.status(200).json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load game state";

    response.status(400).json({ error: message });
  }
});

router.post("/", async (request, response) => {
  const user = request.session.user;

  if (!user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = user.id;
  const game = await Games.create(userId);

  const games = await Games.list();

  SSE.broadcast({
    type: "games_updated",
    games,
  });

  response.status(201).json({ game });
});

router.post("/:gameId/join", async (request, response) => {
  const user = request.session.user;

  if (!user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const gameId = Number(request.params.gameId);

  if (!Number.isInteger(gameId) || gameId <= 0) {
    response.status(400).json({ error: "Invalid game id" });
    return;
  }

  await Games.join(gameId, user.id);

  const games = await Games.list();

  SSE.broadcast({
    type: "games_updated",
    games,
  });

  response.status(200).json({ success: true });
});

router.post("/:gameId/start", async (request, response) => {
  const user = request.session.user;

  if (!user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const gameId = Number(request.params.gameId);

  if (!Number.isInteger(gameId) || gameId <= 0) {
    response.status(400).json({ error: "Invalid game id" });
    return;
  }

  try {
    const state = await Uno.startGame(gameId);

    SSE.broadcastToGame(gameId, {
      type: "game_updated",
      state,
    });

    const games = await Games.list();

    SSE.broadcast({
      type: "games_updated",
      games,
    });

    response.status(200).json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start game";

    response.status(400).json({ error: message });
  }
});

export default router;
