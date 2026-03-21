import { GAME_CONFIG } from '../constants/game';
import {
  createGameState,
  drawCard,
  finishTurn,
  getCurrentPlayer,
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
});
