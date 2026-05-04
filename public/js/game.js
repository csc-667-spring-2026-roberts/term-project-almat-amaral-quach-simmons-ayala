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
  function formatCard(card) {
    return `${card.color} ${card.value}`;
  }
  function parseGameMessage(rawData) {
    const parsedData = JSON.parse(rawData);
    if (typeof parsedData !== "object" || parsedData === null) {
      return null;
    }
    return parsedData;
  }
  function renderPlayers(players, currentUserId) {
    if (!playersList) {
      return;
    }
    playersList.innerHTML = "";
    for (const player of players) {
      const playerRow = document.createElement("p");
      const turnMarker = currentUserId === player.id ? " \u2190 current turn" : "";
      playerRow.textContent = `${player.email}: ${String(player.hand_count)} card(s)${turnMarker}`;
      playersList.appendChild(playerRow);
    }
  }
  function renderHand(hand) {
    if (!playerHand) {
      return;
    }
    playerHand.innerHTML = "";
    if (hand.length === 0) {
      playerHand.textContent = "No cards in your hand yet.";
      return;
    }
    for (const card of hand) {
      const cardButton = document.createElement("button");
      cardButton.type = "button";
      cardButton.textContent = formatCard(card);
      cardButton.disabled = true;
      playerHand.appendChild(cardButton);
    }
  }
  function renderGameState(state) {
    setText(
      gameStatus,
      `Status: ${state.status}. Current color: ${state.current_color ?? "none"}. Deck: ${String(
        state.deck_count
      )} card(s).`
    );
    renderPlayers(state.players, state.current_user_id);
    if (state.discard_top) {
      setText(discardPile, `Top card: ${formatCard(state.discard_top)}`);
    } else {
      setText(discardPile, "No discard card yet.");
    }
    renderHand(state.hand);
  }
  async function loadGameState() {
    if (!Number.isInteger(gameId) || gameId <= 0) {
      console.error("Invalid game id");
      return;
    }
    const response = await fetch(`/api/games/${String(gameId)}/state`);
    if (!response.ok) {
      setText(gameStatus, "Waiting for game to start.");
      return;
    }
    const { state } = await response.json();
    renderGameState(state);
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
    const source = new EventSource(`/api/sse?gameId=${String(gameId)}`);
    source.onmessage = (event) => {
      const data = parseGameMessage(event.data);
      if (data?.type === "game_updated" && data.state) {
        renderGameState(data.state);
      }
    };
    void loadGameState();
  }
  startGameButton?.addEventListener("click", () => {
    void startGame();
  });
})();
//# sourceMappingURL=game.js.map
