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
  });

  it('does not allow drawing when the current player already has three cards', () => {
    const state = createGameState(2);
    const nextState = drawCard(state);

    expect(nextState).toBe(state);
    expect(getCurrentPlayer(nextState).hand).toHaveLength(
      GAME_CONFIG.maxHandSize,
    );
    expect(nextState.drawPile).toHaveLength(state.drawPile.length);
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

  it('rotates the turn to the next active player', () => {
    const state = createGameState(3);
    state.players[1].awawas = [false, false, false, false, false];

    const nextState = finishTurn(state);

    expect(getCurrentPlayer(nextState).id).toBe(3);
  });

  it('ends the game when the last card is drawn from the deck', () => {
    const state = createGameState(1);
    state.players[0].hand = state.players[0].hand.slice(0, 2);
    state.drawPile = state.drawPile.slice(0, 1);

    const nextState = drawCard(state);

    expect(nextState.drawPile).toHaveLength(0);
    expect(nextState.status).toBe('game_over');
    expect(nextState.resultText).toContain('Player 1 wins');
  });

  it('places non-aguila cards into protection slots and preserves them across turns', () => {
    const state = createGameState(2);
    const protectionCard = state.players[0].hand.find(
      (card) => card.type !== 'aguila',
    );

    expect(protectionCard).toBeDefined();

    const afterPlacement = placeCardInProtection(state, protectionCard!.id, 0);
    const afterTurnOne = finishTurn(afterPlacement);
    const afterTurnTwo = finishTurn(afterTurnOne);

    expect(afterPlacement.players[0].protections[0]?.id).toBe(
      protectionCard!.id,
    );
    expect(afterPlacement.players[0].hand).toHaveLength(2);
    expect(afterTurnTwo.players[0].protections[0]?.id).toBe(protectionCard!.id);
    expect(canDrawCard(afterPlacement)).toBe(true);
  });

  it('does not allow aguila cards to be placed in protection slots', () => {
    const state = createGameState(1);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];

    const nextState = placeCardInProtection(state, 'aguila-x', 0);

    expect(nextState).toBe(state);
    expect(nextState.players[0].protections[0]).toBeNull();
  });

  it('enables play only for a selected aguila card', () => {
    const state = createGameState(1);
    state.players[0].hand = [
      { id: 'roca-x', type: 'roca' },
      { id: 'aguila-x', type: 'aguila' },
    ];

    const afterSelectingRoca = selectCard(state, 'roca-x');
    const afterSelectingAguila = selectCard(afterSelectingRoca, 'aguila-x');

    expect(canPlaySelectedCard(afterSelectingRoca)).toBe(false);
    expect(canPlaySelectedCard(afterSelectingAguila)).toBe(true);
  });

  it('aguila kills one unprotected awawa of each other player', () => {
    const state = createGameState(3);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };
    state.players[1].protections[1] = { id: 'cueva-p2', type: 'cueva' };
    state.players[2].protections[0] = { id: 'roca-p3', type: 'roca' };
    state.players[2].protections[2] = { id: 'planta-p3', type: 'planta' };

    const afterSelect = selectCard(state, 'aguila-x');
    const afterPlay = playSelectedCard(afterSelect);

    expect(afterPlay.players[1].awawas.filter(Boolean)).toHaveLength(4);
    expect(afterPlay.players[2].awawas.filter(Boolean)).toHaveLength(4);
    expect(afterPlay.players[1].awawas[0]).toBe(true);
    expect(afterPlay.players[2].awawas[0]).toBe(true);
    expect(afterPlay.players[1].protections.every((card) => card === null)).toBe(
      true,
    );
    expect(afterPlay.players[2].protections.every((card) => card === null)).toBe(
      true,
    );
    expect(afterPlay.players[0].awawas.filter(Boolean)).toHaveLength(5);
    expect(afterPlay.lastActionText).toContain(
      'Your \u00C1guila took one Awawa from Player 2.',
    );
    expect(afterPlay.lastActionText).toContain(
      'Your \u00C1guila took one Awawa from Player 3.',
    );
    expect(afterPlay.players[1].notices.join(' ')).toContain(
      "Player 1's \u00C1guila took one Awawa from you",
    );
  });

  it('eliminates a player with no awawas left and ends the game when one player remains', () => {
    const state = createGameState(2);
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].awawas = [true, false, false, false, false];
    state.players[1].protections = [null, null, null, null, null];

    const afterSelect = selectCard(state, 'aguila-x');
    const afterPlay = playSelectedCard(afterSelect);

    expect(afterPlay.players[1].awawas.filter(Boolean)).toHaveLength(0);
    expect(afterPlay.status).toBe('game_over');
    expect(afterPlay.resultText).toContain('Player 1 wins');
  });

  it('declares a draw at deck end when players have the same awawa count', () => {
    const state = createGameState(2);
    state.players[0].hand = state.players[0].hand.slice(0, 2);
    state.drawPile = state.drawPile.slice(0, 1);
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
    state.players[0].hand = [{ id: 'aguila-x', type: 'aguila' }];
    state.players[1].protections[0] = { id: 'roca-p2', type: 'roca' };

    const afterSelect = selectCard(state, 'aguila-x');
    const afterPlay = playSelectedCard(afterSelect);
    const afterFinishTurn = finishTurn(afterPlay);

    expect(getCurrentPlayer(afterFinishTurn).id).toBe(2);
    expect(getCurrentPlayer(afterFinishTurn).notices.join(' ')).toContain(
      "Player 1's \u00C1guila took one Awawa from you",
    );
  });

  it('accumulates aguila notices from multiple opponents until the player turn is finished', () => {
    const state = createGameState(3);
    state.players[0].hand = [{ id: 'aguila-p1', type: 'aguila' }];
    state.players[1].hand = [{ id: 'aguila-p2', type: 'aguila' }];
    state.players[2].protections = [null, null, null, null, null];

    const afterPlayerOne = playSelectedCard(selectCard(state, 'aguila-p1'));
    const playerTwoTurn = finishTurn(afterPlayerOne);
    const afterPlayerTwo = playSelectedCard(selectCard(playerTwoTurn, 'aguila-p2'));
    const playerThreeTurn = finishTurn(afterPlayerTwo);

    expect(playerThreeTurn.players[2].notices).toHaveLength(2);
    expect(playerThreeTurn.players[2].notices[0]).toContain(
      "Player 1's \u00C1guila took one Awawa from you",
    );
    expect(playerThreeTurn.players[2].notices[1]).toContain(
      "Player 2's \u00C1guila took one Awawa from you",
    );
  });
});
