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

  let page = null;
  if (state.appPhase === 'SELECT') {
    page = <BossSelect bosses={ALL_BOSSES} onSelect={handleSelectBoss} />;
  } else if (state.appPhase === 'GAME_OVER' && state.battleState) {
    page = <GameOver state={state.battleState} onRestart={handleRestart} />;
  } else if (state.appPhase === 'BATTLE' && state.battleState) {
    page = (
      <BattleField
        state={state.battleState}
        onPlayCard={handlePlayCard}
        onEndTurn={handleEndTurn}
      />
    );
  }

  return (
    <>
      {page}
      <a
        className="github-corner"
        href="https://github.com/grapeot/dota-card-battle"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </a>
    </>
  );
}
