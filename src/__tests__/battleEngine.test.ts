import { describe, it, expect } from 'vitest';
import {
  createInitialBattleState,
  startBattle,
  battleReducer,
  manaForTurn,
} from '../engine/battleEngine';
import type { Card, Boss } from '../engine/types';

// ============================================================
// Test fixtures
// ============================================================

const MOCK_BOSS: Boss = {
  id: 'test_boss',
  name: '测试BOSS',
  difficulty: 'easy',
  hp: 50,
  behavior: {
    type: 'cycle',
    description: 'test cycle',
    sequence: [
      { action: 'attack', value: 10 },
      { action: 'attack', value: 15 },
    ],
  },
};

const DAMAGE_CARD: Card = {
  id: 'test_dmg',
  name: '测试伤害',
  card_type: '技能',
  faction: '天辉',
  archetype: '力量型前排',
  cost: 1,
  rarity: '普通',
  effect_type: '伤害',
  target: '敌方单体',
  value: { damage: 10 },
  keywords: [],
  description: '造成10点伤害',
  image_file: 'test.jpg',
};

const ARMOR_CARD: Card = {
  id: 'test_armor',
  name: '测试护甲',
  card_type: '技能',
  faction: '天辉',
  archetype: '力量型前排',
  cost: 1,
  rarity: '普通',
  effect_type: '防御',
  target: '自身',
  value: { armor: 10 },
  keywords: ['护甲'],
  description: '获得10点护甲',
  image_file: 'test.jpg',
};

const HEAL_CARD: Card = {
  id: 'test_heal',
  name: '测试治疗',
  card_type: '技能',
  faction: '天辉',
  archetype: '力量型前排',
  cost: 1,
  rarity: '普通',
  effect_type: '资源',
  target: '自身',
  value: { heal: 5 },
  keywords: [],
  description: '恢复5点生命',
  image_file: 'test.jpg',
};

const RELIC_CARD: Card = {
  id: 'test_relic',
  name: '测试遗物',
  card_type: '遗物',
  faction: '天辉',
  archetype: '力量型前排',
  cost: 2,
  rarity: '稀有',
  effect_type: '成长',
  target: '自身',
  value: { armor: 3, armor_per_turn: 3 },
  keywords: ['成长'],
  description: '获得3点护甲，每回合获得3点护甲',
  image_file: 'test.jpg',
};

const SILENCE_CARD: Card = {
  id: 'test_silence',
  name: '测试沉默',
  card_type: '技能',
  faction: '夜魇',
  archetype: '智力型法术',
  cost: 2,
  rarity: '稀有',
  effect_type: '控制',
  target: '敌方单体',
  value: { damage: 5, silence_reduction: 50 },
  keywords: ['沉默'],
  description: '造成5点伤害，敌方下回合减半',
  image_file: 'test.jpg',
};

const ALL_CARDS = [DAMAGE_CARD, ARMOR_CARD, HEAL_CARD, RELIC_CARD, SILENCE_CARD];

// ============================================================
// manaForTurn tests
// ============================================================

describe('manaForTurn', () => {
  it('returns 1 for turn 1', () => {
    expect(manaForTurn(1)).toBe(1);
  });
  it('returns 2 for turn 2', () => {
    expect(manaForTurn(2)).toBe(2);
  });
  it('returns 5 for turn 5', () => {
    expect(manaForTurn(5)).toBe(5);
  });
  it('caps at 5 for turn 10', () => {
    expect(manaForTurn(10)).toBe(5);
  });
  it('caps at 5 for turn 30', () => {
    expect(manaForTurn(30)).toBe(5);
  });
});

// ============================================================
// createInitialBattleState tests
// ============================================================

describe('createInitialBattleState', () => {
  it('sets player hp to 72', () => {
    const state = createInitialBattleState(MOCK_BOSS, ALL_CARDS);
    expect(state.player.currentHp).toBe(72);
    expect(state.player.maxHp).toBe(72);
  });

  it('sets boss hp correctly', () => {
    const state = createInitialBattleState(MOCK_BOSS, ALL_CARDS);
    expect(state.boss.currentHp).toBe(50);
    expect(state.boss.maxHp).toBe(50);
  });

  it('starts at turn 1 with mana 1', () => {
    const state = createInitialBattleState(MOCK_BOSS, ALL_CARDS);
    expect(state.turn).toBe(1);
    expect(state.manaMax).toBe(1);
    expect(state.manaLeft).toBe(1);
  });

  it('deck has all cards shuffled', () => {
    const state = createInitialBattleState(MOCK_BOSS, ALL_CARDS);
    expect(state.deck.length).toBe(ALL_CARDS.length);
  });
});

// ============================================================
// startBattle tests
// ============================================================

describe('startBattle', () => {
  it('deals 5 initial cards', () => {
    const state = startBattle(MOCK_BOSS, ALL_CARDS);
    expect(state.hand.length).toBe(5);
  });

  it('starts in PLAYER_ACTION phase', () => {
    const state = startBattle(MOCK_BOSS, ALL_CARDS);
    expect(state.phase).toBe('PLAYER_ACTION');
  });

  it('computes boss first intent', () => {
    const state = startBattle(MOCK_BOSS, ALL_CARDS);
    expect(state.boss.currentIntent).not.toBeNull();
    expect(state.boss.currentIntent?.action).toBe('attack');
  });
});

// ============================================================
// Card play tests
// ============================================================

describe('PLAY_CARD action', () => {
  it('deducts mana when playing a card', () => {
    const state = startBattle(MOCK_BOSS, [DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD]);
    const cardId = state.hand[0].id;
    const next = battleReducer(state, { type: 'PLAY_CARD', cardId });
    expect(next.manaLeft).toBe(state.manaLeft - 1);
  });

  it('removes card from hand', () => {
    const state = startBattle(MOCK_BOSS, [DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD]);
    const initialHandCount = state.hand.length;
    const cardId = state.hand[0].id;
    const next = battleReducer(state, { type: 'PLAY_CARD', cardId });
    expect(next.hand.length).toBe(initialHandCount - 1);
  });

  it('cannot play card when mana insufficient', () => {
    // Create a state with 0 mana by draining it
    const state = startBattle(MOCK_BOSS, [DAMAGE_CARD, ARMOR_CARD, HEAL_CARD, RELIC_CARD, SILENCE_CARD]);
    // Manually set mana to 0
    const noManaState = { ...state, manaLeft: 0 };
    const cardId = noManaState.hand[0].id;
    const next = battleReducer(noManaState, { type: 'PLAY_CARD', cardId });
    // Hand should be unchanged
    expect(next.hand.length).toBe(noManaState.hand.length);
    expect(next.log[next.log.length - 1]).toContain('费用不足');
  });
});

// ============================================================
// Turn flow tests
// ============================================================

describe('END_TURN / turn flow', () => {
  it('increments turn counter on end turn', () => {
    const state = startBattle(MOCK_BOSS, ALL_CARDS);
    const next = battleReducer(state, { type: 'END_TURN' });
    expect(next.turn).toBe(2);
  });

  it('mana increases on subsequent turns', () => {
    let state = startBattle(MOCK_BOSS, ALL_CARDS);
    expect(state.manaMax).toBe(1);

    state = battleReducer(state, { type: 'END_TURN' });
    expect(state.manaMax).toBe(2);

    state = battleReducer(state, { type: 'END_TURN' });
    expect(state.manaMax).toBe(3);
  });

  it('mana caps at 5', () => {
    let state = startBattle(MOCK_BOSS, ALL_CARDS);
    for (let i = 0; i < 6; i++) {
      state = battleReducer(state, { type: 'END_TURN' });
    }
    expect(state.manaMax).toBe(5);
    expect(state.manaLeft).toBe(5);
  });

  it('both armors clear after end turn', () => {
    let state = startBattle(MOCK_BOSS, [ARMOR_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD]);
    // Manually give player armor
    state = { ...state, player: { ...state.player, armor: 10 }, boss: { ...state.boss, armor: 8 } };
    const next = battleReducer(state, { type: 'END_TURN' });
    expect(next.player.armor).toBe(0);
    expect(next.boss.armor).toBe(0);
  });

  it('boss attacks player at end of turn', () => {
    const state = startBattle(MOCK_BOSS, ALL_CARDS);
    const playerHpBefore = state.player.currentHp;
    const next = battleReducer(state, { type: 'END_TURN' });
    // Boss should have attacked; player hp should decrease (no armor)
    expect(next.player.currentHp).toBeLessThan(playerHpBefore);
  });
});

// ============================================================
// Win / lose conditions
// ============================================================

describe('win/lose conditions', () => {
  it('ENEMY_DEAD when boss hp reaches 0', () => {
    // Give boss 1 hp and play damage card
    const lowHpBossState = startBattle(MOCK_BOSS, [DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD, DAMAGE_CARD]);
    const state = { ...lowHpBossState, boss: { ...lowHpBossState.boss, currentHp: 1 } };
    const cardId = state.hand[0].id;
    const next = battleReducer(state, { type: 'PLAY_CARD', cardId });
    expect(next.phase).toBe('ENEMY_DEAD');
  });

  it('PLAYER_DEAD when player hp reaches 0', () => {
    // Low player hp + end turn so boss attacks
    const state = startBattle(MOCK_BOSS, ALL_CARDS);
    const lowHpState = { ...state, player: { ...state.player, currentHp: 1, armor: 0 } };
    const next = battleReducer(lowHpState, { type: 'END_TURN' });
    expect(next.phase).toBe('PLAYER_DEAD');
  });

  it('TURN_LIMIT_REACHED at turn 30', () => {
    let state = startBattle(MOCK_BOSS, ALL_CARDS);
    // Give player and boss huge HP so neither dies before turn 30
    state = {
      ...state,
      player: { ...state.player, currentHp: 99999, maxHp: 99999 },
      boss: { ...state.boss, currentHp: 99999, maxHp: 99999 },
    };
    for (let i = 0; i < 30; i++) {
      if (state.phase !== 'PLAYER_ACTION') break;
      state = battleReducer(state, { type: 'END_TURN' });
    }
    expect(state.phase).toBe('TURN_LIMIT_REACHED');
  });
});
