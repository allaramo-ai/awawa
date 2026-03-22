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
    playedCardsThisTurn: 0,
    hasThrownCardThisTurn: false,
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
    (protection, index) =>
      player.awawas[index] &&
      !protection &&
      !isProtectionPlacementBlocked(player, index),
  );
}

function isTemporaryProtection(card: Card | null) {
  return (
    card?.type === 'solcito' ||
    card?.type === 'correr' ||
    card?.type === 'elefante' ||
    card?.type === 'toilet' ||
    card?.type === 'oloroso'
  );
}

function withTemporaryDuration(card: Card) {
  return {
    ...card,
    remainingTurnStarts: GAME_CONFIG.temporaryProtectionTurnStarts,
  };
}

function getNearestAliveAwawaIndex(
  player: PlayerState,
  fromIndex: number,
  direction: -1 | 1,
) {
  for (
    let slotIndex = fromIndex + direction;
    slotIndex >= 0 && slotIndex < player.awawas.length;
    slotIndex += direction
  ) {
    if (player.awawas[slotIndex]) {
      return slotIndex;
    }
  }

  return null;
}

function syncEscapingMarkers(player: PlayerState): PlayerState {
  const protections = player.protections.map((protection) =>
    protection?.type === 'escaping' ? null : protection,
  );

  protections.forEach((protection, index) => {
    if (protection?.type !== 'oloroso' || !player.awawas[index]) {
      return;
    }

    const adjacentIndexes = [
      getNearestAliveAwawaIndex(player, index, -1),
      getNearestAliveAwawaIndex(player, index, 1),
    ].filter(
      (slotIndex): slotIndex is number =>
        slotIndex !== null && protections[slotIndex]?.type !== 'oloroso',
    );

    adjacentIndexes.forEach((slotIndex) => {
      protections[slotIndex] = {
        id: `escaping-p${player.id}-${index}-${slotIndex}`,
        type: 'escaping',
      };
    });
  });

  return {
    ...player,
    protections,
  };
}

function isProtectionPlacementBlocked(player: PlayerState, slotIndex: number) {
  const leftAliveIndex = getNearestAliveAwawaIndex(player, slotIndex, -1);
  const rightAliveIndex = getNearestAliveAwawaIndex(player, slotIndex, 1);

  return (
    (leftAliveIndex !== null &&
      player.protections[leftAliveIndex]?.type === 'oloroso') ||
    (rightAliveIndex !== null &&
      player.protections[rightAliveIndex]?.type === 'oloroso')
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

function getAguilaTargetIndex(state: GameState) {
  for (let step = 1; step < state.players.length; step += 1) {
    const index = (state.currentPlayerIndex + step) % state.players.length;
    const player = state.players[index];

    if (getAliveAwawaCount(player) === 0) {
      continue;
    }

    const hasTarget = player.awawas.some(
      (alive, slotIndex) =>
        alive &&
        (player.protections[slotIndex]?.type === 'awawa' ||
          player.protections[slotIndex]?.type === 'solcito' ||
          player.protections[slotIndex]?.type === 'escaping' ||
          !player.protections[slotIndex]),
    );

    if (hasTarget) {
      return index;
    }
  }

  return null;
}

function getAguilaValidSlotIndexes(player: PlayerState) {
  const awawaIndexes = player.awawas
    .map((alive, slotIndex) =>
      alive && player.protections[slotIndex]?.type === 'awawa'
        ? slotIndex
        : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);

  if (awawaIndexes.length > 0) {
    return awawaIndexes;
  }

  const solcitoIndexes = player.awawas
    .map((alive, slotIndex) =>
      alive && player.protections[slotIndex]?.type === 'solcito'
        ? slotIndex
        : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);

  if (solcitoIndexes.length > 0) {
    return solcitoIndexes;
  }

  const escapingIndexes = player.awawas
    .map((alive, slotIndex) =>
      alive && player.protections[slotIndex]?.type === 'escaping'
        ? slotIndex
        : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);

  if (escapingIndexes.length > 0) {
    return escapingIndexes;
  }

  return player.awawas
    .map((alive, slotIndex) =>
      alive && !player.protections[slotIndex] ? slotIndex : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);
}

function getSolcitoValidSlotIndexes(player: PlayerState) {
  return player.protections
    .map((protection, index) =>
      player.awawas[index] &&
      !protection &&
      !isProtectionPlacementBlocked(player, index)
        ? index
        : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);
}

function getOlorosoTarget(state: GameState) {
  for (let step = 1; step < state.players.length; step += 1) {
    const index = (state.currentPlayerIndex + step) % state.players.length;
    const player = state.players[index];

    if (getAliveAwawaCount(player) === 0) {
      continue;
    }

    const slotIndex = player.protections.findIndex(
      (protection, protectionIndex) =>
        player.awawas[protectionIndex] &&
        !protection &&
        !isProtectionPlacementBlocked(player, protectionIndex),
    );

    if (slotIndex !== -1) {
      return { playerIndex: index, slotIndex };
    }
  }

  return null;
}

function getOlorosoValidSlotIndexes(player: PlayerState) {
  return player.protections
    .map((protection, index) =>
      player.awawas[index] &&
      !protection &&
      !isProtectionPlacementBlocked(player, index)
        ? index
        : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);
}

function getAwawaCaptureTarget(state: GameState) {
  for (let step = 1; step < state.players.length; step += 1) {
    const index = (state.currentPlayerIndex + step) % state.players.length;
    const player = state.players[index];

    if (getAliveAwawaCount(player) === 0) {
      continue;
    }

    const slotIndex = player.awawas.findIndex(
      (alive, protectionIndex) => alive && !player.protections[protectionIndex],
    );

    if (slotIndex !== -1) {
      return { playerIndex: index, slotIndex };
    }
  }

  return null;
}

function getLeftPlayerIndexes(players: PlayerState[], currentIndex: number) {
  const indexes: number[] = [];

  for (let step = 1; step < players.length; step += 1) {
    const index = (currentIndex - step + players.length) % players.length;

    if (getAliveAwawaCount(players[index]) > 0) {
      indexes.push(index);
    }
  }

  return indexes;
}

function hasToiletOwnedByOtherPlayer(
  players: PlayerState[],
  currentPlayerIndex: number,
) {
  return players.some(
    (player, index) =>
      index !== currentPlayerIndex &&
      player.protections.some((protection) => protection?.type === 'toilet'),
  );
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
  return (
    player.playedCardsThisTurn < 2 &&
    !isFirstRound(state) &&
    getAguilaTargetIndex(state) !== null
  );
}

function canPlayBebe(state: GameState, player: PlayerState) {
  return (
    player.playedCardsThisTurn < 2 &&
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
  return player.playedCardsThisTurn < 2 && !!getNextSolcitoTarget(state);
}

function canPlayElefante(state: GameState, player: PlayerState) {
  return (
    player.playedCardsThisTurn < 2 &&
    player.awawas.some((alive) => alive)
  );
}

function canPlayOloroso(state: GameState, player: PlayerState) {
  return player.playedCardsThisTurn < 2 && !!getOlorosoTarget(state);
}

function getGritarTarget(state: GameState) {
  const leftIndexes = getLeftPlayerIndexes(
    state.players,
    state.currentPlayerIndex,
  );

  for (const playerIndex of leftIndexes) {
    const slotIndex = state.players[playerIndex].protections.findIndex(
      (protection, index) =>
        state.players[playerIndex].awawas[index] &&
        !!protection &&
        protection.type !== 'elefante' &&
        protection.type !== 'solcito',
    );

    if (slotIndex !== -1) {
      return { playerIndex, slotIndex };
    }
  }

  return null;
}

function getGritarValidSlotIndexes(player: PlayerState) {
  return player.protections
    .map((protection, index) =>
      player.awawas[index] &&
      !!protection &&
      protection.type !== 'escaping' &&
      protection.type !== 'elefante' &&
      protection.type !== 'solcito'
        ? index
        : -1,
    )
    .filter((slotIndex) => slotIndex !== -1);
}

function canPlayGritar(state: GameState, player: PlayerState) {
  return player.playedCardsThisTurn < 2 && !!getGritarTarget(state);
}

function getReyTargetIndex(state: GameState) {
  let highestCount = -1;
  let targetIndex: number | null = null;

  for (let step = 1; step < state.players.length; step += 1) {
    const index = (state.currentPlayerIndex + step) % state.players.length;
    const awawaCount = getAliveAwawaCount(state.players[index]);

    if (awawaCount <= 0) {
      continue;
    }

    if (awawaCount > highestCount) {
      highestCount = awawaCount;
      targetIndex = index;
    }
  }

  return targetIndex;
}

function getReyValidSlotIndexes(player: PlayerState) {
  return player.awawas
    .map((alive, index) => (alive ? index : -1))
    .filter((slotIndex) => slotIndex !== -1);
}

function canPlayRey(state: GameState, player: PlayerState) {
  return (
    player.playedCardsThisTurn < 2 &&
    getAliveAwawaCount(player) < GAME_CONFIG.awawaSlots &&
    getMissingAwawaSlotIndex(player) !== -1 &&
    getReyTargetIndex(state) !== null
  );
}

function clearTemporaryProtections(player: PlayerState) {
    const protections: Array<Card | null> = player.protections.map((protection) => {
    if (!protection || !isTemporaryProtection(protection)) {
      return protection;
    }

    const remainingTurnStarts = protection.remainingTurnStarts
      ?? GAME_CONFIG.temporaryProtectionTurnStarts;

    if (remainingTurnStarts <= 1) {
      return null;
    }

    return {
      ...protection,
      remainingTurnStarts: remainingTurnStarts - 1,
    };
  });

  return {
    ...syncEscapingMarkers({
      ...player,
      protections,
    }),
  };
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
          pendingTargetAction: null,
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
    pendingTargetAction: null,
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
    !state.pendingTargetAction &&
    getAliveAwawaCount(player) > 0 &&
    player.hand.length < GAME_CONFIG.maxHandSize &&
    !player.hasDrawnThisTurn
  );
}

export function getPendingTarget(state: GameState) {
  if (!state.pendingTargetAction) {
    return null;
  }

  const targetPlayer = state.players[state.pendingTargetAction.targetPlayerIndex];

  return {
    type: state.pendingTargetAction.type,
    playerId: targetPlayer.id,
    protections: targetPlayer.protections,
    awawas: targetPlayer.awawas,
    validSlotIndexes:
      state.pendingTargetAction.type === 'aguila'
        ? getAguilaValidSlotIndexes(targetPlayer)
        : state.pendingTargetAction.type === 'solcito'
          ? getSolcitoValidSlotIndexes(targetPlayer)
          : state.pendingTargetAction.type === 'oloroso'
            ? getOlorosoValidSlotIndexes(targetPlayer)
          : state.pendingTargetAction.type === 'gritar'
            ? getGritarValidSlotIndexes(targetPlayer)
            : getReyValidSlotIndexes(targetPlayer),
    selectedSlotIndex: state.pendingTargetAction.selectedSlotIndex,
  };
}

export function canThrowSelectedCard(state: GameState) {
  const currentPlayer = getCurrentPlayer(state);
  const selectedCard = getSelectedCard(state);

  return (
    state.status === 'playing' &&
    !state.pendingTargetAction &&
    !!selectedCard &&
    currentPlayer.hand.length > 0 &&
    !currentPlayer.hasThrownCardThisTurn
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
      pendingTargetAction: null,
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
    pendingTargetAction: null,
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
    pendingTargetAction: null,
    lastActionText: null,
  };
}

export function canPlaySelectedCard(state: GameState) {
  const selectedCard = getSelectedCard(state);
  const currentPlayer = getCurrentPlayer(state);

  if (
    state.status !== 'playing' ||
    state.pendingTargetAction !== null ||
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

  if (selectedCard.type === 'elefante') {
    return canPlayElefante(state, currentPlayer);
  }

  if (selectedCard.type === 'oloroso') {
    return canPlayOloroso(state, currentPlayer);
  }

  if (selectedCard.type === 'gritar') {
    return canPlayGritar(state, currentPlayer);
  }

  if (selectedCard.type === 'rey') {
    return canPlayRey(state, currentPlayer);
  }

  return false;
}

function killAwawaAtSlot(player: PlayerState, targetIndex: number) {
  const awawas = [...player.awawas];
  const protections = [...player.protections];
  const targetType =
    player.protections[targetIndex]?.type === 'awawa'
      ? 'awawa'
      : player.protections[targetIndex]?.type === 'solcito'
        ? 'solcito'
        : player.protections[targetIndex]?.type === 'escaping'
          ? 'escaping'
          : 'unprotected';

  if (targetType !== 'awawa') {
    awawas[targetIndex] = false;
  }
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

function beginAguilaAction(state: GameState): GameState {
  const targetPlayerIndex = getAguilaTargetIndex(state);

  if (targetPlayerIndex === null) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: {
      type: 'aguila',
      targetPlayerIndex,
      selectedSlotIndex: null,
    },
  };
}

export function selectTargetSlot(
  state: GameState,
  slotIndex: number,
): GameState {
  const pendingAction = state.pendingTargetAction;

  if (!pendingAction) {
    return state;
  }

  const targetPlayer = state.players[pendingAction.targetPlayerIndex];
  const validSlotIndexes =
    pendingAction.type === 'aguila'
      ? getAguilaValidSlotIndexes(targetPlayer)
      : pendingAction.type === 'solcito'
        ? getSolcitoValidSlotIndexes(targetPlayer)
        : pendingAction.type === 'oloroso'
          ? getOlorosoValidSlotIndexes(targetPlayer)
        : pendingAction.type === 'gritar'
          ? getGritarValidSlotIndexes(targetPlayer)
          : getReyValidSlotIndexes(targetPlayer);

  if (!validSlotIndexes.includes(slotIndex)) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: {
      ...pendingAction,
      selectedSlotIndex: slotIndex,
    },
  };
}

export function cancelTargetAction(state: GameState): GameState {
  if (!state.pendingTargetAction) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: null,
  };
}

function resolveAguilaAction(state: GameState) {
  const selectedCard = getSelectedCard(state);
  const pendingAction = state.pendingTargetAction;

  if (
    !pendingAction ||
    !selectedCard ||
    selectedCard.type !== 'aguila' ||
    pendingAction.type !== 'aguila' ||
    pendingAction.selectedSlotIndex === null
  ) {
    return state;
  }

  const actorId = state.players[state.currentPlayerIndex].id;
  const targetPlayer = state.players[pendingAction.targetPlayerIndex];
  const selectedSlotIndex = pendingAction.selectedSlotIndex;

  if (
    !getAguilaValidSlotIndexes(targetPlayer).includes(selectedSlotIndex)
  ) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        playedCardsThisTurn: player.playedCardsThisTurn + 1,
      };
    }

    if (index !== pendingAction.targetPlayerIndex) {
      return player;
    }

    const { player: attackedPlayer, targetType } = killAwawaAtSlot(
      player,
      selectedSlotIndex,
    );
    const awawaLost =
      getAliveAwawaCount(attackedPlayer) < getAliveAwawaCount(player);
    const baseProtections =
      targetType === 'unprotected' || targetType === 'escaping'
        ? clearAliveProtections(attackedPlayer)
        : attackedPlayer.protections;
    const finalPlayer = syncEscapingMarkers({
      ...attackedPlayer,
      protections: baseProtections,
    });

    return {
      ...finalPlayer,
      notices: [
        ...finalPlayer.notices,
        awawaLost
          ? targetType === 'unprotected' || targetType === 'escaping'
            ? `P${actorId}'s \u00C1guila took one Awawa from you and removed your protections.`
            : `P${actorId}'s \u00C1guila took one Awawa from you.`
          : targetType === 'unprotected' || targetType === 'escaping'
            ? `P${actorId}'s \u00C1guila removed your protections, but did not take an Awawa.`
            : `P${actorId}'s \u00C1guila could not reach one of your unprotected Awawas.`,
      ],
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players: players.map((player, index) =>
      index === state.currentPlayerIndex
        ? {
            ...player,
            notices:
              resolved.status === 'game_over'
                ? player.notices
                : [
                    ...player.notices,
                    `Your Águila took one Awawa from P${targetPlayer.id}.`,
                  ],
          }
        : player,
    ),
    selectedCardId: null,
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

export function throwSelectedCard(state: GameState): GameState {
  const selectedCard = getSelectedCard(state);

  if (!selectedCard || !canThrowSelectedCard(state)) {
    return state;
  }

  const players = state.players.map((player, index) =>
    index === state.currentPlayerIndex
      ? {
          ...player,
          hand: player.hand.filter((card) => card.id !== selectedCard.id),
          hasThrownCardThisTurn: true,
        }
      : player,
  );

  return {
    ...state,
    players,
    selectedCardId: null,
    pendingTargetAction: null,
    lastActionText: null,
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
        playedCardsThisTurn: player.playedCardsThisTurn + 1,
      };
  });

  const colonyCount = state.colonyCount - 1;
  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    colonyCount,
    selectedCardId: null,
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function beginSolcitoAction(state: GameState): GameState {
  const target = getNextSolcitoTarget(state);

  if (!target) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: {
      type: 'solcito',
      targetPlayerIndex: target.playerIndex,
      selectedSlotIndex: null,
    },
  };
}

function confirmSolcitoAction(state: GameState) {
  const selectedCard = getSelectedCard(state);
  const pendingAction = state.pendingTargetAction;

  if (
    !pendingAction ||
    !selectedCard ||
    selectedCard.type !== 'solcito' ||
    pendingAction.type !== 'solcito' ||
    pendingAction.selectedSlotIndex === null
  ) {
    return state;
  }

  const actorId = state.players[state.currentPlayerIndex].id;
  const target = pendingAction;
  const selectedSlotIndex = target.selectedSlotIndex;

  if (selectedSlotIndex === null) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        playedCardsThisTurn: player.playedCardsThisTurn + 1,
      };
    }

    if (index !== target.targetPlayerIndex) {
      return player;
    }

    const protections = [...player.protections];
    protections[selectedSlotIndex] = {
      id: `${selectedCard.id}-target-${player.id}`,
      type: 'solcito',
      sourcePlayerId: actorId,
      remainingTurnStarts: GAME_CONFIG.temporaryProtectionTurnStarts,
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
      : `Your Solcito landed on P${players[target.targetPlayerIndex].id}.`;

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
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function beginOlorosoAction(state: GameState): GameState {
  const target = getOlorosoTarget(state);

  if (!target) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: {
      type: 'oloroso',
      targetPlayerIndex: target.playerIndex,
      selectedSlotIndex: null,
    },
  };
}

function confirmOlorosoAction(state: GameState) {
  const selectedCard = getSelectedCard(state);
  const pendingAction = state.pendingTargetAction;

  if (
    !pendingAction ||
    !selectedCard ||
    selectedCard.type !== 'oloroso' ||
    pendingAction.type !== 'oloroso' ||
    pendingAction.selectedSlotIndex === null
  ) {
    return state;
  }

  const actorId = state.players[state.currentPlayerIndex].id;
  const target = pendingAction;
  const selectedSlotIndex = target.selectedSlotIndex;

  if (selectedSlotIndex === null) {
    return state;
  }

  if (!getOlorosoValidSlotIndexes(state.players[target.targetPlayerIndex]).includes(selectedSlotIndex)) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        playedCardsThisTurn: player.playedCardsThisTurn + 1,
        notices: [
          ...player.notices,
          `Your Oloroso covered one Awawa on P${state.players[target.targetPlayerIndex].id}.`,
        ],
      };
    }

    if (index !== target.targetPlayerIndex) {
      return player;
    }

    const protections = [...player.protections];
    protections[selectedSlotIndex] = withTemporaryDuration({
      id: `${selectedCard.id}-target-${player.id}`,
      type: 'oloroso',
      sourcePlayerId: actorId,
    });

    if (selectedSlotIndex > 0) {
      protections[selectedSlotIndex - 1] = null;
    }

    if (selectedSlotIndex < protections.length - 1) {
      protections[selectedSlotIndex + 1] = null;
    }

    return {
      ...syncEscapingMarkers({
        ...player,
        protections,
        notices: [
          ...player.notices,
          `P${actorId}'s Oloroso covered one of your Awawas for 2 turns.`,
        ],
      }),
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    selectedCardId: null,
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function playElefante(state: GameState, selectedCard: Card): GameState {
  const players = state.players.map((player, index) => {
    if (index !== state.currentPlayerIndex) {
      return player;
    }

    const protections = player.protections.map((protection, slotIndex) =>
      player.awawas[slotIndex]
      && !isProtectionPlacementBlocked(player, slotIndex)
        ? withTemporaryDuration({
            id: `${selectedCard.id}-slot-${slotIndex + 1}`,
            type: 'elefante' as const,
          })
        : protection,
    );

    return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
      protections,
      playedCardsThisTurn: player.playedCardsThisTurn + 1,
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    selectedCardId: null,
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function beginGritarAction(state: GameState): GameState {
  const target = getGritarTarget(state);

  if (!target) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: {
      type: 'gritar',
      targetPlayerIndex: target.playerIndex,
      selectedSlotIndex: null,
    },
  };
}

function confirmGritarAction(state: GameState) {
  const selectedCard = getSelectedCard(state);
  const pendingAction = state.pendingTargetAction;

  if (
    !pendingAction ||
    !selectedCard ||
    selectedCard.type !== 'gritar' ||
    pendingAction.type !== 'gritar' ||
    pendingAction.selectedSlotIndex === null
  ) {
    return state;
  }

  const actorId = state.players[state.currentPlayerIndex].id;
  const target = pendingAction;
  const selectedSlotIndex = target.selectedSlotIndex;

  if (selectedSlotIndex === null) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        playedCardsThisTurn: player.playedCardsThisTurn + 1,
        notices: [...player.notices, `Your Gritar removed one protection from P${state.players[target.targetPlayerIndex].id}.`],
      };
    }

    if (index !== target.targetPlayerIndex) {
      return player;
    }

    const protections = [...player.protections];
    protections[selectedSlotIndex] = null;

    return {
      ...player,
      protections,
      notices: [...player.notices, `P${actorId}'s Gritar removed one of your protections.`],
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    selectedCardId: null,
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
  };
}

function beginReyAction(state: GameState): GameState {
  const targetIndex = getReyTargetIndex(state);

  if (targetIndex === null) {
    return state;
  }

  return {
    ...state,
    pendingTargetAction: {
      type: 'rey',
      targetPlayerIndex: targetIndex,
      selectedSlotIndex: null,
    },
  };
}

function confirmReyAction(state: GameState) {
  const selectedCard = getSelectedCard(state);
  const pendingAction = state.pendingTargetAction;

  if (
    !pendingAction ||
    !selectedCard ||
    selectedCard.type !== 'rey' ||
    pendingAction.type !== 'rey' ||
    pendingAction.selectedSlotIndex === null
  ) {
    return state;
  }

  const actorId = state.players[state.currentPlayerIndex].id;
  const currentPlayer = getCurrentPlayer(state);
  const missingSlotIndex = getMissingAwawaSlotIndex(currentPlayer);

  if (missingSlotIndex === -1) {
    return state;
  }

  const targetIndex = pendingAction.targetPlayerIndex;
  const stolenSlotIndex = pendingAction.selectedSlotIndex;

  if (!getReyValidSlotIndexes(state.players[targetIndex]).includes(stolenSlotIndex)) {
    return state;
  }

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      const awawas = [...player.awawas];
      awawas[missingSlotIndex] = true;

      return {
        ...player,
        hand: player.hand.filter((card) => card.id !== selectedCard.id),
        awawas,
        playedCardsThisTurn: player.playedCardsThisTurn + 1,
        notices: [...player.notices, `Your Rey stole one Awawa from P${state.players[targetIndex].id}.`],
      };
    }

    if (index !== targetIndex) {
      return player;
    }

    const awawas = [...player.awawas];
    const protections = [...player.protections];
    awawas[stolenSlotIndex] = false;
    protections[stolenSlotIndex] = null;

    return {
      ...player,
      awawas,
      protections,
      notices: [...player.notices, `P${actorId}'s Rey stole one of your Awawas.`],
    };
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    selectedCardId: null,
    pendingTargetAction: null,
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
    return beginAguilaAction(state);
  }

  if (selectedCard.type === 'bebe') {
    return playBebe(state, selectedCard);
  }

  if (selectedCard.type === 'solcito') {
    return beginSolcitoAction(state);
  }

  if (selectedCard.type === 'elefante') {
    return playElefante(state, selectedCard);
  }

  if (selectedCard.type === 'oloroso') {
    return beginOlorosoAction(state);
  }

  if (selectedCard.type === 'gritar') {
    return beginGritarAction(state);
  }

  if (selectedCard.type === 'rey') {
    return beginReyAction(state);
  }

  return state;
}

export function confirmTargetAction(state: GameState): GameState {
  const pendingAction = state.pendingTargetAction;

  if (!pendingAction) {
    return state;
  }

  if (pendingAction.type === 'aguila') {
    return resolveAguilaAction(state);
  }

  if (pendingAction.type === 'solcito') {
    return confirmSolcitoAction(state);
  }

  if (pendingAction.type === 'oloroso') {
    return confirmOlorosoAction(state);
  }

  if (pendingAction.type === 'gritar') {
    return confirmGritarAction(state);
  }

  if (pendingAction.type === 'rey') {
    return confirmReyAction(state);
  }

  return state;
}

export const getPendingAguilaTarget = getPendingTarget;
export const selectAguilaTargetSlot = selectTargetSlot;
export const cancelAguilaAction = cancelTargetAction;
export function confirmAguilaAction(state: GameState): GameState {
  return confirmTargetAction(state);
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
    isProtectionPlacementBlocked(currentPlayer, slotIndex) ||
    currentPlayer.protections[slotIndex] ||
    (card.type === 'awawa' && !getAwawaCaptureTarget(state)) ||
    (card.type === 'toilet' &&
      hasToiletOwnedByOtherPlayer(state.players, state.currentPlayerIndex))
  ) {
    return state;
  }

  const awawaCaptureTarget =
    card.type === 'awawa' ? getAwawaCaptureTarget(state) : null;

  const players = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      const protections = [...player.protections];
      protections[slotIndex] =
        card.type === 'awawa' && awawaCaptureTarget
          ? {
              id: `${card.id}-captured-p${state.players[awawaCaptureTarget.playerIndex].id}`,
              type: 'awawa',
              sourcePlayerId: state.players[awawaCaptureTarget.playerIndex].id,
            }
          : isTemporaryProtection(card)
            ? withTemporaryDuration(card)
            : card;

      return {
        ...player,
        hand: player.hand.filter((handCard) => handCard.id !== cardId),
        protections,
      };
    }

    if (
      card.type === 'awawa' &&
      awawaCaptureTarget &&
      index === awawaCaptureTarget.playerIndex
    ) {
      const awawas = [...player.awawas];
      const protections = [...player.protections];
      awawas[awawaCaptureTarget.slotIndex] = false;
      protections[awawaCaptureTarget.slotIndex] = null;

      return {
        ...player,
        awawas,
        protections,
      };
    }

    return player;
  });

  const resolved = getResolvedGameStatus(state.drawPile, players);

  return {
    ...state,
    players,
    selectedCardId:
      state.selectedCardId === cardId ? null : state.selectedCardId,
    pendingTargetAction: null,
    lastActionText: null,
    resultText: resolved.resultText,
    status: resolved.status,
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
      const nextPlayer =
        index === nextPlayerIndex ? clearTemporaryProtections(player) : player;

      return {
        ...nextPlayer,
        notices: index === state.currentPlayerIndex ? [] : nextPlayer.notices,
        hasDrawnThisTurn: false,
        playedCardsThisTurn: 0,
        hasThrownCardThisTurn: false,
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
    pendingTargetAction: null,
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
