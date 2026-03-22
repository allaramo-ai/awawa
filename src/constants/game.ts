export const PLAYER_COUNT = {
  min: 1,
  max: 4,
  defaultValue: 2,
} as const;

export const GAME_CONFIG = {
  initialDeckSize: 62,
  initialColonySize: 10,
  awawaSlots: 5,
  initialHandSize: 3,
  maxHandSize: 3,
  copiesPerCardType: 4,
  extraAguilaCopies: 6,
  temporaryProtectionTurnStarts: 2,
} as const;
