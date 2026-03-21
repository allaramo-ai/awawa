import { GAME_CONFIG } from '../constants/game';
import { Card, CardDefinition } from './types';

export const CARD_DEFINITIONS: CardDefinition[] = [
  { id: 'roca', names: { es: 'Roca' } },
  { id: 'cueva', names: { es: 'Cueva' } },
  { id: 'planta', names: { es: 'Planta' } },
  { id: 'arbusto', names: { es: 'Arbusto' } },
  { id: 'aguila', names: { es: 'Águila' } },
];

export function buildConfiguredDeck(): Card[] {
  const deck: Card[] = [];
  let copyNumber = 1;

  while (deck.length < GAME_CONFIG.initialDeckSize) {
    for (const definition of CARD_DEFINITIONS) {
      if (copyNumber > GAME_CONFIG.copiesPerCardType) {
        break;
      }

      deck.push({
        id: `${definition.id}-${copyNumber}`,
        type: definition.id,
      });

      if (deck.length === GAME_CONFIG.initialDeckSize) {
        return deck;
      }
    }

    copyNumber += 1;
  }

  return deck;
}

export function getCardLabel(card: Card) {
  return (
    CARD_DEFINITIONS.find((definition) => definition.id === card.type)?.names.es
      ?? card.type
  );
}
