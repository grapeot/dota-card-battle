// ============================================================
// Core data types matching card_designs.json and boss_designs.json
// ============================================================

export interface CardValue {
  damage?: number;
  armor?: number;
  heal?: number;
  draw?: number;
  repeat?: number;
  bonus_damage?: number;
  bonus_armor?: number;
  silence_reduction?: number;
  sacrifice_hp?: number;
  // Relic passives
  armor_per_turn?: number;
  damage_per_turn?: number;
  draw_per_turn?: number;
}

export type CardType = '英雄' | '技能' | '遗物';
export type Faction = '天辉' | '夜魇' | '中立';
export type Rarity = '普通' | '稀有' | '史诗';

export interface Card {
  id: string;
  name: string;
  card_type: CardType;
  faction: Faction;
  archetype: string;
  cost: number;
  rarity: Rarity;
  effect_type: string;
  target: string;
  value: CardValue;
  keywords: string[];
  description: string;
  image_file: string;
}

// ============================================================
// Boss types
// ============================================================

export interface BossAction {
  action: 'attack' | 'multi' | 'armor';
  value?: number;
  attack?: number;
  armor?: number;
}

export interface BossBehavior {
  type: 'cycle' | 'escalate';
  description: string;
  sequence: BossAction[];
  // For escalate type
  base?: number;
  increment?: number;
}

export interface Boss {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hp: number;
  behavior: BossBehavior;
}

// ============================================================
// Battle state types
// ============================================================

export type GamePhase =
  | 'BOSS_SELECT'
  | 'TURN_START'
  | 'RELIC_PASSIVE'
  | 'SHOW_INTENT'
  | 'PLAYER_ACTION'
  | 'PLAYER_END'
  | 'ENEMY_ACTION'
  | 'TURN_SETTLE'
  | 'PLAYER_DEAD'
  | 'ENEMY_DEAD'
  | 'TURN_LIMIT_REACHED';

export interface RelicBuff {
  cardId: string;
  cardName: string;
  armor_per_turn: number;
  damage_per_turn: number;
  draw_per_turn: number;
}

export interface BossState {
  boss: Boss;
  currentHp: number;
  maxHp: number;
  armor: number;
  actionIndex: number;       // current position in behavior.sequence
  silenceReduction: number;  // % reduction applied to next action (0 = no silence)
  currentIntent: BossAction | null;
}

export interface PlayerState {
  currentHp: number;
  maxHp: number;
  armor: number;
  relics: RelicBuff[];       // active relic passives (max 3)
}

export interface BattleState {
  phase: GamePhase;
  turn: number;
  manaMax: number;
  manaLeft: number;
  player: PlayerState;
  boss: BossState;
  deck: Card[];      // draw pile
  hand: Card[];
  discard: Card[];
  log: string[];
  cardsPlayed: number;  // total cards played this battle
}

// ============================================================
// Action types for the battle engine
// ============================================================

export type BattleAction =
  | { type: 'SELECT_BOSS'; boss: Boss; allCards: Card[] }
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'END_TURN' }
  | { type: 'RESTART' };
