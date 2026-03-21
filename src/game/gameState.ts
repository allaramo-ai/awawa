import { GAME_CONFIG } from '../constants/game';
import { buildConfiguredDeck, canCardBePlayed, canCardProtect } from './cards';
import { Card, GameState, PlayerState } from './types';

function createPlayers(playerCount: number): PlayerState[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: index + 1,
    hand: [],
    protections: Array.from({ length: GAME_CONFIG.awawaSlots }, () => null),
    awawas: Array.from({ length: GAME_CONFIG.awawaSlots }, () => true),
    notices: [],
    hasDrawnThisTurn: false,
  }));
}

function getAliveAwawaCount(player: PlayerState) {
  return player.awawas.filter(Boolean).length;
}

function getActivePlayerIndexes(players: PlayerState[]) {
  return players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => getAliveAwawaCount(player) > 0)
    .map(({ index }) => index);
}

function buildDeckWinnerText(players: PlayerState[]) {
  const counts = players.map((player) => ({
    id: player.id,
    awawas: getAliveAwawaCount(player),
  }));
  const highest = Math.max(...counts.map((entry) => entry.awawas));
  const winners = counts.filter((entry) => entry.awawas === highest);

  if (winners.length === 1) {
    return `Game over. Player ${winners[0].id} wins with ${highest} Awawas.`;
  }

  const winnerLabel = winners.map((entry) => `Player ${entry.id}`).join(', ');
  return `Game over. It's a draw between ${winnerLabel} with ${highest} Awawas.`;
}

function getResolvedGameStatus(drawPile: Card[], players: PlayerState[]) {
  const activePlayerIndexes = getActivePlayerIndexes(players);

  if (players.length > 1 && activePlayerIndexes.length <= 1) {
    const winner = players[activePlayerIndexes[0]];

    return {
      status: 'game_over' as const,
      resultText: winner
        ? `Game over. Player ${winner.id} wins by being the last player with Awawas.`
        : `Game over. It's a draw between no players.`,
    };
  }

  if (drawPile.length === 0) {
    return {
      status: 'game_over' as const,
      resultText: buildDeckWinnerText(players),
    };
  }

  return {
    status: 'playing' as const,
    resultText: null,
  };
}

function getNextActivePlayerIndex(players: PlayerState[], currentIndex: number) {
  const activeIndexes = getActivePlayerIndexes(players);

  if (activeIndexes.length === 0) {
    return currentIndex;
  }

  const nextIndex = activeIndexes.find((index) => index > currentIndex);

  return nextIndex ?? activeIndexes[0];
}

function clearAliveProtections(player: PlayerState) {
  return player.protections.map((protection, index) =>
    player.awawas[index] ? null : protection,
  );
}

export function createGameState(playerCount: number): GameState {
  const drawPile = [...buildConfiguredDeck()];
  const players = createPlayers(playerCount);

  for (let round = 0; round < GAME_CONFIG.initialHandSize; round += 1) {
    for (const player of players) {
      const nextCard = drawPile.shift();

      if (!nextCard) {
        const resolved = getResolvedGameStatus(drawPile, players);

        return {
          players,
          currentPlayerIndex: 0,
          drawPile,
          selectedCardId: null,
          lastActionText: null,
          resultText: resolved.resultText,
          status: resolved.status,
        };
      }

      player.hand.push(nextCard);
    }
  }

  const resolved = getResolvedGameStatus(drawPile, players);

  return {
    players,
    currentPlayerIndex: 0,
    drawPile,
    selectedCardId: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
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
    getAliveAwawaCount(player) > 0 &&
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
    const resolved = getResolvedGameStatus([], state.players);

    return {
      ...state,
      resultText: resolved.resultText,
      status: resolved.status,
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
  const resolved = getResolvedGameStatus(drawPile, players);

  return {
    ...state,
    players,
    drawPile,
    selectedCardId: null,
    lastActionText: resolved.status === 'game_over' ? null : 'Card drawn.',
    resultText: resolved.resultText,
    status: resolved.status,
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

function killOneUnprotectedAwawa(player: PlayerState) {
  const targetIndex = player.awawas.findIndex(
    (alive, index) => alive && !player.protections[index],
  );

  if (targetIndex === -1) {
    return player;
  }

  const awawas = [...player.awawas];
  const protections = [...player.protections];

  awawas[targetIndex] = false;
  protections[targetIndex] = null;

  return {
    ...player,
    awawas,
    protections,
  };
}

export function playSelectedCard(state: GameState): GameState {
  const selectedCard = getSelectedCard(state);

  if (
    !selectedCard ||
    !canCardBePlayed(selectedCard) ||
    state.status === 'game_over'
  ) {
    return state;
  }

  const actorId = state.players[state.currentPlayerIndex].id;
  const impactMessages: string[] = [];
  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
      };
    }

    const attackedPlayer = killOneUnprotectedAwawa(player);
    const awawaLost =
      getAliveAwawaCount(attackedPlayer) < getAliveAwawaCount(player);

    impactMessages.push(
      awawaLost
        ? `Your \u00C1guila took one Awawa from Player ${player.id}.`
        : `Your \u00C1guila removed protections from Player ${player.id}.`,
    );

    return {
      ...attackedPlayer,
      protections: clearAliveProtections(attackedPlayer),
      notices: [
        ...attackedPlayer.notices,
        awawaLost
          ? `Player ${actorId}'s \u00C1guila took one Awawa from you and removed your protections.`
          : `Player ${actorId}'s \u00C1guila removed your protections, but did not take an Awawa.`,
      ],
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    selectedCardId: null,
    lastActionText:
      resolved.status === 'game_over'
        ? null
        : impactMessages.join(' '),
    resultText: resolved.resultText,
    status: resolved.status,
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
    !currentPlayer.awawas[slotIndex] ||
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
    selectedCardId:
      state.selectedCardId === cardId ? null : state.selectedCardId,
    lastActionText: `${card.type} placed as protection.`,
  };
}

export function finishTurn(state: GameState): GameState {
  if (state.status === 'game_over') {
    return state;
  }

  const nextPlayerIndex = getNextActivePlayerIndex(
    state.players,
    state.currentPlayerIndex,
  );
  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex || index === nextPlayerIndex) {
      return {
        ...player,
        notices: index === state.currentPlayerIndex ? [] : player.notices,
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
