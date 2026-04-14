import { Router } from "express";
import Games from "../db/games.js";
import SSE from "../sse.js";

const router = Router();

router.get("/", async (_request, response) => {
  const games = await Games.list();
  console.log(games);

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

export default router;
