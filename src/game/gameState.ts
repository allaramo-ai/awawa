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
    hasPlayedCardThisTurn: false,
  }));
}

function getAliveAwawaCount(player: PlayerState) {
  return player.awawas.filter(Boolean).length;
}

function getMissingAwawaSlotIndex(player: PlayerState) {
  return player.awawas.findIndex((alive) => !alive);
}

function getEmptyProtectionSlotIndex(player: PlayerState) {
  return player.protections.findIndex(
    (protection, index) => player.awawas[index] && !protection,
  );
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
    return `Game over. P${winners[0].id} wins with ${highest} Awawas.`;
  }

  const winnerLabel = winners.map((entry) => `P${entry.id}`).join(', ');
  return `Game over. It's a draw between ${winnerLabel} with ${highest} Awawas.`;
}

function getResolvedGameStatus(drawPile: Card[], players: PlayerState[]) {
  const activePlayerIndexes = getActivePlayerIndexes(players);

  if (players.length > 1 && activePlayerIndexes.length <= 1) {
    const winner = players[activePlayerIndexes[0]];

    return {
      status: 'game_over' as const,
      resultText: winner
        ? `Game over. P${winner.id} wins by being the last player with Awawas.`
        : `Game over. It's a draw between no players.`,
    };
  }

  if (drawPile.length < 0) {
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

function getRightPlayerIndex(players: PlayerState[], currentIndex: number) {
  for (let step = 1; step < players.length; step += 1) {
    const index = (currentIndex + step) % players.length;

    if (getAliveAwawaCount(players[index]) > 0) {
      return index;
    }
  }

  return currentIndex;
}

function clearAliveProtections(player: PlayerState) {
  return player.protections.map((protection, index) =>
    player.awawas[index] ? null : protection,
  );
}

function isFirstRound(state: GameState) {
  return state.turnsCompleted < state.players.length;
}

function canPlayAguila(state: GameState, player: PlayerState) {
  return !player.hasPlayedCardThisTurn && !isFirstRound(state);
}

function canPlayBebe(state: GameState, player: PlayerState) {
  return (
    !player.hasPlayedCardThisTurn &&
    state.colonyCount >= 1 &&
    getAliveAwawaCount(player) < GAME_CONFIG.awawaSlots &&
    getMissingAwawaSlotIndex(player) !== -1
  );
}

function getNextSolcitoTarget(state: GameState) {
  for (let step = 1; step < state.players.length; step += 1) {
    const index = (state.currentPlayerIndex + step) % state.players.length;
    const player = state.players[index];

    if (getAliveAwawaCount(player) === 0) {
      continue;
    }

    const slotIndex = getEmptyProtectionSlotIndex(player);

    if (slotIndex !== -1) {
      return { playerIndex: index, slotIndex };
    }
  }

  return null;
}

function canPlaySolcito(state: GameState, player: PlayerState) {
  return !player.hasPlayedCardThisTurn && !!getNextSolcitoTarget(state);
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
          colonyCount: GAME_CONFIG.initialColonySize,
          turnsCompleted: 0,
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
    colonyCount: GAME_CONFIG.initialColonySize,
    turnsCompleted: 0,
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
      selectedCardId: null,
      lastActionText: null,
      resultText: buildDeckWinnerText(state.players),
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
  const resolved = getResolvedGameStatus(drawPile, players);

  return {
    ...state,
    players,
    drawPile,
    selectedCardId: null,
    lastActionText: null,
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
  const currentPlayer = getCurrentPlayer(state);

  if (
    state.status !== 'playing' ||
    !selectedCard ||
    !canCardBePlayed(selectedCard)
  ) {
    return false;
  }

  if (selectedCard.type === 'aguila') {
    return canPlayAguila(state, currentPlayer);
  }

  if (selectedCard.type === 'bebe') {
    return canPlayBebe(state, currentPlayer);
  }

  if (selectedCard.type === 'solcito') {
    return canPlaySolcito(state, currentPlayer);
  }

  return false;
}

function killOnePreferredAwawa(player: PlayerState) {
  const solcitoIndex = player.awawas.findIndex(
    (alive, index) =>
      alive && player.protections[index]?.type === 'solcito',
  );

  const targetIndex =
    solcitoIndex !== -1
      ? solcitoIndex
      : player.awawas.findIndex(
          (alive, index) => alive && !player.protections[index],
        );

  if (targetIndex === -1) {
    return {
      player,
      targetType: null as 'solcito' | 'unprotected' | null,
    };
  }

  const awawas = [...player.awawas];
  const protections = [...player.protections];
  const targetType = solcitoIndex !== -1 ? 'solcito' : 'unprotected';

  awawas[targetIndex] = false;
  protections[targetIndex] = null;

  return {
    player: {
      ...player,
      awawas,
      protections,
    },
    targetType,
  };
}

function playAguila(state: GameState, selectedCard: Card): GameState {
  const actorId = state.players[state.currentPlayerIndex].id;
  const impactMessages: string[] = [];
  const targetPlayerIndex = getRightPlayerIndex(
    state.players,
    state.currentPlayerIndex,
  );

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        hasPlayedCardThisTurn: true,
      };
    }

    if (index !== targetPlayerIndex) {
      return player;
    }

    const { player: attackedPlayer, targetType } = killOnePreferredAwawa(player);
    const awawaLost =
      getAliveAwawaCount(attackedPlayer) < getAliveAwawaCount(player);

    impactMessages.push(
      awawaLost
        ? `Your \u00C1guila took one Awawa from P${player.id}.`
        : targetType === 'unprotected'
          ? `Your \u00C1guila removed protections from P${player.id}.`
          : `Your \u00C1guila could not reach an unprotected Awawa from P${player.id}.`,
    );

    return {
      ...attackedPlayer,
      protections:
        targetType === 'unprotected'
          ? clearAliveProtections(attackedPlayer)
          : attackedPlayer.protections,
      notices: [
        ...attackedPlayer.notices,
        awawaLost
          ? `P${actorId}'s \u00C1guila took one Awawa from you and removed your protections.`
          : targetType === 'unprotected'
            ? `P${actorId}'s \u00C1guila removed your protections, but did not take an Awawa.`
            : `P${actorId}'s \u00C1guila could not reach one of your unprotected Awawas.`,
      ],
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);
  const actorMessages = resolved.status === 'game_over' ? [] : impactMessages;

  return {
    ...state,
    players: players.map((player, index) =>
      index === state.currentPlayerIndex
        ? {
            ...player,
            notices: [...player.notices, ...actorMessages],
          }
        : player,
    ),
    selectedCardId: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function playBebe(state: GameState, selectedCard: Card): GameState {
  const currentPlayer = getCurrentPlayer(state);
  const missingSlotIndex = getMissingAwawaSlotIndex(currentPlayer);

  if (missingSlotIndex === -1) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index !== state.currentPlayerIndex) {
      return player;
    }

    const awawas = [...player.awawas];
    awawas[missingSlotIndex] = true;

    return {
      ...player,
      hand: player.hand.filter((card) => card.id !== selectedCard.id),
      awawas,
      hasPlayedCardThisTurn: true,
    };
  });

  const colonyCount = state.colonyCount - 1;
  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    colonyCount,
    selectedCardId: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function playSolcito(state: GameState, selectedCard: Card): GameState {
  const actorId = state.players[state.currentPlayerIndex].id;
  const target = getNextSolcitoTarget(state);

  if (!target) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        hasPlayedCardThisTurn: true,
      };
    }

    if (index !== target.playerIndex) {
      return player;
    }

    const protections = [...player.protections];
    protections[target.slotIndex] = {
      id: `${selectedCard.id}-target-${player.id}`,
      type: 'solcito',
      sourcePlayerId: actorId,
    };

    return {
      ...player,
      protections,
      notices: [
        ...player.notices,
        `P${actorId}'s Solcito landed on your Awawa board.`,
      ],
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);
  const actorMessage =
    resolved.status === 'game_over'
      ? null
      : `Your Solcito landed on P${players[target.playerIndex].id}.`;

  return {
    ...state,
    players: players.map((player, index) =>
      index === state.currentPlayerIndex && actorMessage
        ? {
            ...player,
            notices: [...player.notices, actorMessage],
          }
        : player,
    ),
    selectedCardId: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

export function playSelectedCard(state: GameState): GameState {
  const selectedCard = getSelectedCard(state);

  if (
    !selectedCard ||
    !canPlaySelectedCard(state) ||
    state.status === 'game_over'
  ) {
    return state;
  }

  if (selectedCard.type === 'aguila') {
    return playAguila(state, selectedCard);
  }

  if (selectedCard.type === 'bebe') {
    return playBebe(state, selectedCard);
  }

  if (selectedCard.type === 'solcito') {
    return playSolcito(state, selectedCard);
  }

  return state;
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
    lastActionText: null,
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
        hasPlayedCardThisTurn: false,
      };
    }

    return player;
  });

  return {
    ...state,
    players,
    currentPlayerIndex: nextPlayerIndex,
    turnsCompleted: state.turnsCompleted + 1,
    selectedCardId: null,
    lastActionText: null,
  };
}

export function dismissCurrentNotification(state: GameState): GameState {
  if (state.status === 'game_over') {
    return state;
  }

  const players = state.players.map((player, index) =>
    index === state.currentPlayerIndex
      ? {
          ...player,
          notices: player.notices.slice(1),
        }
      : player,
  );

  return {
    ...state,
    players,
  };
}
