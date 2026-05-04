interface UnoVisibleCard {
  game_card_id: number;
  card_id: number;
  color: string;
  value: string;
  points: number;
  position: number;
}

interface UnoPlayerState {
  id: number;
  email: string;
  hand_count: number;
}

interface UnoGameStateView {
  game_id: number;
  status: string;
  current_user_id: number | null;
  current_color: string | null;
  direction: number;
  draw_stack: number;
  deck_count: number;
  players: UnoPlayerState[];
  discard_top: UnoVisibleCard | null;
  hand: UnoVisibleCard[];
}

interface GameMessage {
  type?: string;
  state?: UnoGameStateView;
}

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

function formatCard(card: UnoVisibleCard): string {
  return `${card.color} ${card.value}`;
}

function parseGameMessage(rawData: string): GameMessage | null {
  const parsedData = JSON.parse(rawData) as unknown;

  if (typeof parsedData !== "object" || parsedData === null) {
    return null;
  }

  return parsedData as GameMessage;
}

function renderPlayers(players: UnoPlayerState[], currentUserId: number | null): void {
  if (!playersList) {
    return;
  }

  playersList.innerHTML = "";

  for (const player of players) {
    const playerRow = document.createElement("p");
    const turnMarker = currentUserId === player.id ? " ← current turn" : "";

    playerRow.textContent = `${player.email}: ${String(player.hand_count)} card(s)${turnMarker}`;
    playersList.appendChild(playerRow);
  }
}

function renderHand(hand: UnoVisibleCard[]): void {
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

function renderGameState(state: UnoGameStateView): void {
  setText(
    gameStatus,
    `Status: ${state.status}. Current color: ${state.current_color ?? "none"}. Deck: ${String(
      state.deck_count,
    )} card(s).`,
  );

  renderPlayers(state.players, state.current_user_id);

  if (state.discard_top) {
    setText(discardPile, `Top card: ${formatCard(state.discard_top)}`);
  } else {
    setText(discardPile, "No discard card yet.");
  }

  renderHand(state.hand);
}

async function loadGameState(): Promise<void> {
  if (!Number.isInteger(gameId) || gameId <= 0) {
    console.error("Invalid game id");
    return;
  }

  const response = await fetch(`/api/games/${String(gameId)}/state`);

  if (!response.ok) {
    setText(gameStatus, "Waiting for game to start.");
    return;
  }

  const { state } = (await response.json()) as { state: UnoGameStateView };

  renderGameState(state);
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
  const source = new EventSource(`/api/sse?gameId=${String(gameId)}`);

  source.onmessage = (event): void => {
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
