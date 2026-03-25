import cardsRaw from './card_designs.json';
import bossesRaw from './boss_designs.json';
import type { Card, Boss } from '../engine/types';

export const ALL_CARDS: Card[] = (cardsRaw as { cards: Card[] }).cards;
export const ALL_BOSSES: Boss[] = (bossesRaw as { bosses: Boss[] }).bosses;
