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

  it('rotates the turn to the next player', () => {
    const state = createGameState(3);
    const nextState = finishTurn(state);

    expect(getCurrentPlayer(nextState).id).toBe(2);
  });

  it('ends the game when the last card is drawn from the deck', () => {
    const state = createGameState(1);
    state.players[0].hand = state.players[0].hand.slice(0, 2);
    state.drawPile = state.drawPile.slice(0, 1);

    const nextState = drawCard(state);

    expect(nextState.drawPile).toHaveLength(0);
    expect(nextState.status).toBe('game_over');
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

    expect(afterPlacement.players[0].protections[0]?.id).toBe(protectionCard!.id);
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

  it('enables play only for a selected aguila card and consumes it when played', () => {
    const state = createGameState(1);
    state.players[0].hand = [
      { id: 'roca-x', type: 'roca' },
      { id: 'aguila-x', type: 'aguila' },
    ];

    const afterSelectingRoca = selectCard(state, 'roca-x');
    const afterSelectingAguila = selectCard(afterSelectingRoca, 'aguila-x');
    const afterPlay = playSelectedCard(afterSelectingAguila);

    expect(canPlaySelectedCard(afterSelectingRoca)).toBe(false);
    expect(canPlaySelectedCard(afterSelectingAguila)).toBe(true);
    expect(afterPlay.players[0].hand.map((card) => card.id)).toEqual(['roca-x']);
    expect(afterPlay.selectedCardId).toBeNull();
  });
});
