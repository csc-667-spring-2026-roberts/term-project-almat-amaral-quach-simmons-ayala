"use strict";
(() => {
  // src/client/lobby.ts
  var createGameButton = document.querySelector("#create-game");
  var gamesList = document.querySelector("#games-list");
  async function loadGames() {
    const response = await fetch("/api/games");
    const games = await response.json();
    if (!gamesList) {
      return;
    }
    if (games.length === 0) {
      gamesList.innerHTML = "<p>No games created yet. Create one!</p>";
      return;
    }
    gamesList.innerHTML = games.map(
      (game) => `
        <div class="game-card">
            <span>Game #${String(game.id)}</span>
            <span>${game.creator_email}</span>
            <span>${String(game.player_count)} player(s)</span>
            <span>${String(game.status)}</span>
        </div>
        `
    ).join("");
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
    await loadGames();
  }
  createGameButton?.addEventListener("click", () => {
    void createGame();
  });
  void loadGames();
})();
//# sourceMappingURL=lobby.js.map
