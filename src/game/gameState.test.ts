import { GAME_CONFIG } from '../constants/game';
import { buildConfiguredDeck } from './cards';
import {
  canDrawCard,
  canPlaySelectedCard,
  canThrowSelectedCard,
  cancelAguilaAction,
  cancelTargetAction,
  confirmAguilaAction,
  confirmTargetAction,
  createGameState,
  dismissCurrentNotification,
  drawCard,
  finishTurn,
  getCurrentPlayer,
  getPendingAguilaTarget,
  getPendingTarget,
  placeCardInProtection,
  playSelectedCard,
  selectAguilaTargetSlot,
  selectTargetSlot,
  selectCard,
  throwSelectedCard,
} from './gameState';

describe('gameState', () => {
  it('builds a deck with 10 aguila cards and 4 copies of every other card type, including oloroso', () => {
    const deck = buildConfiguredDeck();
    const counts = deck.reduce<Record<string, number>>((result, card) => {
      result[card.type] = (result[card.type] ?? 0) + 1;
      return result;
    }, {});

    expect(deck).toHaveLength(GAME_CONFIG.initialDeckSize);
    expect(counts.aguila).toBe(GAME_CONFIG.copiesPerCardType + GAME_CONFIG.extraAguilaCopies);
    expect(counts.roca).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.cueva).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.planta).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.arbusto).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.bebe).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.solcito).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.elefante).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.correr).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.awawa).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.toilet).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.oloroso).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.gritar).toBe(GAME_CONFIG.copiesPerCardType);
    expect(counts.rey).toBe(GAME_CONFIG.copiesPerCardType);
  });

  it('deals three starting cards to each player and discounts them from the deck', () => {
    const state = createGameState(2);

    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(GAME_CONFIG.initialHandSize);
    expect(state.players[1].hand).toHaveLength(GAME_CONFIG.initialHandSize);
    expect(state.drawPile).toHaveLength(
      GAME_CONFIG.initialDeckSize - GAME_CONFIG.initialHandSize * 2,
    );
    expect(state.colonyCount).toBe(GAME_CONFIG.initialColonySize);
  });

  it('does not allow drawing when the current player already has three cards', () => {
    const state = createGameState(2);
    const nextState = drawCard(state);

    expect(nextState).toBe(state);
    expect(getCurrentPlayer(nextState).hand).toHaveLength(
      GAME_CONFIG.maxHandSize,
    );
  });

  it('allows only one draw per turn when a player has room in hand', () => {
    const state = createGameState(1);
    state.players[0].hand = state.players[0].hand.slice(0, 2);

    const afterFirstDraw = drawCard(state);
    const afterSecondDraw = drawCard(afterFirstDraw);

    expect(getCurrentPlayer(afterFirstDraw).hand).toHaveLength(3);
    expect(getCurrentPlayer(afterFirstDraw).hasDrawnThisTurn).toBe(true);
    expect(afterSecondDraw).toBe(afterFirstDraw);
  });

  it('allows throwing one selected card per turn and clears the selection', () => {
    const state = createGameState(1);
    state.players[0].hand = [
      { id: 'roca-x', type: 'roca' },
      { id: 'cueva-x', type: 'cueva' },
    ];

    const selectedState = selectCard(state, 'roca-x');
    const afterThrow = throwSelectedCard(selectedState);
    const afterSelectingAgain = selectCard(afterThrow, 'cueva-x');
    const secondThrowAttempt = throwSelectedCard(afterSelectingAgain);

    expect(canThrowSelectedCard(selectedState)).toBe(true);
    expect(afterThrow.players[0].hand).toEqual([{ id: 'cueva-x', type: 'cueva' }]);
    expect(afterThrow.selectedCardId).toBeNull();
    expect(afterThrow.players[0].hasThrownCardThisTurn).toBe(true);
    expect(canThrowSelectedCard(afterSelectingAgain)).toBe(false);
    expect(secondThrowAttempt).toBe(afterSelectingAgain);
  });

  it('does not allow throwing without a selected card or when the hand is empty', () => {
    const state = createGameState(1);
    state.players[0].hand = [];

    expect(canThrowSelectedCard(state)).toBe(false);
    expect(throwSelectedCard(state)).toBe(state);
  });

  it('keeps the game alive when the last card is drawn and ends it on the next draw attempt', () => {
    const state = createGameState(2);
    state.players[0].hand = state.players[0].hand.slice(0, 2);
    state.players[1].hand = state.players[1].hand.slice(0, 2);
    state.drawPile = state.drawPile.slice(0, 1);

    const afterLastCardDraw = drawCard(state);
    expect(afterLastCardDraw.drawPile).toHaveLength(0);
    expect(afterLastCardDraw.status).toBe('playing');

    const nextTurn = finishTurn(afterLastCardDraw);
    const afterEmptyDrawAttempt = drawCard(nextTurn);

    expect(afterEmptyDrawAttempt.status).toBe('game_over');
    expect(afterEmptyDrawAttempt.resultText).toContain('Game over.');
  });

  it('rotates the turn to the next active player', () => {
    const state = createGameState(3);
    state.players[1].awawas = [false, false, false, false, false];

    const nextState = finishTurn(state);

    expect(getCurrentPlayer(nextState).id).toBe(3);
  });

  it('places non-playable cards into protection slots and preserves them across turns', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'roca-x', type: 'roca' }];
    const protectionCard = state.players[0].hand[0];

    expect(protectionCard).toBeDefined();

    const afterPlacement = placeCardInProtection(state, protectionCard!.id, 0);
    const afterTurnOne = finishTurn(afterPlacement);
    const afterTurnTwo = finishTurn(afterTurnOne);

    expect(afterPlacement.players[0].protections[0]?.id).toBe(
      protectionCard!.id,
    );
    expect(afterTurnTwo.players[0].protections[0]?.id).toBe(protectionCard!.id);
  });

  it('captures the next right-side unprotected awawa when awawa is placed', () => {
    const state = createGameState(3);
    state.players[0].hand = [{ id: 'awawa-p1', type: 'awawa' }];
    state.players[1].protections = [
      { id: 'roca-p2-0', type: 'roca' },
      { id: 'planta-p2-1', type: 'planta' },
      { id: 'cueva-p2-2', type: 'cueva' },
      { id: 'solcito-p2-3', type: 'solcito', sourcePlayerId: 3 },
      null,
    ];

    const afterPlacement = placeCardInProtection(state, 'awawa-p1', 0);

    expect(afterPlacement.players[0].protections[0]?.type).toBe('awawa');
    expect(afterPlacement.players[0].protections[0]?.sourcePlayerId).toBe(2);
    expect(afterPlacement.players[1].awawas[4]).toBe(false);
    expect(afterPlacement.players[2].awawas.filter(Boolean)).toHaveLength(5);
  });

  it('skips fully protected players and captures from the next right player with an unprotected awawa', () => {
    const state = createGameState(4);
    state.players[0].hand = [{ id: 'awawa-p1', type: 'awawa' }];
    state.players[1].protections = state.players[1].protections.map((_, index) => ({
      id: `filled-p2-${index}`,
      type: 'roca',
    }));
    state.players[2].protections[0] = { id: 'roca-p3', type: 'roca' };

    const afterPlacement = placeCardInProtection(state, 'awawa-p1', 0);

    expect(afterPlacement.players[0].protections[0]?.type).toBe('awawa');
    expect(afterPlacement.players[0].protections[0]?.sourcePlayerId).toBe(3);
    expect(afterPlacement.players[1].awawas.filter(Boolean)).toHaveLength(5);
    expect(afterPlacement.players[2].awawas.filter(Boolean)).toHaveLength(4);
  });

  it('does not allow awawa to be placed if no right-side player has an unprotected awawa', () => {
    const state = createGameState(3);
    state.players[0].hand = [{ id: 'awawa-p1', type: 'awawa' }];
    state.players[1].protections = state.players[1].protections.map((_, index) => ({
      id: `filled-p2-${index}`,
      type: 'roca',
    }));
    state.players[2].protections = state.players[2].protections.map((_, index) => ({
      id: `filled-p3-${index}`,
      type: 'cueva',
    }));

    expect(placeCardInProtection(state, 'awawa-p1', 0)).toBe(state);
  });

  it('does not allow playable cards to be placed in protection slots', () => {
    const aguilaState = createGameState(1);
    aguilaState.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const bebeState = createGameState(1);
    bebeState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];

    const solcitoState = createGameState(1);
    solcitoState.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];

    const elefanteState = createGameState(1);
    elefanteState.players[0].hand = [{ id: 'elefante-x', type: 'elefante' }];

    const olorosoState = createGameState(1);
    olorosoState.players[0].hand = [{ id: 'oloroso-x', type: 'oloroso' }];

    const gritarState = createGameState(1);
    gritarState.players[0].hand = [{ id: 'gritar-x', type: 'gritar' }];

    const reyState = createGameState(1);
    reyState.players[0].hand = [{ id: 'rey-x', type: 'rey' }];

    expect(placeCardInProtection(aguilaState, 'aguila-x', 0)).toBe(aguilaState);
    expect(placeCardInProtection(bebeState, 'bebe-x', 0)).toBe(bebeState);
    expect(placeCardInProtection(solcitoState, 'solcito-x', 0)).toBe(solcitoState);
    expect(placeCardInProtection(elefanteState, 'elefante-x', 0)).toBe(elefanteState);
    expect(placeCardInProtection(olorosoState, 'oloroso-x', 0)).toBe(olorosoState);
    expect(placeCardInProtection(gritarState, 'gritar-x', 0)).toBe(gritarState);
    expect(placeCardInProtection(reyState, 'rey-x', 0)).toBe(reyState);
  });

  it('does not allow aguila to be played in the first round', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    expect(canPlaySelectedCard(selectCard(state, 'aguila-x'))).toBe(false);
  });

  it('allows aguila to be played starting in the second round', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const secondRoundState = finishTurn(finishTurn(state));
    expect(canPlaySelectedCard(selectCard(secondRoundState, 'aguila-x'))).toBe(
      true,
    );
  });

  it('enables bebe only when the player has a missing awawa and the colonia has stock', () => {
    const noMissingState = createGameState(1);
    noMissingState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];

    const withMissingState = createGameState(1);
    withMissingState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    withMissingState.players[0].awawas = [true, false, true, true, true];

    const emptyColonyState = createGameState(1);
    emptyColonyState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    emptyColonyState.players[0].awawas = [true, false, true, true, true];
    emptyColonyState.colonyCount = 0;

    expect(canPlaySelectedCard(selectCard(noMissingState, 'bebe-x'))).toBe(false);
    expect(canPlaySelectedCard(selectCard(withMissingState, 'bebe-x'))).toBe(true);
    expect(canPlaySelectedCard(selectCard(emptyColonyState, 'bebe-x'))).toBe(
      false,
    );
  });

  it('playing bebe restores one missing awawa and reduces colonia by one', () => {
    const state = createGameState(1);
    state.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    state.players[0].awawas = [true, false, true, false, true];
    state.colonyCount = 3;

    const afterPlay = playSelectedCard(selectCard(state, 'bebe-x'));

    expect(afterPlay.players[0].awawas).toEqual([true, true, true, false, true]);
    expect(afterPlay.colonyCount).toBe(2);
  });

  it('allows up to two playable cards per turn and blocks the third', () => {
    const state = createGameState(1);
    state.turnsCompleted = 2;
    state.players[0].hand = [
      { id: 'aguila-x', type: 'aguila' },
      { id: 'bebe-x', type: 'bebe' },
      { id: 'elefante-x', type: 'elefante' },
    ];
    state.players[0].awawas = [true, false, true, true, true];

    const afterAguilaStart = playSelectedCard(selectCard(state, 'aguila-x'));
    const afterCancel = cancelAguilaAction(afterAguilaStart);
    const afterFirstPlay = playSelectedCard(selectCard(afterCancel, 'bebe-x'));
    const afterSelectElefante = selectCard(afterFirstPlay, 'elefante-x');

    expect(afterAguilaStart.pendingTargetAction).toBeNull();
    expect(afterFirstPlay.players[0].playedCardsThisTurn).toBe(1);
    expect(canPlaySelectedCard(afterSelectElefante)).toBe(true);

    const afterSecondPlay = playSelectedCard(afterSelectElefante);
    const afterSelectAguilaAgain = selectCard(afterSecondPlay, 'aguila-x');

    expect(afterSecondPlay.players[0].playedCardsThisTurn).toBe(2);
    expect(canPlaySelectedCard(afterSelectAguilaAgain)).toBe(false);
  });

  it('solcito can be played only if a later player has an empty protection slot', () => {
    const enabledBaseState = createGameState(3);
    enabledBaseState.turnsCompleted = 2;
    enabledBaseState.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];

    const disabledBaseState = createGameState(3);
    disabledBaseState.turnsCompleted = 2;
    disabledBaseState.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];
    disabledBaseState.players[1].protections = disabledBaseState.players[1].protections.map(() => ({
      id: 'fill-p2',
      type: 'roca',
    }));
    disabledBaseState.players[2].protections = disabledBaseState.players[2].protections.map(() => ({
      id: 'fill-p3',
      type: 'roca',
    }));

    expect(canPlaySelectedCard(selectCard(enabledBaseState, 'solcito-x'))).toBe(
      true,
    );
    expect(canPlaySelectedCard(selectCard(disabledBaseState, 'solcito-x'))).toBe(
      false,
    );
  });

  it('solcito targets the next eligible player and occupies their empty protection slot', () => {
    const state = createGameState(3);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];
    state.players[1].protections = state.players[1].protections.map(() => ({
      id: 'fill-p2',
      type: 'roca',
    }));

    const pendingState = playSelectedCard(selectCard(state, 'solcito-x'));
    const pendingTarget = getPendingTarget(pendingState);
    const afterPlay = confirmTargetAction(
      selectTargetSlot(pendingState, 0),
    );

    expect(pendingTarget?.type).toBe('solcito');
    expect(afterPlay.players[2].protections[0]?.type).toBe('solcito');
    expect(afterPlay.players[2].protections[0]?.sourcePlayerId).toBe(1);
    expect(afterPlay.players[2].notices.join(' ')).toContain(
      "P1's Solcito landed on your Awawa board.",
    );
  });

  it('solcito lasts for two starts of the targeted player turn and then disappears', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];

    const afterPlay = confirmTargetAction(
      selectTargetSlot(playSelectedCard(selectCard(state, 'solcito-x')), 0),
    );
    const playerTwoFirstTurn = finishTurn(afterPlay);
    const playerOneTurnAgain = finishTurn(playerTwoFirstTurn);
    const playerTwoSecondTurn = finishTurn(playerOneTurnAgain);

    expect(afterPlay.players[1].protections[0]?.type).toBe('solcito');
    expect(playerTwoFirstTurn.players[1].protections[0]?.type).toBe('solcito');
    expect(playerTwoSecondTurn.players[1].protections[0]).toBeNull();
  });

  it('oloroso can be played only if a later player has an available empty protection slot', () => {
    const enabledState = createGameState(3);
    enabledState.turnsCompleted = 2;
    enabledState.players[0].hand = [{ id: 'oloroso-x', type: 'oloroso' }];

    const disabledState = createGameState(3);
    disabledState.turnsCompleted = 2;
    disabledState.players[0].hand = [{ id: 'oloroso-x', type: 'oloroso' }];
    disabledState.players[1].protections = disabledState.players[1].protections.map(() => ({
      id: 'fill-p2',
      type: 'roca',
    }));
    disabledState.players[2].protections = disabledState.players[2].protections.map(() => ({
      id: 'fill-p3',
      type: 'cueva',
    }));

    expect(canPlaySelectedCard(selectCard(enabledState, 'oloroso-x'))).toBe(true);
    expect(canPlaySelectedCard(selectCard(disabledState, 'oloroso-x'))).toBe(false);
  });

  it('oloroso targets the next eligible player, removes adjacent protections, and blocks adjacent slots for two turns', () => {
    const state = createGameState(3);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'oloroso-x', type: 'oloroso' }];
    state.players[1].protections = state.players[1].protections.map(() => ({
      id: 'fill-p2',
      type: 'roca',
    }));
    state.players[2].protections[1] = { id: 'roca-p3-left', type: 'roca' };
    state.players[2].protections[3] = { id: 'planta-p3-right', type: 'planta' };

    const pendingState = playSelectedCard(selectCard(state, 'oloroso-x'));
    const pendingTarget = getPendingTarget(pendingState);
    const afterPlay = confirmTargetAction(selectTargetSlot(pendingState, 2));
    const playerOneAfterTurn = finishTurn(afterPlay);
    const playerThreeTurn = finishTurn(playerOneAfterTurn);

    playerThreeTurn.players[2].hand = [{ id: 'roca-p3', type: 'roca' }];
    const blockedPlacement = placeCardInProtection(playerThreeTurn, 'roca-p3', 1);

    expect(pendingTarget?.type).toBe('oloroso');
    expect(pendingTarget?.playerId).toBe(3);
    expect(pendingTarget?.validSlotIndexes).toEqual([0, 2, 4]);
    expect(afterPlay.players[2].protections[2]?.type).toBe('oloroso');
    expect(afterPlay.players[2].protections[1]?.type).toBe('escaping');
    expect(afterPlay.players[2].protections[3]?.type).toBe('escaping');
    expect(blockedPlacement.players[2].protections[1]?.type).toBe('escaping');
  });

  it('oloroso disappears after two starts of the target player turn and then adjacent slots can receive protections again', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'oloroso-x', type: 'oloroso' }];

    const afterPlay = confirmTargetAction(
      selectTargetSlot(playSelectedCard(selectCard(state, 'oloroso-x')), 2),
    );
    const playerTwoFirstTurn = finishTurn(afterPlay);
    const playerOneTurnAgain = finishTurn(playerTwoFirstTurn);
    const playerTwoSecondTurn = finishTurn(playerOneTurnAgain);

    playerTwoSecondTurn.players[1].hand = [{ id: 'roca-p2', type: 'roca' }];
    const afterPlacement = placeCardInProtection(playerTwoSecondTurn, 'roca-p2', 1);

    expect(playerTwoFirstTurn.players[1].protections[2]?.type).toBe('oloroso');
    expect(playerTwoSecondTurn.players[1].protections[2]).toBeNull();
    expect(afterPlacement.players[1].protections[1]?.type).toBe('roca');
  });

  it('oloroso marks escaping on the nearest alive awawa on each side when there is a gap', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'oloroso-x', type: 'oloroso' }];
    state.players[1].awawas = [true, true, false, true, true];

    const afterPlay = confirmTargetAction(
      selectTargetSlot(playSelectedCard(selectCard(state, 'oloroso-x')), 3),
    );

    expect(afterPlay.players[1].protections[3]?.type).toBe('oloroso');
    expect(afterPlay.players[1].protections[4]?.type).toBe('escaping');
    expect(afterPlay.players[1].protections[1]?.type).toBe('escaping');
    expect(afterPlay.players[1].protections[2]).toBeNull();
  });

  it('aguila prioritizes escaping before ordinary unprotected awawas', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };
    state.players[1].protections[2] = {
      id: 'oloroso-p2',
      type: 'oloroso',
      sourcePlayerId: 1,
      remainingTurnStarts: 2,
    };
    state.players[1].protections[1] = { id: 'escaping-p2-2-1', type: 'escaping' };
    state.players[1].protections[3] = { id: 'escaping-p2-2-3', type: 'escaping' };

    const pendingState = playSelectedCard(selectCard(state, 'aguila-x'));
    const pendingTarget = getPendingAguilaTarget(pendingState);

    expect(pendingTarget?.validSlotIndexes).toEqual([1, 3]);
  });

  it('elefante replaces every alive protection slot and removes existing protections and solcitos', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'elefante-x', type: 'elefante' }];
    state.players[0].protections = [
      { id: 'roca-p1', type: 'roca' },
      { id: 'solcito-p1', type: 'solcito', sourcePlayerId: 2 },
      null,
      { id: 'arbusto-p1', type: 'arbusto' },
      null,
    ];

    const afterPlay = playSelectedCard(selectCard(state, 'elefante-x'));

    expect(afterPlay.players[0].protections.every((card) => card?.type === 'elefante')).toBe(true);
    expect(afterPlay.players[0].playedCardsThisTurn).toBe(1);
  });

  it('correr lasts for two starts of that player turn and then disappears', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'correr-x', type: 'correr' }];

    const afterPlacement = placeCardInProtection(state, 'correr-x', 0);
    const playerTwoTurn = finishTurn(afterPlacement);
    const playerOneFirstReturn = finishTurn(playerTwoTurn);
    const playerTwoTurnAgain = finishTurn(playerOneFirstReturn);
    const playerOneSecondReturn = finishTurn(playerTwoTurnAgain);

    expect(afterPlacement.players[0].protections[0]?.type).toBe('correr');
    expect(playerOneFirstReturn.players[0].protections[0]?.type).toBe('correr');
    expect(playerOneSecondReturn.players[0].protections[0]).toBeNull();
  });

  it('gritar can be played only if a left-side player has a removable protection', () => {
    const enabledState = createGameState(3);
    enabledState.turnsCompleted = 2;
    enabledState.players[0].hand = [{ id: 'gritar-x', type: 'gritar' }];
    enabledState.players[2].protections[0] = { id: 'roca-p3', type: 'roca' };

    const disabledState = createGameState(3);
    disabledState.turnsCompleted = 2;
    disabledState.players[0].hand = [{ id: 'gritar-x', type: 'gritar' }];
    disabledState.players[2].protections[0] = {
      id: 'solcito-p3',
      type: 'solcito',
      sourcePlayerId: 2,
    };
    disabledState.players[2].protections[1] = { id: 'elefante-p3', type: 'elefante' };

    expect(canPlaySelectedCard(selectCard(enabledState, 'gritar-x'))).toBe(true);
    expect(canPlaySelectedCard(selectCard(disabledState, 'gritar-x'))).toBe(
      false,
    );
  });

  it('gritar removes the closest left removable protection and skips protected-only players', () => {
    const state = createGameState(4);
    state.turnsCompleted = 4;
    state.players[0].hand = [{ id: 'gritar-x', type: 'gritar' }];
    state.players[3].protections[0] = {
      id: 'solcito-p4',
      type: 'solcito',
      sourcePlayerId: 2,
    };
    state.players[2].protections[1] = { id: 'roca-p3', type: 'roca' };

    const pendingState = playSelectedCard(selectCard(state, 'gritar-x'));
    const pendingTarget = getPendingTarget(pendingState);
    const afterPlay = confirmTargetAction(
      selectTargetSlot(pendingState, 1),
    );

    expect(pendingTarget?.type).toBe('gritar');
    expect(afterPlay.players[3].protections[0]?.type).toBe('solcito');
    expect(afterPlay.players[2].protections[1]).toBeNull();
    expect(afterPlay.players[0].notices.join(' ')).toContain(
      'Your Gritar removed one protection from P3.',
    );
  });

  it('rey can be played only if the player is missing an awawa and another player still has awawas to steal', () => {
    const enabledState = createGameState(3);
    enabledState.turnsCompleted = 2;
    enabledState.players[0].hand = [{ id: 'rey-x', type: 'rey' }];
    enabledState.players[0].awawas = [true, true, true, false, true];
    enabledState.players[1].protections = enabledState.players[1].protections.map(() => ({
      id: 'filled-p2',
      type: 'roca',
    }));

    const disabledState = createGameState(3);
    disabledState.turnsCompleted = 2;
    disabledState.players[0].hand = [{ id: 'rey-x', type: 'rey' }];
    disabledState.players[0].awawas = [true, true, true, false, true];
    disabledState.players[1].awawas = [false, false, false, false, false];
    disabledState.players[2].awawas = [false, false, false, false, false];

    expect(canPlaySelectedCard(selectCard(enabledState, 'rey-x'))).toBe(true);
    expect(canPlaySelectedCard(selectCard(disabledState, 'rey-x'))).toBe(false);
  });

  it('rey steals one awawa from the highest-count player closest to the right even if that awawa is protected', () => {
    const state = createGameState(4);
    state.turnsCompleted = 4;
    state.players[0].hand = [{ id: 'rey-x', type: 'rey' }];
    state.players[0].awawas = [true, false, true, true, true];
    state.players[1].awawas = [true, true, true, false, false];
    state.players[1].protections = [
      { id: 'roca-p2', type: 'roca' },
      { id: 'awawa-p2', type: 'awawa', sourcePlayerId: 3 },
      { id: 'awawa-p2b', type: 'awawa', sourcePlayerId: 4 },
      null,
      null,
    ];
    state.players[2].awawas = [true, false, false, false, false];
    state.players[2].protections[0] = { id: 'roca-p3', type: 'roca' };
    state.players[3].awawas = [true, true, true, true, false];
    state.players[3].protections = [
      { id: 'awawa-p4', type: 'awawa', sourcePlayerId: 2 },
      { id: 'planta-p4', type: 'planta' },
      { id: 'roca-p4', type: 'roca' },
      null,
      null,
    ];

    const pendingState = playSelectedCard(selectCard(state, 'rey-x'));
    const pendingTarget = getPendingTarget(pendingState);
    const afterPlay = confirmTargetAction(
      selectTargetSlot(pendingState, 0),
    );

    expect(pendingTarget?.type).toBe('rey');
    expect(pendingTarget?.playerId).toBe(4);
    expect(pendingTarget?.validSlotIndexes).toEqual([0, 1, 2, 3]);
    expect(afterPlay.players[0].awawas).toEqual([true, true, true, true, true]);
    expect(afterPlay.players[3].awawas.filter(Boolean)).toHaveLength(3);
    expect(afterPlay.players[3].protections[0]).toBeNull();
    expect(afterPlay.players[1].awawas.filter(Boolean)).toHaveLength(3);
    expect(afterPlay.players[0].notices.join(' ')).toContain('Your Rey stole one Awawa from P4.');
  });

  it('starts an aguila target selection and lets the player cancel it', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const pendingState = playSelectedCard(selectCard(state, 'aguila-x'));
    const canceledState = cancelAguilaAction(pendingState);

    expect(pendingState.pendingTargetAction).not.toBeNull();
    expect(canceledState.pendingTargetAction).toBeNull();
    expect(canceledState.selectedCardId).toBe('aguila-x');
  });

  it('aguila prioritizes killing the awawa marked by solcito and keeps other protections', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[2] = {
      id: 'solcito-p1',
      type: 'solcito',
      sourcePlayerId: 1,
    };
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };

    const pendingState = playSelectedCard(selectCard(state, 'aguila-x'));
    const afterConfirm = confirmAguilaAction(
      selectAguilaTargetSlot(pendingState, 2),
    );

    expect(afterConfirm.players[1].awawas[2]).toBe(false);
    expect(afterConfirm.players[1].protections[0]?.type).toBe('roca');
  });

  it('aguila prioritizes awawa before solcito and unprotected awawas, but only removes the awawa marker', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };
    state.players[1].protections[1] = {
      id: 'solcito-p2',
      type: 'solcito',
      sourcePlayerId: 1,
    };
    state.players[1].protections[3] = {
      id: 'awawa-p2',
      type: 'awawa',
      sourcePlayerId: 2,
    };

    const pendingState = playSelectedCard(selectCard(state, 'aguila-x'));
    const pendingTarget = getPendingAguilaTarget(pendingState);
    const afterConfirm = confirmAguilaAction(
      selectAguilaTargetSlot(pendingState, 3),
    );

    expect(pendingTarget?.validSlotIndexes).toEqual([3]);
    expect(afterConfirm.players[1].awawas[3]).toBe(true);
    expect(afterConfirm.players[1].protections[3]).toBeNull();
    expect(afterConfirm.players[1].protections[0]?.type).toBe('roca');
    expect(afterConfirm.players[1].awawas[1]).toBe(true);
  });

  it('eating an awawa protection does not remove the other player protections', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'planta-p2', type: 'planta' };
    state.players[1].protections[2] = {
      id: 'awawa-p2',
      type: 'awawa',
      sourcePlayerId: 2,
    };
    state.players[1].protections[4] = { id: 'roca-p2', type: 'roca' };

    const afterConfirm = confirmAguilaAction(
      selectAguilaTargetSlot(playSelectedCard(selectCard(state, 'aguila-x')), 2),
    );

    expect(afterConfirm.players[1].awawas[2]).toBe(true);
    expect(afterConfirm.players[1].protections[2]).toBeNull();
    expect(afterConfirm.players[1].protections[0]?.type).toBe('planta');
    expect(afterConfirm.players[1].protections[4]?.type).toBe('roca');
  });

  it('aguila cannot kill through elefante protection', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections = state.players[1].protections.map((_, index) => ({
      id: `elefante-p2-${index}`,
      type: 'elefante',
    }));

    const afterPlay = playSelectedCard(selectCard(state, 'aguila-x'));

    expect(afterPlay.pendingTargetAction).toBeNull();
    expect(afterPlay.players[1].awawas.filter(Boolean)).toHaveLength(5);
    expect(afterPlay.players[1].protections.every((card) => card?.type === 'elefante')).toBe(true);
    expect(afterPlay.players[0].notices).toHaveLength(0);
  });

  it('aguila skips a fully protected right player and attacks the next valid player on the right', () => {
    const state = createGameState(3);
    state.turnsCompleted = 3;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections = state.players[1].protections.map((_, index) => ({
      id: `elefante-p2-${index}`,
      type: 'elefante',
    }));
    state.players[2].protections[1] = { id: 'roca-p3', type: 'roca' };

    const pendingState = playSelectedCard(selectCard(state, 'aguila-x'));
    const pendingTarget = getPendingAguilaTarget(pendingState);
    const afterConfirm = confirmAguilaAction(
      selectAguilaTargetSlot(pendingState, 0),
    );

    expect(pendingTarget?.playerId).toBe(3);
    expect(afterConfirm.players[1].awawas.filter(Boolean)).toHaveLength(5);
    expect(afterConfirm.players[2].awawas.filter(Boolean)).toHaveLength(4);
    expect(afterConfirm.players[0].notices.join(' ')).toContain(
      'Your Águila took one Awawa from P3.',
    );
  });

  it('aguila kills only the right-side player and removes other protections after an unprotected kill', () => {
    const state = createGameState(4);
    state.turnsCompleted = 4;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections = [
      null,
      { id: 'cueva-p2', type: 'cueva' },
      { id: 'planta-p2', type: 'planta' },
      { id: 'arbusto-p2', type: 'arbusto' },
      { id: 'roca-p2', type: 'roca' },
    ];
    state.players[2].protections[0] = { id: 'roca-p3', type: 'roca' };
    state.players[2].protections[2] = { id: 'planta-p3', type: 'planta' };
    state.players[3].protections[0] = { id: 'roca-p4', type: 'roca' };

    const afterConfirm = confirmAguilaAction(
      selectAguilaTargetSlot(playSelectedCard(selectCard(state, 'aguila-x')), 0),
    );

    expect(afterConfirm.players[1].awawas.filter(Boolean)).toHaveLength(4);
    expect(afterConfirm.players[2].awawas.filter(Boolean)).toHaveLength(5);
    expect(afterConfirm.players[3].awawas.filter(Boolean)).toHaveLength(5);
    expect(afterConfirm.players[1].protections.every((card) => card === null)).toBe(true);
    expect(afterConfirm.players[2].protections[0]?.type).toBe('roca');
    expect(afterConfirm.players[0].notices.join(' ')).toContain(
      'Your Águila took one Awawa from P2.',
    );
  });

  it('eliminates a player with no awawas left and ends the game when one player remains', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].awawas = [true, false, false, false, false];

    const afterPlay = confirmAguilaAction(
      selectAguilaTargetSlot(playSelectedCard(selectCard(state, 'aguila-x')), 0),
    );

    expect(afterPlay.players[1].awawas.filter(Boolean)).toHaveLength(0);
    expect(afterPlay.status).toBe('game_over');
  });

  it('declares a draw at deck end when players have the same awawa count', () => {
    const state = createGameState(2);
    state.players[0].hand = state.players[0].hand.slice(0, 2);
    state.players[1].hand = state.players[1].hand.slice(0, 2);
    state.drawPile = [];
    state.players[0].awawas = [true, true, false, false, false];
    state.players[1].awawas = [true, true, false, false, false];

    const nextState = drawCard(state);

    expect(nextState.status).toBe('game_over');
    expect(nextState.resultText).toContain("It's a draw between P1, P2");
  });

  it('shows the aguila notice to the attacked player on their next turn', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };

    const afterPlay = confirmAguilaAction(
      selectAguilaTargetSlot(playSelectedCard(selectCard(state, 'aguila-x')), 1),
    );
    const afterFinishTurn = finishTurn(afterPlay);

    expect(getCurrentPlayer(afterFinishTurn).id).toBe(2);
    expect(getCurrentPlayer(afterFinishTurn).notices.join(' ')).toContain(
      "P1's \u00C1guila took one Awawa from you",
    );
  });

  it('accumulates aguila notices from multiple opponents until the player turn is finished', () => {
    const state = createGameState(3);
    state.turnsCompleted = 3;
    state.players[0].hand = [{ id: 'aguila-p1', type: 'aguila' }];
    state.players[1].hand = [{ id: 'aguila-p2', type: 'aguila' }];

    const afterPlayerOne = confirmAguilaAction(
      selectAguilaTargetSlot(playSelectedCard(selectCard(state, 'aguila-p1')), 0),
    );
    const playerTwoTurn = finishTurn(afterPlayerOne);

    expect(playerTwoTurn.players[1].notices).toHaveLength(1);

    const afterPlayerTwo = confirmAguilaAction(
      selectAguilaTargetSlot(playSelectedCard(selectCard(playerTwoTurn, 'aguila-p2')), 0),
    );

    expect(afterPlayerTwo.players[1].notices).toHaveLength(2);
    expect(afterPlayerTwo.players[1].notices[0]).toContain("P1's \u00C1guila");
    expect(afterPlayerTwo.players[1].notices[1]).toContain('Your \u00C1guila');

    const playerThreeTurn = finishTurn(afterPlayerTwo);

    expect(playerThreeTurn.players[1].notices).toHaveLength(0);
  });

  it('dismisses the current player notification permanently', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const attackedState = finishTurn(
      confirmAguilaAction(
        selectAguilaTargetSlot(playSelectedCard(selectCard(state, 'aguila-x')), 0),
      ),
    );
    const dismissedState = dismissCurrentNotification(attackedState);

    expect(attackedState.players[1].notices).toHaveLength(1);
    expect(dismissedState.players[1].notices).toHaveLength(0);
  });

  it('removes elefante protections after that player has started two more turns', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'elefante-x', type: 'elefante' }];

    const afterPlay = playSelectedCard(selectCard(state, 'elefante-x'));
    const playerTwoTurn = finishTurn(afterPlay);
    const playerOneFirstReturn = finishTurn(playerTwoTurn);
    const playerTwoTurnAgain = finishTurn(playerOneFirstReturn);
    const playerOneSecondReturn = finishTurn(playerTwoTurnAgain);

    expect(afterPlay.players[0].protections.every((card) => card?.type === 'elefante')).toBe(true);
    expect(playerOneFirstReturn.players[0].protections.every((card) => card?.type === 'elefante')).toBe(true);
    expect(playerOneSecondReturn.players[0].protections.every((card) => card === null)).toBe(true);
  });

  it('lets the same player place multiple toilet protections but blocks other players while any toilet is active', () => {
    const state = createGameState(2);
    state.players[0].hand = [
      { id: 'toilet-p1-a', type: 'toilet' },
      { id: 'toilet-p1-b', type: 'toilet' },
    ];

    const afterFirstToilet = placeCardInProtection(state, 'toilet-p1-a', 0);
    const afterSecondToilet = placeCardInProtection(afterFirstToilet, 'toilet-p1-b', 1);

    afterSecondToilet.players[1].hand = [{ id: 'toilet-p2-a', type: 'toilet' }];

    const blockedForPlayerTwo = placeCardInProtection(
      finishTurn(afterSecondToilet),
      'toilet-p2-a',
      0,
    );

    expect(afterSecondToilet.players[0].protections[0]?.type).toBe('toilet');
    expect(afterSecondToilet.players[0].protections[1]?.type).toBe('toilet');
    expect(blockedForPlayerTwo.players[1].protections[0]).toBeNull();
  });

  it('allows another player to place toilet after the original toilet expires two turns later', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'toilet-p1', type: 'toilet' }];
    state.players[1].hand = [{ id: 'toilet-p2', type: 'toilet' }];

    const afterPlayerOneToilet = placeCardInProtection(state, 'toilet-p1', 0);
    const playerTwoTurn = finishTurn(afterPlayerOneToilet);
    const playerOneFirstReturn = finishTurn(playerTwoTurn);
    const playerTwoTurnAgain = finishTurn(playerOneFirstReturn);
    const playerOneSecondReturn = finishTurn(playerTwoTurnAgain);
    const playerTwoAfterExpiry = finishTurn(playerOneSecondReturn);
    const playerTwoPlacement = placeCardInProtection(
      playerTwoAfterExpiry,
      'toilet-p2',
      0,
    );

    expect(playerOneFirstReturn.players[0].protections[0]?.type).toBe('toilet');
    expect(playerOneSecondReturn.players[0].protections[0]).toBeNull();
    expect(playerTwoPlacement.players[1].protections[0]?.type).toBe('toilet');
  });
});
