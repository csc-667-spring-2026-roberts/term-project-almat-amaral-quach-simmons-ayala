"use strict";
(() => {
  // src/client/lobby.ts
  var createGameButton = document.querySelector("#create-game");
  var gamesList = document.querySelector("#games-list");
  var gameTemplate = document.querySelector("#game-template");
  function renderGames(games) {
    if (!gamesList || !gameTemplate) {
      return;
    }
    gamesList.innerHTML = "";
    if (games.length === 0) {
      gamesList.textContent = "No games created yet. Create one!";
      return;
    }
    games.forEach((game) => {
      const clone = gameTemplate.content.cloneNode(true);
      const gameId = clone.querySelector(".game-id");
      const creator = clone.querySelector(".creator");
      const players = clone.querySelector(".players");
      const status = clone.querySelector(".status");
      if (gameId) gameId.textContent = `Game #${String(game.id)}`;
      if (creator) creator.textContent = game.creator_email;
      if (players) players.textContent = `${String(game.player_count)} player(s)`;
      if (status) status.textContent = String(game.status);
      gamesList.appendChild(clone);
    });
  }
  async function loadGames() {
    const response = await fetch("/api/games");
    const { games } = await response.json();
    renderGames(games);
  }
  async function createGame() {
    const response = await fetch("/api/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      console.error("Failed to create game");
    }
  }
  var source = new EventSource("/api/sse");
  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "games_updated" && data.games) {
      renderGames(data.games);
    }
  };
  createGameButton?.addEventListener("click", () => {
    void createGame();
  });
  void loadGames();
})();
//# sourceMappingURL=lobby.js.map
