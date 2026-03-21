import { GAME_CONFIG } from '../constants/game';
import {
  canDrawCard,
  canPlaySelectedCard,
  createGameState,
  drawCard,
  finishTurn,
  getCurrentPlayer,
  placeCardInProtection,
  playSelectedCard,
  selectCard,
} from './gameState';

describe('gameState', () => {
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
    const protectionCard = state.players[0].hand.find(
      (card) =>
        card.type !== 'aguila' &&
        card.type !== 'bebe' &&
        card.type !== 'solcito',
    );

    expect(protectionCard).toBeDefined();

    const afterPlacement = placeCardInProtection(state, protectionCard!.id, 0);
    const afterTurnOne = finishTurn(afterPlacement);
    const afterTurnTwo = finishTurn(afterTurnOne);

    expect(afterPlacement.players[0].protections[0]?.id).toBe(
      protectionCard!.id,
    );
    expect(afterTurnTwo.players[0].protections[0]?.id).toBe(protectionCard!.id);
  });

  it('does not allow playable cards to be placed in protection slots', () => {
    const aguilaState = createGameState(1);
    aguilaState.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const bebeState = createGameState(1);
    bebeState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];

    const solcitoState = createGameState(1);
    solcitoState.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];

    expect(placeCardInProtection(aguilaState, 'aguila-x', 0)).toBe(aguilaState);
    expect(placeCardInProtection(bebeState, 'bebe-x', 0)).toBe(bebeState);
    expect(placeCardInProtection(solcitoState, 'solcito-x', 0)).toBe(solcitoState);
  });

  it('does not allow aguila to be played in the first round', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const afterSelectingAguila = selectCard(state, 'aguila-x');

    expect(canPlaySelectedCard(afterSelectingAguila)).toBe(false);
  });

  it('allows aguila to be played starting in the second round', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const secondRoundState = finishTurn(finishTurn(state));
    const afterSelectingAguila = selectCard(secondRoundState, 'aguila-x');

    expect(canPlaySelectedCard(afterSelectingAguila)).toBe(true);
  });

  it('enables bebe only when the player has a missing awawa and the colonia has stock', () => {
    const noMissingState = createGameState(1);
    noMissingState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    const noMissingAwawa = selectCard(noMissingState, 'bebe-x');

    const withMissingState = createGameState(1);
    withMissingState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    withMissingState.players[0].awawas = [true, false, true, true, true];
    const withMissingAwawa = selectCard(withMissingState, 'bebe-x');

    const emptyColonyState = createGameState(1);
    emptyColonyState.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    emptyColonyState.players[0].awawas = [true, false, true, true, true];
    emptyColonyState.colonyCount = 0;
    const withEmptyColony = selectCard(emptyColonyState, 'bebe-x');

    expect(canPlaySelectedCard(noMissingAwawa)).toBe(false);
    expect(canPlaySelectedCard(withMissingAwawa)).toBe(true);
    expect(canPlaySelectedCard(withEmptyColony)).toBe(false);
  });

  it('playing bebe restores one missing awawa and reduces colonia by one', () => {
    const state = createGameState(1);
    state.players[0].hand = [{ id: 'bebe-x', type: 'bebe' }];
    state.players[0].awawas = [true, false, true, false, true];
    state.colonyCount = 3;

    const afterPlay = playSelectedCard(selectCard(state, 'bebe-x'));

    expect(afterPlay.players[0].awawas).toEqual([true, true, true, false, true]);
    expect(afterPlay.colonyCount).toBe(2);
    expect(afterPlay.lastActionText).toBeNull();
  });

  it('allows only one played card per turn even if multiple playable cards are in hand', () => {
    const state = createGameState(1);
    state.turnsCompleted = 2;
    state.players[0].hand = [
      { id: 'aguila-x', type: 'aguila' },
      { id: 'bebe-x', type: 'bebe' },
    ];
    state.players[0].awawas = [true, false, true, true, true];

    const afterAguilaPlay = playSelectedCard(selectCard(state, 'aguila-x'));
    const afterSelectBebe = selectCard(afterAguilaPlay, 'bebe-x');

    expect(afterAguilaPlay.players[0].hasPlayedCardThisTurn).toBe(true);
    expect(canPlaySelectedCard(afterSelectBebe)).toBe(false);
  });

  it('solcito can be played only if a later player has an empty protection slot', () => {
    const enabledBaseState = createGameState(3);
    enabledBaseState.turnsCompleted = 2;
    enabledBaseState.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];
    const enabledState = selectCard(enabledBaseState, 'solcito-x');

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
    const disabledState = selectCard(disabledBaseState, 'solcito-x');

    expect(canPlaySelectedCard(enabledState)).toBe(true);
    expect(canPlaySelectedCard(disabledState)).toBe(false);
  });

  it('solcito targets the next eligible player and occupies their empty protection slot', () => {
    const state = createGameState(3);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'solcito-x', type: 'solcito' }];
    state.players[1].protections = state.players[1].protections.map(() => ({
      id: 'fill-p2',
      type: 'roca',
    }));

    const afterPlay = playSelectedCard(selectCard(state, 'solcito-x'));

    expect(afterPlay.players[2].protections[0]?.type).toBe('solcito');
    expect(afterPlay.players[2].protections[0]?.sourcePlayerId).toBe(1);
    expect(afterPlay.lastActionText).toContain('Your Solcito landed on Player 3.');
  });

  it('aguila prioritizes killing the awawa marked by solcito', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[2] = {
      id: 'solcito-p1',
      type: 'solcito',
      sourcePlayerId: 1,
    };

    const afterPlay = playSelectedCard(selectCard(state, 'aguila-x'));

    expect(afterPlay.players[1].awawas[2]).toBe(false);
  });

  it('aguila kills one unprotected awawa of each other player', () => {
    const state = createGameState(3);
    state.turnsCompleted = 3;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };
    state.players[1].protections[1] = { id: 'cueva-p2', type: 'cueva' };
    state.players[2].protections[0] = { id: 'roca-p3', type: 'roca' };
    state.players[2].protections[2] = { id: 'planta-p3', type: 'planta' };

    const afterPlay = playSelectedCard(selectCard(state, 'aguila-x'));

    expect(afterPlay.players[1].awawas.filter(Boolean)).toHaveLength(4);
    expect(afterPlay.players[2].awawas.filter(Boolean)).toHaveLength(4);
    expect(afterPlay.players[1].protections.every((card) => card === null)).toBe(true);
    expect(afterPlay.players[2].protections.every((card) => card === null)).toBe(true);
    expect(afterPlay.lastActionText).toContain(
      'Your \u00C1guila took one Awawa from Player 2.',
    );
  });

  it('eliminates a player with no awawas left and ends the game when one player remains', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].awawas = [true, false, false, false, false];

    const afterPlay = playSelectedCard(selectCard(state, 'aguila-x'));

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
    expect(nextState.resultText).toContain(
      "It's a draw between Player 1, Player 2",
    );
  });

  it('shows the aguila notice to the attacked player on their next turn', () => {
    const state = createGameState(2);
    state.turnsCompleted = 2;
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };

    const afterPlay = playSelectedCard(selectCard(state, 'aguila-x'));
    const afterFinishTurn = finishTurn(afterPlay);

    expect(getCurrentPlayer(afterFinishTurn).id).toBe(2);
    expect(getCurrentPlayer(afterFinishTurn).notices.join(' ')).toContain(
      "Player 1's \u00C1guila took one Awawa from you",
    );
  });

  it('accumulates aguila notices from multiple opponents until the player turn is finished', () => {
    const state = createGameState(3);
    state.turnsCompleted = 3;
    state.players[0].hand = [{ id: 'aguila-p1', type: 'aguila' }];
    state.players[1].hand = [{ id: 'aguila-p2', type: 'aguila' }];

    const afterPlayerOne = playSelectedCard(selectCard(state, 'aguila-p1'));
    const playerTwoTurn = finishTurn(afterPlayerOne);
    const afterPlayerTwo = playSelectedCard(selectCard(playerTwoTurn, 'aguila-p2'));
    const playerThreeTurn = finishTurn(afterPlayerTwo);

    expect(playerThreeTurn.players[2].notices).toHaveLength(2);
  });
});
