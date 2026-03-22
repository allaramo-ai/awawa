export type Locale = 'es';

export type CardTypeId =
  | 'roca'
  | 'cueva'
  | 'planta'
  | 'arbusto'
  | 'aguila'
  | 'bebe'
  | 'solcito'
  | 'elefante'
  | 'correr'
  | 'gritar'
  | 'rey';

export type CardDefinition = {
  id: CardTypeId;
  names: Record<Locale, string>;
};

export type Card = {
  id: string;
  type: CardTypeId;
  sourcePlayerId?: number;
};

export type PlayerState = {
  id: number;
  hand: Card[];
  protections: Array<Card | null>;
  awawas: boolean[];
  notices: string[];
  hasDrawnThisTurn: boolean;
  hasPlayedCardThisTurn: boolean;
  hasThrownCardThisTurn: boolean;
};

export type GameStatus = 'playing' | 'game_over';

export type GameState = {
  players: PlayerState[];
  currentPlayerIndex: number;
  drawPile: Card[];
  colonyCount: number;
  turnsCompleted: number;
  selectedCardId: string | null;
  lastActionText: string | null;
  resultText: string | null;
  status: GameStatus;
};
