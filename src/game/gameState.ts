import { GAME_CONFIG } from '../constants/game';
import { buildConfiguredDeck, canCardBePlayed, canCardProtect } from './cards';
import { Card, GameState, PlayerState } from './types';

function createPlayers(playerCount: number): PlayerState[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    hand: [],
    protections: Array.from({ length: GAME_CONFIG.awawaSlots }, () => null),
    hasDrawnThisTurn: false,
  }));
}

function evaluateStatus(drawPile: Card[]): GameState['status'] {
  return drawPile.length === 0 ? 'game_over' : 'playing';
}

export function createGameState(playerCount: number): GameState {
  const drawPile = [...buildConfiguredDeck()];
  const players = createPlayers(playerCount);

  for (let round = 0; round < GAME_CONFIG.initialHandSize; round += 1) {
    for (const player of players) {
      const nextCard = drawPile.shift();

      if (!nextCard) {
        return {
          players,
          currentPlayerIndex: 0,
          drawPile,
          selectedCardId: null,
          lastActionText: null,
          status: 'game_over',
        };
      }

      player.hand.push(nextCard);
    }
  }

  return {
    players,
    currentPlayerIndex: 0,
    drawPile,
    selectedCardId: null,
    lastActionText: null,
    status: evaluateStatus(drawPile),
  };
}

export function getCurrentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex];
}

export function getSelectedCard(state: GameState) {
  const currentPlayer = getCurrentPlayer(state);

  return (
    currentPlayer.hand.find((card) => card.id === state.selectedCardId) ?? null
  );
}

export function canDrawCard(state: GameState) {
  const player = getCurrentPlayer(state);

  return (
    state.status === 'playing' &&
    state.drawPile.length > 0 &&
    player.hand.length < GAME_CONFIG.maxHandSize &&
    !player.hasDrawnThisTurn
  );
}

export function drawCard(state: GameState): GameState {
  if (!canDrawCard(state)) {
    return state;
  }

  const nextCard = state.drawPile[0];

  if (!nextCard) {
    return {
      ...state,
      status: 'game_over',
    };
  }

  const players = state.players.map((player, index) =>
    index === state.currentPlayerIndex
      ? {
          ...player,
          hand: [...player.hand, nextCard],
          hasDrawnThisTurn: true,
        }
      : player,
  );

  const drawPile = state.drawPile.slice(1);

  return {
    ...state,
    players,
    drawPile,
    selectedCardId: null,
    lastActionText: 'Card drawn.',
    status: evaluateStatus(drawPile),
  };
}

export function selectCard(state: GameState, cardId: string): GameState {
  const currentPlayer = getCurrentPlayer(state);
  const hasCard = currentPlayer.hand.some((card) => card.id === cardId);

  if (!hasCard || state.status === 'game_over') {
    return state;
  }

  return {
    ...state,
    selectedCardId: state.selectedCardId === cardId ? null : cardId,
    lastActionText: null,
  };
}

export function canPlaySelectedCard(state: GameState) {
  const selectedCard = getSelectedCard(state);

  return (
    state.status === 'playing' &&
    !!selectedCard &&
    canCardBePlayed(selectedCard)
  );
}

export function playSelectedCard(state: GameState): GameState {
  const selectedCard = getSelectedCard(state);

  if (!selectedCard || !canCardBePlayed(selectedCard) || state.status === 'game_over') {
    return state;
  }

  const players = state.players.map((player, index) =>
    index === state.currentPlayerIndex
      ? {
          ...player,
          hand: player.hand.filter((card) => card.id !== selectedCard.id),
        }
      : player,
  );

  return {
    ...state,
    players,
    selectedCardId: null,
    lastActionText: `${selectedCard.type} played.`,
  };
}

export function placeCardInProtection(
  state: GameState,
  cardId: string,
  slotIndex: number,
): GameState {
  const currentPlayer = getCurrentPlayer(state);
  const card = currentPlayer.hand.find((handCard) => handCard.id === cardId);

  if (
    state.status === 'game_over' ||
    !card ||
    !canCardProtect(card) ||
    slotIndex < 0 ||
    slotIndex >= currentPlayer.protections.length ||
    currentPlayer.protections[slotIndex]
  ) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index !== state.currentPlayerIndex) {
      return player;
    }

    const protections = [...player.protections];
    protections[slotIndex] = card;

    return {
      ...player,
      hand: player.hand.filter((handCard) => handCard.id !== cardId),
      protections,
    };
  });

  return {
    ...state,
    players,
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId,
    lastActionText: `${card.type} placed as protection.`,
  };
}

export function finishTurn(state: GameState): GameState {
  if (state.status === 'game_over') {
    return state;
  }

  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex || index === nextPlayerIndex) {
      return {
        ...player,
        hasDrawnThisTurn: false,
      };
    }

    return player;
  });

  return {
    ...state,
    players,
    currentPlayerIndex: nextPlayerIndex,
    selectedCardId: null,
    lastActionText: null,
  };
}
