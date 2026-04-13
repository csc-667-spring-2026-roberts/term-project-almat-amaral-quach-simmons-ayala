import type { GameListItem } from "../types/types.js";

const createGameButton = document.querySelector<HTMLButtonElement>("#create-game");
const gamesList = document.querySelector<HTMLDivElement>("#games-list");
const gameTemplate = document.querySelector<HTMLTemplateElement>("#game-template");

async function loadGames(): Promise<void> {
  const response = await fetch("/api/games");
  const { games } = (await response.json()) as { games: GameListItem[] };

  if (!gamesList || !gameTemplate) {
    return;
  }

  gamesList.innerHTML = "";

  if (games.length === 0) {
    gamesList.textContent = "No games created yet. Create one!";
    return;
  }

  games.forEach((game: GameListItem) => {
    const clone = gameTemplate.content.cloneNode(true) as DocumentFragment;

    const gameId = clone.querySelector<HTMLElement>(".game-id");
    const creator = clone.querySelector<HTMLElement>(".creator");
    const players = clone.querySelector<HTMLElement>(".players");
    const status = clone.querySelector<HTMLElement>(".status");

    if (gameId) gameId.textContent = `Game #${String(game.id)}`;
    if (creator) creator.textContent = game.creator_email;
    if (players) players.textContent = `${String(game.player_count)} player(s)`;
    if (status) status.textContent = String(game.status);

    gamesList.appendChild(clone);
  });
}

async function createGame(): Promise<void> {
  const response = await fetch("/api/games", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error("Failed to create game");
    return;
  }

  await loadGames();
}

createGameButton?.addEventListener("click", () => {
  void createGame();
});

void loadGames();
