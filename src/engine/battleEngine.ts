import type {
  BattleState,
  BattleAction,
  GamePhase,
  Boss,
  Card,
} from './types';
import {
  resolveCard,
  triggerRelicPassives,
  executeBossAction,
  computeBossIntent,
  drawCards,
  shuffle,
} from './cardEffects';

// ============================================================
// Initial state factory
// ============================================================

export function createInitialBattleState(boss: Boss, allCards: Card[]): BattleState {
  const deck = shuffle([...allCards]);
  const initialState: BattleState = {
    phase: 'TURN_START',
    turn: 1,
    manaMax: 1,
    manaLeft: 1,
    player: {
      currentHp: 72,
      maxHp: 72,
      armor: 0,
      relics: [],
    },
    boss: {
      boss,
      currentHp: boss.hp,
      maxHp: boss.hp,
      armor: 0,
      actionIndex: 0,
      silenceReduction: 0,
      currentIntent: null,
    },
    deck,
    hand: [],
    discard: [],
    log: [`战斗开始！对手：${boss.name}`],
    cardsPlayed: 0,
  };
  return initialState;
}

// ============================================================
// Mana schedule: turn N -> min(N, 5)
// ============================================================

export function manaForTurn(turn: number): number {
  return Math.min(turn, 5);
}

// ============================================================
// Main reducer
// ============================================================

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'SELECT_BOSS': {
      return createInitialBattleState(action.boss, action.allCards);
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'PLAYER_ACTION') return state;
      const cardIndex = state.hand.findIndex(c => c.id === action.cardId);
      if (cardIndex === -1) return state;
      const card = state.hand[cardIndex];

      if (card.cost > state.manaLeft) {
        return { ...state, log: [...state.log, `费用不足，无法出牌`] };
      }

      // Remove card from hand
      const newHand = state.hand.filter((_, i) => i !== cardIndex);
      let s: BattleState = {
        ...state,
        hand: newHand,
        manaLeft: state.manaLeft - card.cost,
      };

      // Resolve card effects
      s = resolveCard(s, card);

      // Check win/lose after card play
      s = checkGameOver(s);

      return s;
    }

    case 'END_TURN': {
      if (state.phase !== 'PLAYER_ACTION') return state;
      return advanceTurn({ ...state, phase: 'PLAYER_END' });
    }

    case 'RESTART': {
      return { ...state, phase: 'BOSS_SELECT' } as BattleState;
    }

    default:
      return state;
  }
}

// ============================================================
// Turn advancement (PLAYER_END -> ENEMY_ACTION -> TURN_SETTLE -> TURN_START)
// ============================================================

function advanceTurn(state: BattleState): BattleState {
  let s = state;

  // ENEMY_ACTION phase
  s = executeBossAction(s);
  s = checkGameOver(s);
  if (isTerminal(s.phase)) return s;

  // TURN_SETTLE: clear both armors, advance boss action index
  s = {
    ...s,
    player: { ...s.player, armor: 0 },
    boss: {
      ...s.boss,
      armor: 0,
      actionIndex: s.boss.actionIndex + 1,
    },
    log: [...s.log, `--- 回合 ${s.turn} 结束 ---`],
  };

  // Check 30-turn limit
  if (s.turn >= 30) {
    return { ...s, phase: 'TURN_LIMIT_REACHED', log: [...s.log, '回合上限 30 回合已达到，判负！'] };
  }

  // TURN_START: advance turn counter, restore mana, draw cards
  const newTurn = s.turn + 1;
  const newManaMax = manaForTurn(newTurn);
  s = {
    ...s,
    phase: 'TURN_START',
    turn: newTurn,
    manaMax: newManaMax,
    manaLeft: newManaMax,
    log: [...s.log, `--- 回合 ${newTurn} 开始 ---`],
  };

  // Draw up to hand limit (draw 5, but don't exceed limit 10)
  const cardsToDraw = Math.min(5, 10 - s.hand.length);
  s = drawCards(s, cardsToDraw);

  // RELIC_PASSIVE phase
  s = triggerRelicPassives(s);

  // SHOW_INTENT: compute boss's next intent
  s = computeBossIntent(s);

  // Ready for player action
  s = { ...s, phase: 'PLAYER_ACTION' };

  return s;
}

// ============================================================
// Game over check
// ============================================================

function checkGameOver(state: BattleState): BattleState {
  if (state.player.currentHp <= 0) {
    return {
      ...state,
      phase: 'PLAYER_DEAD',
      log: [...state.log, '玩家生命值归零，战斗失败！'],
    };
  }
  if (state.boss.currentHp <= 0) {
    return {
      ...state,
      phase: 'ENEMY_DEAD',
      log: [...state.log, `${state.boss.boss.name} 已被击败！胜利！`],
    };
  }
  return state;
}

function isTerminal(phase: GamePhase): boolean {
  return phase === 'PLAYER_DEAD' || phase === 'ENEMY_DEAD' || phase === 'TURN_LIMIT_REACHED';
}

// ============================================================
// Initial game start: used once to transition from BOSS_SELECT
// ============================================================

export function startBattle(boss: Boss, allCards: Card[]): BattleState {
  const state = createInitialBattleState(boss, allCards);

  // Draw initial hand (5 cards)
  let s = drawCards(state, 5);

  // Compute first boss intent
  s = computeBossIntent(s);

  s = { ...s, phase: 'PLAYER_ACTION' };
  return s;
}
