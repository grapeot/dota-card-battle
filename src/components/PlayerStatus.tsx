import React from 'react';
import type { PlayerState } from '../engine/types';

interface PlayerStatusProps {
  player: PlayerState;
  manaLeft: number;
  manaMax: number;
  turn: number;
  deckCount: number;
  discardCount: number;
}

export const PlayerStatus: React.FC<PlayerStatusProps> = ({
  player,
  manaLeft,
  manaMax,
  turn,
  deckCount,
  discardCount,
}) => {
  const hpPct = Math.max(0, (player.currentHp / player.maxHp) * 100);

  return (
    <div className="player-status">
      <div className="player-hp-block">
        <div className="hp-label">
          <span className="icon-heart" /> HP {player.currentHp} / {player.maxHp}
        </div>
        <div className="hp-bar-track">
          <div
            className="hp-bar-fill player-hp"
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {player.armor > 0 && (
        <div className="player-armor-block">
          <span className="icon-shield" />
          {player.armor}
        </div>
      )}

      <div className="mana-block">
        <div className="mana-orb">{manaLeft}</div>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>费用</div>
          <div style={{ fontSize: '0.85rem' }}>{manaLeft} / {manaMax}</div>
        </div>
      </div>

      {player.relics.length > 0 && (
        <div className="relics-block">
          {player.relics.map(relic => (
            <span key={relic.cardId} className="relic-chip" title={`遗物: ${relic.cardName}`}>
              <span className="icon-gem" />
              {relic.cardName}
            </span>
          ))}
        </div>
      )}

      <div className="turn-info">
        回合 {turn} &nbsp;|&nbsp; 牌组 {deckCount} &nbsp;|&nbsp; 弃牌 {discardCount}
      </div>
    </div>
  );
};
