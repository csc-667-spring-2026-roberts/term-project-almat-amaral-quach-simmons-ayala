"use strict";
(() => {
  // src/client/game.ts
  var gameIdInput = document.querySelector("#game-id");
  var gameStatus = document.querySelector("#game-status");
  var playersList = document.querySelector("#players-list");
  var discardPile = document.querySelector("#discard-pile");
  var playerHand = document.querySelector("#player-hand");
  var startGameButton = document.querySelector("#start-game");
  var gameId = gameIdInput ? Number(gameIdInput.value) : 0;
  function setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }
  async function startGame() {
    if (!Number.isInteger(gameId) || gameId <= 0) {
      console.error("Invalid game id");
      return;
    }
    const response = await fetch(`/api/games/${String(gameId)}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      console.error("Failed to start game");
    }
  }
  if (Number.isInteger(gameId) && gameId > 0) {
    setText(gameStatus, `Connected to Uno Game #${String(gameId)}.`);
    setText(playersList, "Player list will appear here after game state is added.");
    setText(discardPile, "Discard pile will appear after the game starts.");
    setText(playerHand, "Your hand will appear after cards are dealt.");
    const source = new EventSource(`/api/sse?gameId=${String(gameId)}`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "game_updated") {
        setText(gameStatus, data.message ?? "Game updated.");
      }
    };
  }
  startGameButton?.addEventListener("click", () => {
    void startGame();
  });
})();
//# sourceMappingURL=game.js.map
