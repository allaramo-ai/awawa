import { GAME_CONFIG } from '../constants/game';
import { buildConfiguredDeck } from './cards';
import { Card, GameState, PlayerState } from './types';

function createPlayers(playerCount: number): PlayerState[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    hand: [],
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
    status: evaluateStatus(drawPile),
  };
}

export function getCurrentPlayer(state: GameState) {
  return state.players[state.currentPlayerIndex];
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
    status: evaluateStatus(drawPile),
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
  };
}
