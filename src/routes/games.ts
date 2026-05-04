import { Router } from "express";
import Games from "../db/games.js";
import SSE from "../sse.js";

const router = Router();

router.get("/", async (_request, response) => {
  const games = await Games.list();

  response.json({ games });
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

export default router;
