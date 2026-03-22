import { GAME_CONFIG } from '../constants/game';
import { Card, CardDefinition } from './types';

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
  { id: 'gritar', names: { es: 'Gritar' } },
  { id: 'rey', names: { es: 'Rey' } },
];

export function buildConfiguredDeck(): Card[] {
  const deck: Card[] = [];

  for (const definition of CARD_DEFINITIONS) {
    for (let copyNumber = 1; copyNumber <= GAME_CONFIG.copiesPerCardType; copyNumber += 1) {
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
