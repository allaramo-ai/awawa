import { GAME_CONFIG } from '../constants/game';
import { Card, CardDefinition, CardTypeId } from './types';

export const CARD_DEFINITIONS: CardDefinition[] = [
  { id: 'roca', names: { es: 'Roca' } },
  { id: 'cueva', names: { es: 'Cueva' } },
  { id: 'planta', names: { es: 'Planta' } },
  { id: 'arbusto', names: { es: 'Arbusto' } },
  { id: 'aguila', names: { es: '\u00C1guila' } },
  { id: 'bebe', names: { es: 'Beb\u00E9' } },
  { id: 'solcito', names: { es: 'Solcito' } },
  { id: 'elefante', names: { es: 'Elefante' } },
  { id: 'correr', names: { es: 'Correr' } },
  { id: 'awawa', names: { es: 'Awawa' } },
  { id: 'toilet', names: { es: 'Toilet' } },
  { id: 'gritar', names: { es: 'Gritar' } },
  { id: 'rey', names: { es: 'Rey' } },
];

export const CARD_COPY_COUNTS: Record<CardTypeId, number> = {
  roca: GAME_CONFIG.copiesPerCardType,
  cueva: GAME_CONFIG.copiesPerCardType,
  planta: GAME_CONFIG.copiesPerCardType,
  arbusto: GAME_CONFIG.copiesPerCardType,
  aguila: GAME_CONFIG.copiesPerCardType + GAME_CONFIG.extraAguilaCopies,
  bebe: GAME_CONFIG.copiesPerCardType,
  solcito: GAME_CONFIG.copiesPerCardType,
  elefante: GAME_CONFIG.copiesPerCardType,
  correr: GAME_CONFIG.copiesPerCardType,
  awawa: GAME_CONFIG.copiesPerCardType,
  toilet: GAME_CONFIG.copiesPerCardType,
  gritar: GAME_CONFIG.copiesPerCardType,
  rey: GAME_CONFIG.copiesPerCardType,
};

export function getConfiguredDeckSize() {
  return Object.values(CARD_COPY_COUNTS).reduce((total, count) => total + count, 0);
}

export function buildConfiguredDeck(): Card[] {
  const deck: Card[] = [];

  for (const definition of CARD_DEFINITIONS) {
    for (let copyNumber = 1; copyNumber <= CARD_COPY_COUNTS[definition.id]; copyNumber += 1) {
      deck.push({
        id: `${definition.id}-${copyNumber}`,
        type: definition.id,
      });
    }
  }

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentCard = deck[index];
    deck[index] = deck[randomIndex];
    deck[randomIndex] = currentCard;
  }

  return deck;
}

export function getCardLabel(card: Card) {
  if (card.type === 'solcito' && card.sourcePlayerId) {
    return `Solcito P${card.sourcePlayerId}`;
  }

  if (card.type === 'awawa' && card.sourcePlayerId) {
    return `Awawa P${card.sourcePlayerId}`;
  }

  return (
    CARD_DEFINITIONS.find((definition) => definition.id === card.type)?.names.es
      ?? card.type
  );
}

export function canCardProtect(card: Card) {
  return (
    card.type !== 'aguila' &&
    card.type !== 'bebe' &&
    card.type !== 'solcito' &&
    card.type !== 'elefante' &&
    card.type !== 'gritar' &&
    card.type !== 'rey'
  );
}

export function canCardBePlayed(card: Card) {
  return (
    card.type === 'aguila' ||
    card.type === 'bebe' ||
    card.type === 'solcito' ||
    card.type === 'elefante' ||
    card.type === 'gritar' ||
    card.type === 'rey'
  );
}
