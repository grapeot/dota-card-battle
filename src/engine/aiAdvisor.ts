import type { Card, BattleState, BossAction } from './types';

export interface AiAdvice {
  recommendedCardId: string | null;
  reasoning: string;
  strategy: 'offense' | 'defense' | 'relic' | 'end_turn';
  cardRankings: { cardId: string; cardName: string; score: number; reason: string }[];
}

function getBossIntentDamage(intent: BossAction | null, silenceReduction: number): number {
  if (!intent) return 0;
  let dmg = 0;
  if (intent.action === 'attack') dmg = intent.value ?? 0;
  if (intent.action === 'multi') dmg = intent.attack ?? 0;
  return Math.floor(dmg * (1 - silenceReduction / 100));
}

function cardTotalValue(card: Card): number {
  const v = card.value;
  const repeat = v.repeat ?? 1;
  const dmg = ((v.damage ?? 0) + (v.bonus_damage ?? 0)) * repeat;
  const armor = (v.armor ?? 0) + (v.bonus_armor ?? 0);
  const heal = (v.heal ?? 0) * repeat;
  const sacrificePenalty = (v.sacrifice_hp ?? 0) * -0.5;
  const silenceBonus = (v.silence_reduction ?? 0) * 0.1;
  let total = dmg + armor + heal + sacrificePenalty + silenceBonus;
  if (card.cost >= 4) total *= 1.15;
  return total;
}

function cardDefenseValue(card: Card): number {
  const v = card.value;
  return (v.armor ?? 0) + (v.bonus_armor ?? 0);
}

function isDefenseCard(card: Card): boolean {
  return cardDefenseValue(card) > 0;
}

function isRelicCard(card: Card): boolean {
  return card.card_type === '遗物';
}

export function getAiAdvice(state: BattleState): AiAdvice {
  const { hand, manaLeft, player, boss } = state;

  const intentDmg = getBossIntentDamage(boss.currentIntent, boss.silenceReduction);
  const damageAfterArmor = Math.max(0, intentDmg - player.armor);
  const hpAfterAttack = player.currentHp - damageAfterArmor;
  const inDanger = intentDmg > player.currentHp * 0.5;
  const criticalDanger = hpAfterAttack <= 0;

  const playable = hand.filter(c => c.cost <= manaLeft);

  if (playable.length === 0) {
    return {
      recommendedCardId: null,
      reasoning: '没有可出的牌，建议结束回合。',
      strategy: 'end_turn',
      cardRankings: [],
    };
  }

  // Check relic opportunity
  const relicSlotAvailable = player.relics.length < 3;
  const relicCandidates = playable.filter(c => isRelicCard(c));
  if (relicSlotAvailable && relicCandidates.length > 0) {
    const best = relicCandidates.sort((a, b) => cardTotalValue(b) - cardTotalValue(a))[0];
    return {
      recommendedCardId: best.id,
      reasoning: `遗物栏有空位，优先打出「${best.name}」获取持续增益。`,
      strategy: 'relic',
      cardRankings: buildRankings(playable, 'relic'),
    };
  }

  // Critical danger: must defend
  if (criticalDanger) {
    const defenseCards = playable.filter(c => isDefenseCard(c) && !isRelicCard(c));
    if (defenseCards.length > 0) {
      const best = defenseCards.sort((a, b) => cardDefenseValue(b) - cardDefenseValue(a))[0];
      return {
        recommendedCardId: best.id,
        reasoning: `危险！Boss 意图造成 ${intentDmg} 点伤害，当前护甲 ${player.armor}，不防御会阵亡。优先打出「${best.name}」（+${cardDefenseValue(best)} 护甲）。`,
        strategy: 'defense',
        cardRankings: buildRankings(playable, 'defense'),
      };
    }
  }

  // High threat: suggest defense
  if (inDanger) {
    const defenseCards = playable.filter(c => isDefenseCard(c) && !isRelicCard(c));
    if (defenseCards.length > 0) {
      const best = defenseCards.sort((a, b) => cardDefenseValue(b) - cardDefenseValue(a))[0];
      return {
        recommendedCardId: best.id,
        reasoning: `Boss 意图造成 ${intentDmg} 点伤害（超过血量 50%），建议先防御。推荐「${best.name}」（+${cardDefenseValue(best)} 护甲）。`,
        strategy: 'defense',
        cardRankings: buildRankings(playable, 'defense'),
      };
    }
  }

  // Safe to attack: pick highest value card
  const sorted = playable
    .filter(c => !isRelicCard(c))
    .sort((a, b) => cardTotalValue(b) - cardTotalValue(a));

  if (sorted.length > 0) {
    const best = sorted[0];
    const totalVal = Math.round(cardTotalValue(best));
    return {
      recommendedCardId: best.id,
      reasoning: `Boss 威胁可控（意图 ${intentDmg} 伤害），进攻优先。推荐「${best.name}」（总价值 ${totalVal}）。`,
      strategy: 'offense',
      cardRankings: buildRankings(playable, 'offense'),
    };
  }

  return {
    recommendedCardId: null,
    reasoning: '建议结束回合。',
    strategy: 'end_turn',
    cardRankings: [],
  };
}

function buildRankings(playable: Card[], mode: string): AiAdvice['cardRankings'] {
  return playable
    .filter(c => !isRelicCard(c))
    .map(card => {
      const val = Math.round(cardTotalValue(card));
      const def = cardDefenseValue(card);
      const dmg = ((card.value.damage ?? 0) + (card.value.bonus_damage ?? 0)) * (card.value.repeat ?? 1);
      let reason: string;
      if (mode === 'defense') {
        reason = def > 0 ? `防御 +${def}` : `进攻 ${dmg} 伤害`;
      } else {
        reason = dmg > 0 ? `${dmg} 伤害` : `+${def} 护甲`;
      }
      return { cardId: card.id, cardName: card.name, score: val, reason };
    })
    .sort((a, b) => b.score - a.score);
}
