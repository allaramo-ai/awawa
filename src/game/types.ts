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
  | 'escalar'
  | 'awawa'
  | 'toilet'
  | 'oloroso'
  | 'escaping'
  | 'exploring'
  | 'eat'
  | 'explorar'
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
  remainingTurnStarts?: number;
};

export type PlayerState = {
  id: number;
  hand: Card[];
  protections: Array<Card | null>;
  awawas: boolean[];
  notices: string[];
  needsLossTurn: boolean;
  hasDrawnThisTurn: boolean;
  playedCardsThisTurn: number;
  hasThrownCardThisTurn: boolean;
};

export type GameStatus = 'playing' | 'game_over';

export type PendingTargetActionType =
  | 'aguila'
  | 'awawa'
  | 'solcito'
  | 'oloroso'
  | 'escalar'
  | 'eat'
  | 'explorar'
  | 'gritar'
  | 'rey';

export type PendingTargetAction = {
  type: PendingTargetActionType;
  targetPlayerIndex: number;
  selectedSlotIndex: number | null;
  sourcePlayerId?: number;
  consumesSelectedCard?: boolean;
  protectionSlotIndex?: number;
};

export type GameState = {
  players: PlayerState[];
  currentPlayerIndex: number;
  drawPile: Card[];
  colonyCount: number;
  turnsCompleted: number;
  selectedCardId: string | null;
  pendingTargetAction: PendingTargetAction | null;
  lastActionText: string | null;
  resultText: string | null;
  status: GameStatus;
};
