import type { BattleState, Card, RelicBuff } from './types';

// ============================================================
// Card effect resolution
// ============================================================

/**
 * Resolves all effects of a played card and returns the updated state + log entries.
 */
export function resolveCard(state: BattleState, card: Card): BattleState {
  let s = { ...state };
  const logs: string[] = [];

  const repeat = card.value.repeat ?? 1;

  // -- Sacrifice HP (once, before repeat loop) --
  if (card.value.sacrifice_hp) {
    s = damagePlayer(s, card.value.sacrifice_hp);
    logs.push(`${card.name} 献祭: 失去 ${card.value.sacrifice_hp} 点生命`);
  }

  for (let i = 0; i < repeat; i++) {
    // -- Damage to boss --
    if (card.value.damage) {
      s = dealDamageToBoss(s, card.value.damage);
      logs.push(`${card.name}: 对敌方造成 ${card.value.damage} 点伤害`);
    }

    // -- Bonus damage (召唤关键词) --
    if (card.value.bonus_damage) {
      s = dealDamageToBoss(s, card.value.bonus_damage);
      logs.push(`${card.name} 召唤: 额外造成 ${card.value.bonus_damage} 点伤害`);
    }

    // -- Armor for player --
    if (card.value.armor) {
      s = givePlayerArmor(s, card.value.armor);
      logs.push(`${card.name}: 获得 ${card.value.armor} 点护甲`);
    }

    // -- Bonus armor (召唤关键词) --
    if (card.value.bonus_armor) {
      s = givePlayerArmor(s, card.value.bonus_armor);
      logs.push(`${card.name} 召唤: 额外获得 ${card.value.bonus_armor} 点护甲`);
    }

    // -- Heal player --
    if (card.value.heal) {
      s = healPlayer(s, card.value.heal);
      logs.push(`${card.name}: 恢复 ${card.value.heal} 点生命`);
    }
  }

  // -- Draw cards (only once, not repeated) --
  if (card.value.draw) {
    s = drawCards(s, card.value.draw);
    logs.push(`${card.name}: 抽 ${card.value.draw} 张牌`);
  }

  // -- Silence (only once) --
  if (card.value.silence_reduction) {
    s = {
      ...s,
      boss: { ...s.boss, silenceReduction: card.value.silence_reduction },
    };
    logs.push(`${card.name}: 敌方下回合意图效果降低 ${card.value.silence_reduction}%`);
  }

  // -- Relic passive registration (遗物 cards) --
  if (card.card_type === '遗物') {
    s = registerRelic(s, card);
    logs.push(`遗物 [${card.name}] 已激活`);
  }

  // Move card to discard (relics don't go to discard pile)
  if (card.card_type !== '遗物') {
    s = { ...s, discard: [...s.discard, card] };
  }

  s = { ...s, log: [...s.log, ...logs], cardsPlayed: s.cardsPlayed + 1 };
  return s;
}

// ============================================================
// Relic passive trigger (called at RELIC_PASSIVE phase)
// ============================================================

export function triggerRelicPassives(state: BattleState): BattleState {
  let s = { ...state };
  const logs: string[] = [];

  for (const relic of s.player.relics) {
    if (relic.armor_per_turn > 0) {
      s = givePlayerArmor(s, relic.armor_per_turn);
      logs.push(`遗物 [${relic.cardName}]: 获得 ${relic.armor_per_turn} 点护甲`);
    }
    if (relic.damage_per_turn > 0) {
      s = dealDamageToBoss(s, relic.damage_per_turn);
      logs.push(`遗物 [${relic.cardName}]: 对敌方造成 ${relic.damage_per_turn} 点伤害`);
    }
    if (relic.draw_per_turn > 0) {
      s = drawCards(s, relic.draw_per_turn);
      logs.push(`遗物 [${relic.cardName}]: 额外抽 ${relic.draw_per_turn} 张牌`);
    }
  }

  if (logs.length > 0) {
    s = { ...s, log: [...s.log, ...logs] };
  }
  return s;
}

// ============================================================
// Boss action execution
// ============================================================

export function executeBossAction(state: BattleState): BattleState {
  let s = { ...state };
  const intent = s.boss.currentIntent;
  if (!intent) return s;

  const silenceMult = (100 - s.boss.silenceReduction) / 100;
  const logs: string[] = [];

  if (intent.action === 'attack') {
    const rawDamage = intent.value ?? 0;
    const effectiveDamage = Math.round(rawDamage * silenceMult);
    s = damagePlayer(s, effectiveDamage);
    logs.push(`${s.boss.boss.name} 攻击: 造成 ${effectiveDamage} 点伤害`);
  } else if (intent.action === 'armor') {
    const rawArmor = intent.value ?? 0;
    const effectiveArmor = Math.round(rawArmor * silenceMult);
    s = {
      ...s,
      boss: { ...s.boss, armor: s.boss.armor + effectiveArmor },
    };
    logs.push(`${s.boss.boss.name} 蓄甲: 获得 ${effectiveArmor} 点护甲`);
  } else if (intent.action === 'multi') {
    const rawAtk = intent.attack ?? 0;
    const rawArm = intent.armor ?? 0;
    const effectiveAtk = Math.round(rawAtk * silenceMult);
    const effectiveArm = Math.round(rawArm * silenceMult);

    if (effectiveArm > 0) {
      s = {
        ...s,
        boss: { ...s.boss, armor: s.boss.armor + effectiveArm },
      };
      logs.push(`${s.boss.boss.name} 蓄甲: 获得 ${effectiveArm} 点护甲`);
    }
    if (effectiveAtk > 0) {
      s = damagePlayer(s, effectiveAtk);
      logs.push(`${s.boss.boss.name} 攻击: 造成 ${effectiveAtk} 点伤害`);
    }
  }

  // Clear silence after boss acts
  s = { ...s, boss: { ...s.boss, silenceReduction: 0 } };
  s = { ...s, log: [...s.log, ...logs] };
  return s;
}

// ============================================================
// Helper: compute next boss intent
// ============================================================

export function computeBossIntent(state: BattleState): BattleState {
  const boss = state.boss.boss;
  const sequence = boss.behavior.sequence;
  const idx = state.boss.actionIndex % sequence.length;
  const intent = sequence[idx];
  return {
    ...state,
    boss: { ...state.boss, currentIntent: intent },
  };
}

// ============================================================
// Primitive helpers
// ============================================================

export function dealDamageToBoss(state: BattleState, amount: number): BattleState {
  let { armor, currentHp } = state.boss;
  if (armor >= amount) {
    armor -= amount;
  } else {
    currentHp -= amount - armor;
    armor = 0;
  }
  currentHp = Math.max(0, currentHp);
  return { ...state, boss: { ...state.boss, armor, currentHp } };
}

export function givePlayerArmor(state: BattleState, amount: number): BattleState {
  return {
    ...state,
    player: { ...state.player, armor: state.player.armor + amount },
  };
}

export function healPlayer(state: BattleState, amount: number): BattleState {
  const newHp = Math.min(state.player.currentHp + amount, state.player.maxHp);
  return { ...state, player: { ...state.player, currentHp: newHp } };
}

export function damagePlayer(state: BattleState, amount: number): BattleState {
  let { armor, currentHp } = state.player;
  if (armor >= amount) {
    armor -= amount;
  } else {
    currentHp -= amount - armor;
    armor = 0;
  }
  currentHp = Math.max(0, currentHp);
  return { ...state, player: { ...state.player, armor, currentHp } };
}

export function drawCards(state: BattleState, count: number): BattleState {
  let deck = [...state.deck];
  let discard = [...state.discard];
  let hand = [...state.hand];
  const logs: string[] = [];

  for (let i = 0; i < count; i++) {
    if (hand.length >= 10) break; // hand limit
    if (deck.length === 0) {
      if (discard.length === 0) break;
      // Shuffle discard into deck
      deck = shuffle([...discard]);
      discard = [];
      logs.push('弃牌堆洗入牌组');
    }
    const [drawn, ...rest] = deck;
    deck = rest;
    hand = [...hand, drawn];
  }

  return {
    ...state,
    deck,
    discard,
    hand,
    log: logs.length > 0 ? [...state.log, ...logs] : state.log,
  };
}

function registerRelic(state: BattleState, card: Card): BattleState {
  if (state.player.relics.length >= 3) {
    return {
      ...state,
      log: [...state.log, `遗物槽已满，无法再激活遗物`],
    };
  }
  const relic: RelicBuff = {
    cardId: card.id,
    cardName: card.name,
    armor_per_turn: card.value.armor_per_turn ?? 0,
    damage_per_turn: card.value.damage_per_turn ?? 0,
    draw_per_turn: card.value.draw_per_turn ?? 0,
  };
  return {
    ...state,
    player: { ...state.player, relics: [...state.player.relics, relic] },
  };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
