import React from 'react';
import type { BattleState } from '../engine/types';

interface GameOverProps {
  state: BattleState;
  onRestart: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ state, onRestart }) => {
  const isWin = state.phase === 'ENEMY_DEAD';
  const isTimeout = state.phase === 'TURN_LIMIT_REACHED';

  let title = '';
  let subtitle = '';

  if (isWin) {
    title = '胜利';
    subtitle = `${state.boss.boss.name} 已被击败！`;
  } else if (isTimeout) {
    title = '超时判负';
    subtitle = '战斗超过 30 回合，判定失败。';
  } else {
    title = '战败';
    subtitle = '你的生命值归零了。';
  }

  return (
    <div className="game-over-page">
      <div className={`game-over-title ${isWin ? 'win' : 'lose'}`}>{title}</div>
      <div className="game-over-subtitle">{subtitle}</div>

      <div className="battle-stats">
        <h3>战斗统计</h3>
        <div className="stat-row">
          <span className="stat-label">对手</span>
          <span className="stat-value">{state.boss.boss.name}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">总回合数</span>
          <span className="stat-value">{state.turn}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">打出的卡牌数</span>
          <span className="stat-value">{state.cardsPlayed}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">剩余生命</span>
          <span className="stat-value" style={{ color: isWin ? '#38a169' : '#e53e3e' }}>
            {state.player.currentHp} / {state.player.maxHp}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Boss 剩余 HP</span>
          <span className="stat-value">{state.boss.currentHp} / {state.boss.maxHp}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">激活遗物数</span>
          <span className="stat-value">{state.player.relics.length}</span>
        </div>
      </div>

      <button className="btn-restart" onClick={onRestart}>
        重新开始
      </button>
    </div>
  );
};
