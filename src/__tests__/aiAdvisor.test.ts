import { describe, it, expect } from 'vitest';
import { getAiAdvice } from '../engine/aiAdvisor';
import type { BattleState, Card, BossState, PlayerState, Boss } from '../engine/types';

// ============================================================
// Test fixtures
// ============================================================

const MOCK_BOSS_DEF: Boss = {
  id: 'test_boss',
  name: '测试BOSS',
  difficulty: 'easy',
  hp: 100,
  behavior: {
    type: 'cycle',
    description: 'test cycle',
    sequence: [{ action: 'attack', value: 10 }],
  },
};

function makeBossState(overrides: Partial<BossState> = {}): BossState {
  return {
    boss: MOCK_BOSS_DEF,
    currentHp: 100,
    maxHp: 100,
    armor: 0,
    actionIndex: 0,
    silenceReduction: 0,
    currentIntent: { action: 'attack', value: 10 },
    ...overrides,
  };
}

function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    currentHp: 72,
    maxHp: 72,
    armor: 0,
    relics: [],
    ...overrides,
  };
}

const DAMAGE_CARD: Card = {
  id: 'dmg_card',
  name: '攻击牌',
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
  id: 'armor_card',
  name: '防御牌',
  card_type: '技能',
  faction: '天辉',
  archetype: '力量型前排',
  cost: 1,
  rarity: '普通',
  effect_type: '防御',
  target: '自身',
  value: { armor: 15 },
  keywords: ['护甲'],
  description: '获得15点护甲',
  image_file: 'test.jpg',
};

const RELIC_CARD: Card = {
  id: 'relic_card',
  name: '遗物牌',
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

const EXPENSIVE_CARD: Card = {
  id: 'expensive_card',
  name: '高费牌',
  card_type: '技能',
  faction: '天辉',
  archetype: '力量型前排',
  cost: 4,
  rarity: '史诗',
  effect_type: '伤害',
  target: '敌方单体',
  value: { damage: 30 },
  keywords: [],
  description: '造成30点伤害',
  image_file: 'test.jpg',
};

function makeState(overrides: {
  hand?: Card[];
  manaLeft?: number;
  player?: Partial<PlayerState>;
  boss?: Partial<BossState>;
}): BattleState {
  return {
    phase: 'PLAYER_ACTION',
    turn: 1,
    manaMax: 3,
    manaLeft: overrides.manaLeft ?? 3,
    player: makePlayerState(overrides.player),
    boss: makeBossState(overrides.boss),
    hand: overrides.hand ?? [DAMAGE_CARD],
    deck: [],
    discard: [],
    log: [],
    cardsPlayed: 0,
  };
}

// ============================================================
// Tests
// ============================================================

describe('getAiAdvice', () => {
  // 1. Empty hand returns end_turn strategy
  it('returns end_turn strategy when hand is empty', () => {
    const state = makeState({ hand: [], manaLeft: 3 });
    const advice = getAiAdvice(state);
    expect(advice.strategy).toBe('end_turn');
    expect(advice.recommendedCardId).toBeNull();
  });

  // Also end_turn when all cards are too expensive
  it('returns end_turn strategy when no cards are affordable', () => {
    const state = makeState({ hand: [EXPENSIVE_CARD], manaLeft: 1 });
    const advice = getAiAdvice(state);
    expect(advice.strategy).toBe('end_turn');
    expect(advice.recommendedCardId).toBeNull();
  });

  // 2. Boss intent damage > 50% of player HP => defense strategy
  it('returns defense strategy when boss intent damage exceeds 50% of player HP', () => {
    // Player HP = 72, boss intent = 40 (>36 = 50% of 72)
    const state = makeState({
      hand: [DAMAGE_CARD, ARMOR_CARD],
      manaLeft: 3,
      player: { currentHp: 72, armor: 0 },
      boss: { currentIntent: { action: 'attack', value: 40 } },
    });
    const advice = getAiAdvice(state);
    expect(advice.strategy).toBe('defense');
  });

  // 3. Boss damage + no armor = death => defense strategy (critical)
  it('returns defense strategy when player would die without defense', () => {
    // Player HP = 10, boss intent = 15, player armor = 0 => hpAfterAttack = -5
    const state = makeState({
      hand: [DAMAGE_CARD, ARMOR_CARD],
      manaLeft: 3,
      player: { currentHp: 10, armor: 0 },
      boss: { currentIntent: { action: 'attack', value: 15 } },
    });
    const advice = getAiAdvice(state);
    expect(advice.strategy).toBe('defense');
  });

  // 4. Low boss threat => offense strategy
  it('returns offense strategy when boss threat is low', () => {
    // Player HP = 72, boss intent = 5 (< 36, not dangerous)
    const state = makeState({
      hand: [DAMAGE_CARD, ARMOR_CARD],
      manaLeft: 3,
      player: { currentHp: 72, armor: 0 },
      boss: { currentIntent: { action: 'attack', value: 5 } },
    });
    const advice = getAiAdvice(state);
    expect(advice.strategy).toBe('offense');
  });

  // 5. Relic slot available => prefer relic card
  it('recommends relic card when relic slot is available', () => {
    const state = makeState({
      hand: [DAMAGE_CARD, RELIC_CARD],
      manaLeft: 3,
      player: { relics: [] }, // fewer than 3 relics
      boss: { currentIntent: { action: 'attack', value: 5 } },
    });
    const advice = getAiAdvice(state);
    expect(advice.strategy).toBe('relic');
    expect(advice.recommendedCardId).toBe('relic_card');
  });

  // 6. Relic slot full => do not recommend relic card
  it('does not recommend relic when all relic slots are full', () => {
    const fullRelics = [
      { cardId: 'r1', cardName: '遗物1', armor_per_turn: 1, damage_per_turn: 0, draw_per_turn: 0 },
      { cardId: 'r2', cardName: '遗物2', armor_per_turn: 1, damage_per_turn: 0, draw_per_turn: 0 },
      { cardId: 'r3', cardName: '遗物3', armor_per_turn: 1, damage_per_turn: 0, draw_per_turn: 0 },
    ];
    const state = makeState({
      hand: [DAMAGE_CARD, RELIC_CARD],
      manaLeft: 3,
      player: { relics: fullRelics }, // 3 relics = full
      boss: { currentIntent: { action: 'attack', value: 5 } },
    });
    const advice = getAiAdvice(state);
    expect(advice.strategy).not.toBe('relic');
    // Should not recommend the relic card
    expect(advice.recommendedCardId).not.toBe('relic_card');
  });

  // 7. Recommended card cost <= current mana left
  it('only recommends cards the player can afford', () => {
    // manaLeft=1, EXPENSIVE_CARD costs 4, DAMAGE_CARD costs 1
    const state = makeState({
      hand: [DAMAGE_CARD, EXPENSIVE_CARD],
      manaLeft: 1,
      player: { currentHp: 72, armor: 0 },
      boss: { currentIntent: { action: 'attack', value: 5 } },
    });
    const advice = getAiAdvice(state);
    if (advice.recommendedCardId !== null) {
      const recommended = state.hand.find(c => c.id === advice.recommendedCardId);
      expect(recommended).toBeDefined();
      expect(recommended!.cost).toBeLessThanOrEqual(state.manaLeft);
    }
  });

  // 8. cardRankings are sorted by score descending
  it('returns cardRankings sorted by score descending', () => {
    const state = makeState({
      hand: [DAMAGE_CARD, ARMOR_CARD, EXPENSIVE_CARD],
      manaLeft: 5,
      player: { currentHp: 72, armor: 0 },
      boss: { currentIntent: { action: 'attack', value: 5 } },
    });
    const advice = getAiAdvice(state);
    const rankings = advice.cardRankings;
    for (let i = 0; i < rankings.length - 1; i++) {
      expect(rankings[i].score).toBeGreaterThanOrEqual(rankings[i + 1].score);
    }
  });

  // Additional: cardRankings exclude relic cards
  it('cardRankings do not include relic-type cards', () => {
    const state = makeState({
      hand: [DAMAGE_CARD, RELIC_CARD],
      manaLeft: 5,
      player: { currentHp: 72, armor: 0, relics: [] },
      boss: { currentIntent: { action: 'attack', value: 5 } },
    });
    const advice = getAiAdvice(state);
    const relicInRankings = advice.cardRankings.find(r => r.cardId === 'relic_card');
    expect(relicInRankings).toBeUndefined();
  });
});
