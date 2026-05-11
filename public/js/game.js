"use strict";
(() => {
  // src/client/game.ts
  var gameIdInput = document.querySelector("#game-id");
  var gameStatus = document.querySelector("#game-status");
  var playersList = document.querySelector("#players-list");
  var discardPile = document.querySelector("#discard-pile");
  var playerHand = document.querySelector("#player-hand");
  var startGameButton = document.querySelector("#start-game");
  var drawCardButton = document.querySelector("#draw-card");
  var errorMessage = document.querySelector("#error-message");
  var gameMessage = document.querySelector("#game-message");
  var gameId = gameIdInput ? Number(gameIdInput.value) : 0;
  function setText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }
  function showError(message) {
    if (!errorMessage) {
      return;
    }
    errorMessage.textContent = message;
    setTimeout(() => {
      errorMessage.textContent = "";
    }, 3e3);
  }
  function showMessage(message) {
    setText(gameMessage, message);
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
      playerHand.textContent = "No cards in your hand.";
      return;
    }
    for (const card of hand) {
      const cardButton = document.createElement("button");
      cardButton.type = "button";
      cardButton.textContent = formatCard(card);
      cardButton.addEventListener("click", () => {
        void playCard(card.game_card_id);
      });
      playerHand.appendChild(cardButton);
    }
  }
  function renderGameState(state) {
    if (state.status === "finished") {
      const winner = state.players.find((player) => player.hand_count === 0);
      setText(
        gameStatus,
        `Game Over! Winner: ${winner?.email ?? "Unknown Player"}`
      );
    } else {
      setText(
        gameStatus,
        `Status: ${state.status}. Current color: ${state.current_color ?? "none"}. Deck: ${String(
          state.deck_count
        )} card(s).`
      );
    }
    if (state.discard_top) {
      setText(discardPile, formatCard(state.discard_top));
    } else {
      setText(discardPile, "No discard card yet.");
    }
    renderPlayers(state.players, state.current_user_id);
    renderHand(state.hand);
  }
  async function loadGameState() {
    const response = await fetch(`/api/games/${String(gameId)}/state`);
    if (!response.ok) {
      return;
    }
    const { state } = await response.json();
    renderGameState(state);
  }
  async function startGame() {
    const response = await fetch(`/api/games/${String(gameId)}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      showMessage("Failed to start game.");
    }
  }
  async function drawCard() {
    const response = await fetch(`/api/games/${String(gameId)}/draw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const data = await response.json();
      showError(data.error ?? "Failed to draw card");
      return;
    }
    showMessage("Card drawn. Turn ended.");
  }
  async function playCard(gameCardId) {
    const response = await fetch(`/api/games/${String(gameId)}/play`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ gameCardId })
    });
    if (!response.ok) {
      const error = await response.json();
      showError(
        error.error ?? "Invalid Color or Number please try again or Draw cards"
      );
      return;
    }
    showMessage("Card played successfully.");
  }
  if (Number.isInteger(gameId) && gameId > 0) {
    const source = new EventSource(`/api/sse?gameId=${String(gameId)}`);
    source.onmessage = (event) => {
      const data = parseGameMessage(String(event.data));
      if (data?.type === "game_updated" && data.state) {
        renderGameState(data.state);
      }
    };
    void loadGameState();
  }
  startGameButton?.addEventListener("click", () => {
    void startGame();
  });
  drawCardButton?.addEventListener("click", () => {
    void drawCard();
  });
})();
//# sourceMappingURL=game.js.map
