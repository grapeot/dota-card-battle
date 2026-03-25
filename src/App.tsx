import { useReducer, useCallback } from 'react';
import type { Boss, GamePhase, BattleState, BattleAction } from './engine/types';
import { startBattle, battleReducer } from './engine/battleEngine';
import { ALL_CARDS, ALL_BOSSES } from './data/loader';
import { BossSelect } from './components/BossSelect';
import { BattleField } from './components/BattleField';
import { GameOver } from './components/GameOver';
import './styles/global.css';

type AppPhase = 'SELECT' | 'BATTLE' | 'GAME_OVER';

interface AppState {
  appPhase: AppPhase;
  battleState: BattleState | null;
}

const TERMINAL_PHASES: GamePhase[] = ['PLAYER_DEAD', 'ENEMY_DEAD', 'TURN_LIMIT_REACHED'];

type AppAction =
  | { type: 'SELECT_BOSS'; boss: Boss }
  | { type: 'BATTLE_ACTION'; action: BattleAction }
  | { type: 'RESTART' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_BOSS': {
      const battleState = startBattle(action.boss, ALL_CARDS);
      return { appPhase: 'BATTLE', battleState };
    }
    case 'BATTLE_ACTION': {
      if (!state.battleState) return state;
      const next = battleReducer(state.battleState, action.action);
      const appPhase = TERMINAL_PHASES.includes(next.phase) ? 'GAME_OVER' : 'BATTLE';
      return { appPhase, battleState: next };
    }
    case 'RESTART': {
      return { appPhase: 'SELECT', battleState: null };
    }
    default:
      return state;
  }
}

const INITIAL_STATE: AppState = { appPhase: 'SELECT', battleState: null };

export default function App() {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  const handleSelectBoss = useCallback((boss: Boss) => {
    dispatch({ type: 'SELECT_BOSS', boss });
  }, []);

  const handlePlayCard = useCallback((cardId: string) => {
    dispatch({ type: 'BATTLE_ACTION', action: { type: 'PLAY_CARD', cardId } });
  }, []);

  const handleEndTurn = useCallback(() => {
    dispatch({ type: 'BATTLE_ACTION', action: { type: 'END_TURN' } });
  }, []);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  if (state.appPhase === 'SELECT') {
    return <BossSelect bosses={ALL_BOSSES} onSelect={handleSelectBoss} />;
  }

  if (state.appPhase === 'GAME_OVER' && state.battleState) {
    return <GameOver state={state.battleState} onRestart={handleRestart} />;
  }

  if (state.appPhase === 'BATTLE' && state.battleState) {
    return (
      <BattleField
        state={state.battleState}
        onPlayCard={handlePlayCard}
        onEndTurn={handleEndTurn}
      />
    );
  }

  return null;
}
