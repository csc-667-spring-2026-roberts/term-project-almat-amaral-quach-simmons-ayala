import db from "./connections.js";

interface DatabaseRunner {
  none(query: string, values?: unknown): Promise<null>;
  any<T>(query: string, values?: unknown): Promise<T[]>;
}

interface UnoCard {
  id: number;
  color: string;
  value: string;
  points: number;
}

interface UnoPlayer {
  id: number;
  email: string;
}

interface UnoPlayerState {
  id: number;
  email: string;
  hand_count: number;
}

interface UnoGameStateRow {
  game_id: number;
  current_user_id: number | null;
  current_color: string | null;
  direction: number;
  draw_stack: number;
  status: string;
}

interface UnoVisibleCard {
  game_card_id: number;
  card_id: number;
  color: string;
  value: string;
  points: number;
  position: number;
}

export interface UnoGameStateView {
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

function shuffleCards(cards: UnoCard[]): UnoCard[] {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentCard = shuffled[index];
    const swapCard = shuffled[swapIndex];

    if (!currentCard || !swapCard) {
      throw new Error("Card shuffle failed");
    }

    shuffled[index] = swapCard;
    shuffled[swapIndex] = currentCard;
  }

  return shuffled;
}

function takeStartingDiscard(deck: UnoCard[]): UnoCard {
  const normalCardIndex = deck.findIndex((card) => card.color !== "wild");

  if (normalCardIndex >= 0) {
    const removedCards = deck.splice(normalCardIndex, 1);
    const firstRemovedCard = removedCards[0];

    if (firstRemovedCard) {
      return firstRemovedCard;
    }
  }

  const fallbackCard = deck.shift();

  if (!fallbackCard) {
    throw new Error("Cannot start game without cards");
  }

  return fallbackCard;
}

async function getPlayers(gameId: number): Promise<UnoPlayer[]> {
  return db.any<UnoPlayer>(
    `SELECT u.id, u.email
     FROM game_users gu
     JOIN users u ON u.id = gu.user_id
     WHERE gu.game_id = $1
     ORDER BY gu.joined_at ASC`,
    [gameId],
  );
}

async function getStateRow(gameId: number): Promise<UnoGameStateRow> {
  const state = await db.oneOrNone<UnoGameStateRow>(
    `SELECT game_id, current_user_id, current_color, direction, draw_stack, status
     FROM uno_game_state
     WHERE game_id = $1`,
    [gameId],
  );

  if (state === null) {
    throw new Error("Uno game state not found");
  }

  return state;
}

async function getPlayerStates(gameId: number): Promise<UnoPlayerState[]> {
  return db.any<UnoPlayerState>(
    `SELECT
        u.id,
        u.email,
        COUNT(gc.id)::INT AS hand_count
     FROM game_users gu
     JOIN users u ON u.id = gu.user_id
     LEFT JOIN game_cards gc
        ON gc.game_id = gu.game_id
        AND gc.user_id = u.id
        AND gc.zone = 'hand'
     WHERE gu.game_id = $1
     GROUP BY u.id, u.email, gu.joined_at
     ORDER BY gu.joined_at ASC`,
    [gameId],
  );
}

async function getDiscardTop(gameId: number): Promise<UnoVisibleCard | null> {
  return db.oneOrNone<UnoVisibleCard>(
    `SELECT
        gc.id AS game_card_id,
        c.id AS card_id,
        c.color,
        c.value,
        c.points,
        gc.position
     FROM game_cards gc
     JOIN cards c ON c.id = gc.card_id
     WHERE gc.game_id = $1
       AND gc.zone = 'discard'
     ORDER BY gc.position DESC
     LIMIT 1`,
    [gameId],
  );
}

async function getDeckCount(gameId: number): Promise<number> {
  const deckResult = await db.one<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM game_cards
     WHERE game_id = $1
       AND zone = 'deck'`,
    [gameId],
  );

  return Number(deckResult.count);
}

async function getViewerHand(
  gameId: number,
  viewerUserId: number | null,
): Promise<UnoVisibleCard[]> {
  if (viewerUserId === null) {
    return [];
  }

  return db.any<UnoVisibleCard>(
    `SELECT
        gc.id AS game_card_id,
        c.id AS card_id,
        c.color,
        c.value,
        c.points,
        gc.position
     FROM game_cards gc
     JOIN cards c ON c.id = gc.card_id
     WHERE gc.game_id = $1
       AND gc.user_id = $2
       AND gc.zone = 'hand'
     ORDER BY gc.position ASC`,
    [gameId, viewerUserId],
  );
}

async function clearExistingGameCards(transaction: DatabaseRunner, gameId: number): Promise<void> {
  await transaction.none("DELETE FROM game_cards WHERE game_id = $1", [gameId]);
}

async function dealHands(
  transaction: DatabaseRunner,
  gameId: number,
  players: UnoPlayer[],
  deck: UnoCard[],
): Promise<void> {
  const cardsPerPlayer = 7;

  for (const player of players) {
    for (let position = 0; position < cardsPerPlayer; position += 1) {
      const card = deck.shift();

      if (!card) {
        throw new Error("Not enough cards to deal");
      }

      await transaction.none(
        `INSERT INTO game_cards (game_id, card_id, user_id, zone, position)
         VALUES ($1, $2, $3, 'hand', $4)`,
        [gameId, card.id, player.id, position],
      );
    }
  }
}

async function saveDeckCards(
  transaction: DatabaseRunner,
  gameId: number,
  deck: UnoCard[],
): Promise<void> {
  for (let position = 0; position < deck.length; position += 1) {
    const card = deck[position];

    if (!card) {
      throw new Error("Deck card is missing");
    }

    await transaction.none(
      `INSERT INTO game_cards (game_id, card_id, user_id, zone, position)
       VALUES ($1, $2, NULL, 'deck', $3)`,
      [gameId, card.id, position],
    );
  }
}

async function saveDiscardCard(
  transaction: DatabaseRunner,
  gameId: number,
  discardCard: UnoCard,
): Promise<void> {
  await transaction.none(
    `INSERT INTO game_cards (game_id, card_id, user_id, zone, position)
     VALUES ($1, $2, NULL, 'discard', 0)`,
    [gameId, discardCard.id],
  );
}

async function getUnoGameState(
  gameId: number,
  viewerUserId: number | null,
): Promise<UnoGameStateView> {
  const state = await getStateRow(gameId);
  const players = await getPlayerStates(gameId);
  const discardTop = await getDiscardTop(gameId);
  const deckCount = await getDeckCount(gameId);
  const hand = await getViewerHand(gameId, viewerUserId);

  return {
    game_id: state.game_id,
    status: state.status,
    current_user_id: state.current_user_id,
    current_color: state.current_color,
    direction: state.direction,
    draw_stack: state.draw_stack,
    deck_count: deckCount,
    players,
    discard_top: discardTop,
    hand,
  };
}

async function startGame(gameId: number): Promise<UnoGameStateView> {
  return db.tx(async (transaction) => {
    const players = await getPlayers(gameId);

    if (players.length < 2) {
      throw new Error("At least two players are required to start the game");
    }

    const firstPlayer = players[0];

    if (!firstPlayer) {
      throw new Error("Unable to find first player");
    }

    const cards = await transaction.any<UnoCard>(
      "SELECT id, color, value, points FROM cards ORDER BY id ASC",
    );

    if (cards.length === 0) {
      throw new Error("Cards table is empty");
    }

    const deck = shuffleCards(cards);
    const startingDiscard = takeStartingDiscard(deck);

    await clearExistingGameCards(transaction, gameId);
    await dealHands(transaction, gameId, players, deck);
    await saveDiscardCard(transaction, gameId, startingDiscard);
    await saveDeckCards(transaction, gameId, deck);

    await transaction.none(
      `INSERT INTO uno_game_state (
          game_id,
          current_user_id,
          current_color,
          direction,
          draw_stack,
          status
       )
       VALUES ($1, $2, $3, 1, 0, 'active')
       ON CONFLICT (game_id)
       DO UPDATE SET
          current_user_id = EXCLUDED.current_user_id,
          current_color = EXCLUDED.current_color,
          direction = EXCLUDED.direction,
          draw_stack = EXCLUDED.draw_stack,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP`,
      [gameId, firstPlayer.id, startingDiscard.color],
    );

    await transaction.none("UPDATE games SET status = 'started' WHERE id = $1", [gameId]);

    return getUnoGameState(gameId, firstPlayer.id);
  });
}

export default {
  getUnoGameState,
  startGame,
};
