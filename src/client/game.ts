const gameIdInput = document.querySelector<HTMLInputElement>("#game-id");
const gameStatus = document.querySelector<HTMLDivElement>("#game-status");
const playersList = document.querySelector<HTMLDivElement>("#players-list");
const discardPile = document.querySelector<HTMLDivElement>("#discard-pile");
const playerHand = document.querySelector<HTMLDivElement>("#player-hand");
const startGameButton = document.querySelector<HTMLButtonElement>("#start-game");

const gameId = gameIdInput ? Number(gameIdInput.value) : 0;

function setText(element: HTMLElement | null, text: string): void {
  if (element) {
    element.textContent = text;
  }
}

async function startGame(): Promise<void> {
  if (!Number.isInteger(gameId) || gameId <= 0) {
    console.error("Invalid game id");
    return;
  }

  const response = await fetch(`/api/games/${String(gameId)}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

  source.onmessage = (event): void => {
    const data = JSON.parse(event.data) as {
      type?: string;
      message?: string;
    };

    if (data.type === "game_updated") {
      setText(gameStatus, data.message ?? "Game updated.");
    }
  };
}

startGameButton?.addEventListener("click", () => {
  void startGame();
});
