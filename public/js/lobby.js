"use strict";
(() => {
  // src/client/lobby.ts
  var createGameButton = document.querySelector("#create-game");
  var gamesList = document.querySelector("#games-list");
  var gameTemplate = document.querySelector("#game-template");
  async function joinGame(gameId) {
    const response = await fetch(`/api/games/${String(gameId)}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      console.error("Failed to join game");
      return;
    }
    window.location.href = `/games/${String(gameId)}`;
  }
  function renderGames(games) {
    if (!gamesList || !gameTemplate) {
      return;
    }
    gamesList.innerHTML = "";
    if (games.length === 0) {
      gamesList.textContent = "No Uno games created yet. Create one!";
      return;
    }
    games.forEach((game) => {
      const clone = gameTemplate.content.cloneNode(true);
      const gameId = clone.querySelector(".game-id");
      const creator = clone.querySelector(".creator");
      const players = clone.querySelector(".players");
      const status = clone.querySelector(".status");
      const joinButton = clone.querySelector(".join-game");
      if (gameId) gameId.textContent = `Uno Game #${String(game.id)}`;
      if (creator) creator.textContent = `Created by: ${game.creator_email}`;
      if (players) players.textContent = `${String(game.player_count)} player(s)`;
      if (status) status.textContent = `Status: ${String(game.status)}`;
      joinButton?.addEventListener("click", () => {
        void joinGame(game.id);
      });
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
      return;
    }
    const { game } = await response.json();
    window.location.href = `/games/${String(game.id)}`;
  }
  var source = new EventSource("/api/sse");
  source.onmessage = (event) => {
    const data = JSON.parse(String(event.data));
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
