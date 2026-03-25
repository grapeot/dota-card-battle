import { describe, it, expect } from 'vitest';
import {
  resolveCard,
  triggerRelicPassives,
  executeBossAction,
  computeBossIntent,
  dealDamageToBoss,
  givePlayerArmor,
  healPlayer,
  damagePlayer,
  drawCards,
} from '../engine/cardEffects';
import type { BattleState, Card, Boss } from '../engine/types';

// ============================================================
// Test fixtures
// ============================================================

const MOCK_BOSS: Boss = {
  id: 'test',
  name: 'TestBoss',
  difficulty: 'easy',
  hp: 100,
  behavior: {
    type: 'cycle',
    description: 'test',
    sequence: [
      { action: 'attack', value: 20 },
      { action: 'multi', attack: 10, armor: 8 },
    ],
  },
};

function makeState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    phase: 'PLAYER_ACTION',
    turn: 1,
    manaMax: 3,
    manaLeft: 3,
    player: {
      currentHp: 72,
      maxHp: 72,
      armor: 0,
      relics: [],
    },
    boss: {
      boss: MOCK_BOSS,
      currentHp: 100,
      maxHp: 100,
      armor: 0,
      actionIndex: 0,
      silenceReduction: 0,
      currentIntent: null,
    },
    deck: [],
    hand: [],
    discard: [],
    log: [],
    cardsPlayed: 0,
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    name: '测试牌',
    card_type: '技能',
    faction: '天辉',
    archetype: '力量型前排',
    cost: 1,
    rarity: '普通',
    effect_type: '伤害',
    target: '敌方单体',
    value: {},
    keywords: [],
    description: '',
    image_file: 'test.jpg',
    ...overrides,
  };
}

// ============================================================
// Primitive helpers
// ============================================================

describe('dealDamageToBoss', () => {
  it('reduces boss hp directly when boss has no armor', () => {
    const state = makeState();
    const next = dealDamageToBoss(state, 20);
    expect(next.boss.currentHp).toBe(80);
  });

  it('reduces boss armor first, then hp', () => {
    const state = makeState({ boss: { ...makeState().boss, armor: 5 } });
    const next = dealDamageToBoss(state, 15);
    expect(next.boss.armor).toBe(0);
    expect(next.boss.currentHp).toBe(90); // 100 - (15 - 5) = 90
  });

  it('does not reduce boss hp below 0', () => {
    const state = makeState({ boss: { ...makeState().boss, currentHp: 5 } });
    const next = dealDamageToBoss(state, 100);
    expect(next.boss.currentHp).toBe(0);
  });

  it('fully absorbed by armor when armor >= damage', () => {
    const state = makeState({ boss: { ...makeState().boss, armor: 20 } });
    const next = dealDamageToBoss(state, 10);
    expect(next.boss.armor).toBe(10);
    expect(next.boss.currentHp).toBe(100); // unchanged
  });
});

describe('givePlayerArmor', () => {
  it('increases player armor', () => {
    const state = makeState();
    const next = givePlayerArmor(state, 8);
    expect(next.player.armor).toBe(8);
  });

  it('stacks armor', () => {
    const state = makeState({ player: { ...makeState().player, armor: 5 } });
    const next = givePlayerArmor(state, 7);
    expect(next.player.armor).toBe(12);
  });
});

describe('healPlayer', () => {
  it('restores hp', () => {
    const state = makeState({ player: { ...makeState().player, currentHp: 50 } });
    const next = healPlayer(state, 10);
    expect(next.player.currentHp).toBe(60);
  });

  it('does not heal above max hp', () => {
    const state = makeState({ player: { ...makeState().player, currentHp: 70 } });
    const next = healPlayer(state, 10);
    expect(next.player.currentHp).toBe(72);
  });
});

describe('damagePlayer', () => {
  it('reduces player hp directly when no armor', () => {
    const state = makeState();
    const next = damagePlayer(state, 15);
    expect(next.player.currentHp).toBe(57);
  });

  it('consumes player armor first', () => {
    const state = makeState({ player: { ...makeState().player, armor: 10 } });
    const next = damagePlayer(state, 15);
    expect(next.player.armor).toBe(0);
    expect(next.player.currentHp).toBe(67); // 72 - (15-10) = 67
  });

  it('does not reduce player hp below 0', () => {
    const state = makeState({ player: { ...makeState().player, currentHp: 5 } });
    const next = damagePlayer(state, 100);
    expect(next.player.currentHp).toBe(0);
  });
});

describe('drawCards', () => {
  it('moves cards from deck to hand', () => {
    const cards = [makeCard({ id: 'a' }), makeCard({ id: 'b' }), makeCard({ id: 'c' })];
    const state = makeState({ deck: cards });
    const next = drawCards(state, 2);
    expect(next.hand.length).toBe(2);
    expect(next.deck.length).toBe(1);
  });

  it('respects hand limit of 10', () => {
    const hand = Array.from({ length: 10 }, (_, i) => makeCard({ id: `h${i}` }));
    const deck = [makeCard({ id: 'new' })];
    const state = makeState({ hand, deck });
    const next = drawCards(state, 1);
    expect(next.hand.length).toBe(10); // still 10, at limit
  });

  it('shuffles discard into deck when deck is empty', () => {
    const discard = [makeCard({ id: 'disc1' }), makeCard({ id: 'disc2' })];
    const state = makeState({ deck: [], discard });
    const next = drawCards(state, 1);
    expect(next.hand.length).toBe(1);
    // Discard should be mostly consumed (minus what's now in hand)
    expect(next.deck.length + next.hand.length + next.discard.length).toBe(2);
  });
});

// ============================================================
// resolveCard tests
// ============================================================

describe('resolveCard - damage', () => {
  it('deals damage to boss', () => {
    const card = makeCard({ value: { damage: 15 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.boss.currentHp).toBe(85);
  });

  it('applies repeat (连击)', () => {
    const card = makeCard({ value: { damage: 5, repeat: 2 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.boss.currentHp).toBe(90); // 100 - 5*2
  });

  it('applies bonus_damage (召唤)', () => {
    const card = makeCard({ value: { damage: 5, bonus_damage: 4 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.boss.currentHp).toBe(91); // 100 - 5 - 4
  });
});

describe('resolveCard - armor', () => {
  it('gives player armor', () => {
    const card = makeCard({ value: { armor: 8 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.player.armor).toBe(8);
  });

  it('applies bonus_armor (召唤)', () => {
    const card = makeCard({ value: { armor: 3, bonus_armor: 5 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.player.armor).toBe(8);
  });
});

describe('resolveCard - heal', () => {
  it('heals player', () => {
    const card = makeCard({ value: { heal: 10 } });
    const state = makeState({ player: { ...makeState().player, currentHp: 50 } });
    const next = resolveCard(state, card);
    expect(next.player.currentHp).toBe(60);
  });
});

describe('resolveCard - sacrifice_hp', () => {
  it('reduces player hp', () => {
    const card = makeCard({ value: { sacrifice_hp: 3 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.player.currentHp).toBe(69); // 72 - 3
  });
});

describe('resolveCard - silence', () => {
  it('sets boss silence_reduction', () => {
    const card = makeCard({ value: { silence_reduction: 50 } });
    const state = makeState();
    const next = resolveCard(state, card);
    expect(next.boss.silenceReduction).toBe(50);
  });
});

describe('resolveCard - draw', () => {
  it('draws cards (not repeated by repeat field)', () => {
    const deck = [makeCard({ id: 'a' }), makeCard({ id: 'b' }), makeCard({ id: 'c' })];
    const card = makeCard({ value: { draw: 2, repeat: 3 } });
    const state = makeState({ deck });
    const next = resolveCard(state, card);
    // draw=2 happens once, not 3 times
    expect(next.hand.length).toBe(2);
  });
});

describe('resolveCard - relic', () => {
  it('relic card registers buff and does not go to discard', () => {
    const relic = makeCard({
      card_type: '遗物',
      value: { armor: 2, armor_per_turn: 3 },
    });
    const state = makeState();
    const next = resolveCard(state, relic);
    expect(next.player.relics.length).toBe(1);
    expect(next.player.relics[0].armor_per_turn).toBe(3);
    // Relic should not be in discard
    expect(next.discard.length).toBe(0);
  });

  it('cannot exceed 3 relics', () => {
    const relic = makeCard({ id: 'r', card_type: '遗物', value: { armor_per_turn: 1 } });
    const existingRelics = [
      { cardId: '1', cardName: 'a', armor_per_turn: 1, damage_per_turn: 0, draw_per_turn: 0 },
      { cardId: '2', cardName: 'b', armor_per_turn: 1, damage_per_turn: 0, draw_per_turn: 0 },
      { cardId: '3', cardName: 'c', armor_per_turn: 1, damage_per_turn: 0, draw_per_turn: 0 },
    ];
    const state = makeState({ player: { ...makeState().player, relics: existingRelics } });
    const next = resolveCard(state, relic);
    expect(next.player.relics.length).toBe(3); // no new relic added
  });
});

// ============================================================
// triggerRelicPassives
// ============================================================

describe('triggerRelicPassives', () => {
  it('triggers armor_per_turn', () => {
    const state = makeState({
      player: {
        ...makeState().player,
        relics: [{ cardId: '1', cardName: '护符', armor_per_turn: 3, damage_per_turn: 0, draw_per_turn: 0 }],
      },
    });
    const next = triggerRelicPassives(state);
    expect(next.player.armor).toBe(3);
  });

  it('triggers damage_per_turn on boss', () => {
    const state = makeState({
      player: {
        ...makeState().player,
        relics: [{ cardId: '1', cardName: '毒刺', armor_per_turn: 0, damage_per_turn: 5, draw_per_turn: 0 }],
      },
    });
    const next = triggerRelicPassives(state);
    expect(next.boss.currentHp).toBe(95);
  });

  it('triggers draw_per_turn', () => {
    const deck = [makeCard({ id: 'x' }), makeCard({ id: 'y' })];
    const state = makeState({
      deck,
      player: {
        ...makeState().player,
        relics: [{ cardId: '1', cardName: '书卷', armor_per_turn: 0, damage_per_turn: 0, draw_per_turn: 1 }],
      },
    });
    const next = triggerRelicPassives(state);
    expect(next.hand.length).toBe(1);
  });
});

// ============================================================
// executeBossAction / computeBossIntent
// ============================================================

describe('computeBossIntent', () => {
  it('picks first action at index 0', () => {
    const state = makeState({ boss: { ...makeState().boss, actionIndex: 0 } });
    const next = computeBossIntent(state);
    expect(next.boss.currentIntent?.action).toBe('attack');
    expect((next.boss.currentIntent as { value?: number }).value).toBe(20);
  });

  it('picks second action at index 1', () => {
    const state = makeState({ boss: { ...makeState().boss, actionIndex: 1 } });
    const next = computeBossIntent(state);
    expect(next.boss.currentIntent?.action).toBe('multi');
  });

  it('cycles back to first at index 2', () => {
    const state = makeState({ boss: { ...makeState().boss, actionIndex: 2 } });
    const next = computeBossIntent(state);
    expect(next.boss.currentIntent?.action).toBe('attack');
  });
});

describe('executeBossAction', () => {
  it('attack action damages player', () => {
    const state = makeState({
      boss: {
        ...makeState().boss,
        currentIntent: { action: 'attack', value: 20 },
      },
    });
    const next = executeBossAction(state);
    expect(next.player.currentHp).toBe(52); // 72 - 20
  });

  it('silence_reduction reduces boss attack', () => {
    const state = makeState({
      boss: {
        ...makeState().boss,
        currentIntent: { action: 'attack', value: 20 },
        silenceReduction: 50,
      },
    });
    const next = executeBossAction(state);
    expect(next.player.currentHp).toBe(62); // 72 - (20 * 0.5) = 62
    expect(next.boss.silenceReduction).toBe(0); // cleared after action
  });

  it('multi action gives boss armor and damages player', () => {
    const state = makeState({
      boss: {
        ...makeState().boss,
        currentIntent: { action: 'multi', attack: 10, armor: 8 },
      },
    });
    const next = executeBossAction(state);
    expect(next.boss.armor).toBe(8);
    expect(next.player.currentHp).toBe(62); // 72 - 10
  });
});
