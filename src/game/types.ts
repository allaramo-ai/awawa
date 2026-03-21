export type Locale = 'es';

export type CardTypeId =
  | 'roca'
  | 'cueva'
  | 'planta'
  | 'arbusto'
  | 'aguila';

export type CardDefinition = {
  id: CardTypeId;
  names: Record<Locale, string>;
};

export type Card = {
  id: string;
  type: CardTypeId;
};

export type PlayerState = {
  id: number;
  hand: Card[];
  hasDrawnThisTurn: boolean;
};

export type GameStatus = 'playing' | 'game_over';

export type GameState = {
  players: PlayerState[];
  currentPlayerIndex: number;
  drawPile: Card[];
  status: GameStatus;
};
