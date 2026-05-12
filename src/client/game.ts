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
  has_drawn: boolean; // Changed from any to boolean
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

let currentGameState: UnoGameStateView | null = null;

const gameIdInput = document.querySelector<HTMLInputElement>("#game-id");
const gameStatus = document.querySelector<HTMLDivElement>("#game-status");
const playersList = document.querySelector<HTMLDivElement>("#players-list");
// Removed discardPile as it was unused
const playerHand = document.querySelector<HTMLDivElement>("#player-hand");
const startGameButton = document.querySelector<HTMLButtonElement>("#start-game");
const drawCardButton = document.querySelector<HTMLButtonElement>("#draw-card");
const endTurnButton = document.querySelector<HTMLButtonElement>("#end-turn");
const shoutUnoButton = document.querySelector<HTMLButtonElement>("#shout-uno");
const catchUnoButton = document.querySelector<HTMLButtonElement>("#catch-uno");
const errorMessage = document.querySelector<HTMLDivElement>("#error-message");
const gameMessage = document.querySelector<HTMLDivElement>("#game-message");

const currentUserEmailElement = document.querySelector<HTMLElement>("#current-user-email");
// textContent can be null, but since we are assigning to string, we handle the nullish case
const currentUserEmail = currentUserEmailElement?.textContent
  ? currentUserEmailElement.textContent.trim()
  : "";

const gameId = gameIdInput ? Number(gameIdInput.value) : 0;

function setText(element: HTMLElement | null, text: string): void {
  if (element) {
    element.textContent = text;
  }
}

function showError(message: string): void {
  if (!errorMessage) {
    return;
  }
  errorMessage.textContent = message;
  setTimeout(() => {
    errorMessage.textContent = "";
  }, 3000);
}

function showMessage(message: string): void {
  setText(gameMessage, message);
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
  if (!playersList) return;
  playersList.innerHTML = "";

  let myHandCount = 0;

  for (const player of players) {
    const playerRow = document.createElement("p");
    const turnMarker = currentUserId === player.id ? " ← current turn" : "";
    playerRow.textContent = `${player.email}: ${String(player.hand_count)} card(s)${turnMarker}`;
    playersList.appendChild(playerRow);

    if (player.email === currentUserEmail) {
      myHandCount = player.hand_count;
    }
  }

  if (shoutUnoButton) {
    shoutUnoButton.style.display = myHandCount === 2 || myHandCount === 1 ? "inline-block" : "none";
  }
}

function renderHand(hand: UnoVisibleCard[]): void {
  if (!playerHand) return;
  playerHand.innerHTML = "";

  if (hand.length === 0) {
    playerHand.textContent = "No cards in your hand.";
    return;
  }

  for (const card of hand) {
    const cardButton = document.createElement("button");
    cardButton.type = "button";
    cardButton.className = `card ${card.color}`;
    cardButton.textContent = formatCard(card);
    cardButton.style.margin = "5px";
    cardButton.style.padding = "10px";

    cardButton.addEventListener("click", () => {
      void playCard(card.game_card_id);
    });

    playerHand.appendChild(cardButton);
  }
}

function renderGameState(state: UnoGameStateView): void {
  // Added return type
  currentGameState = state;

  // 1. Update status text
  if (gameStatus) {
    const penaltyText = state.draw_stack > 0 ? ` | PENALTY STACK: ${String(state.draw_stack)}` : "";
    gameStatus.innerText = `Status: ${state.status} | Current Color: ${state.current_color || "None"}${penaltyText}`;
  }

  // 2. Manage Button Visibility
  if (startGameButton)
    startGameButton.style.display = state.status === "active" ? "none" : "inline-block";
  if (drawCardButton)
    drawCardButton.style.display = state.status === "active" ? "inline-block" : "none";

  if (endTurnButton) {
    endTurnButton.style.display =
      state.has_drawn && state.draw_stack === 0 ? "inline-block" : "none";
  }

  // 3. Delegation to sub-renderers
  renderPlayers(state.players, state.current_user_id);
  renderHand(state.hand);
}

async function loadGameState(): Promise<void> {
  const response = await fetch(`/api/games/${String(gameId)}/state`);
  if (!response.ok) return;
  const { state } = (await response.json()) as { state: UnoGameStateView };
  renderGameState(state);
}

async function startGame(): Promise<void> {
  const response = await fetch(`/api/games/${String(gameId)}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) showMessage("Failed to start game.");
}

async function drawCard(): Promise<void> {
  const response = await fetch(`/api/games/${String(gameId)}/draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    showError(data.error ?? "Failed to draw card");
    return;
  }
  showMessage("Card(s) drawn.");
}

async function playCard(gameCardId: number): Promise<void> {
  if (!currentGameState) return;

  const card = currentGameState.hand.find((c) => c.game_card_id === gameCardId);
  let chosenColor: string | undefined;

  if (card?.color === "wild") {
    const input = window.prompt("Choose a color: red, blue, green, or yellow");
    if (!input) return;

    const sanitized = input.toLowerCase().trim();
    const validColors = ["red", "blue", "green", "yellow"];

    if (!validColors.includes(sanitized)) {
      showError("Invalid color choice.");
      return;
    }
    chosenColor = sanitized;
  }

  const response = await fetch(`/api/games/${String(gameId)}/play`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameCardId, chosenColor }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { error?: string };
    showError(errorData.error ?? "Invalid play.");
    return;
  }
  showMessage("Card played.");
}

// Action Functions
async function endTurn(): Promise<void> {
  const response = await fetch(`/api/games/${String(gameId)}/end-turn`, { method: "POST" });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    showError(data.error ?? "Failed to end turn");
  }
}

async function shoutUno(): Promise<void> {
  const response = await fetch(`/api/games/${String(gameId)}/shout-uno`, { method: "POST" });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    showError(data.error ?? "Failed to shout UNO");
  } else {
    showMessage("You shouted UNO!");
  }
}

async function catchUno(): Promise<void> {
  const response = await fetch(`/api/games/${String(gameId)}/catch-uno`, { method: "POST" });
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    showError(data.error ?? "Nobody forgot to say UNO.");
  } else {
    showMessage("You caught someone!");
  }
}

// Initializing SSE and State
if (Number.isInteger(gameId) && gameId > 0) {
  const source = new EventSource(`/api/sse?gameId=${String(gameId)}`);
  source.onmessage = (event): void => {
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
endTurnButton?.addEventListener("click", () => {
  void endTurn();
});
shoutUnoButton?.addEventListener("click", () => {
  void shoutUno();
});
catchUnoButton?.addEventListener("click", () => {
  void catchUno();
});
