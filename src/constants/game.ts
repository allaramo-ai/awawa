export const PLAYER_COUNT = {
  min: 1,
  max: 4,
  defaultValue: 2,
} as const;

export const GAME_CONFIG = {
  initialDeckSize: 60,
  initialColonySize: 10,
  awawaSlots: 5,
  initialHandSize: 3,
  maxHandSize: 3,
  copiesPerCardType: 5,
  temporaryProtectionTurnStarts: 2,
} as const;
