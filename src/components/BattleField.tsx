import React, { useState, useCallback } from 'react';
import type { BattleState } from '../engine/types';
import { BossArea, BOSS_BACKGROUNDS } from './BossArea';
import { PlayerStatus } from './PlayerStatus';
import { HandArea } from './HandArea';
import { BattleLog } from './BattleLog';
import { AiAdvisor } from './AiAdvisor';
import { DamageFloat } from './DamageFloat';

interface BattleFieldProps {
  state: BattleState;
  onPlayCard: (cardId: string) => void;
  onEndTurn: () => void;
}

export const BattleField: React.FC<BattleFieldProps> = ({
  state,
  onPlayCard,
  onEndTurn,
}) => {
  const isPlayerTurn = state.phase === 'PLAYER_ACTION';
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const [floats, setFloats] = useState<{ id: number; text: string; type: string }[]>([]);
  const floatIdRef = React.useRef(0);

  const bgImage = BOSS_BACKGROUNDS[state.boss.boss.id];

  const handlePlayCard = useCallback((cardId: string) => {
    // Find the card to show damage float
    const card = state.hand.find(c => c.id === cardId);
    if (card) {
      const v = card.value;
      const repeat = v.repeat ?? 1;
      const dmg = ((v.damage ?? 0) + (v.bonus_damage ?? 0)) * repeat;
      const armor = (v.armor ?? 0) + (v.bonus_armor ?? 0);
      const heal = (v.heal ?? 0) * repeat;
      const sacrifice = v.sacrifice_hp ?? 0;

      const newFloats: typeof floats = [];
      if (dmg > 0) {
        newFloats.push({ id: ++floatIdRef.current, text: `-${dmg}`, type: 'damage' });
      }
      if (armor > 0) {
        newFloats.push({ id: ++floatIdRef.current, text: `+${armor}`, type: 'armor' });
      }
      if (heal > 0) {
        newFloats.push({ id: ++floatIdRef.current, text: `+${heal}`, type: 'heal' });
      }
      if (sacrifice > 0) {
        newFloats.push({ id: ++floatIdRef.current, text: `-${sacrifice}`, type: 'sacrifice' });
      }
      if (newFloats.length > 0) {
        setFloats(prev => [...prev, ...newFloats]);
      }
    }
    onPlayCard(cardId);
  }, [state.hand, onPlayCard]);

  return (
    <div className="battle-page"
      style={bgImage ? {
        backgroundImage: `linear-gradient(to bottom, rgba(10,15,26,0.7), rgba(10,15,26,0.85)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      <div className="boss-section">
        <BossArea boss={state.boss} silenceReduction={state.boss.silenceReduction} />
        <div className="damage-float-container">
          {floats.map(f => (
            <DamageFloat
              key={f.id}
              text={f.text}
              type={f.type}
              onComplete={() => setFloats(prev => prev.filter(x => x.id !== f.id))}
            />
          ))}
        </div>
      </div>

      <PlayerStatus
        player={state.player}
        manaLeft={state.manaLeft}
        manaMax={state.manaMax}
        turn={state.turn}
        deckCount={state.deck.length}
        discardCount={state.discard.length}
      />

      <div className="battle-main">
        <div className="hand-and-controls">
          <HandArea
            hand={state.hand}
            manaLeft={state.manaLeft}
            onPlayCard={handlePlayCard}
            highlightedCardId={highlightedCard}
          />
          <div className="battle-controls">
            <button
              className="btn-end-turn"
              onClick={onEndTurn}
              disabled={!isPlayerTurn}
            >
              结束回合
            </button>
            <div className="deck-info">
              手牌 {state.hand.length} / 10<br />
              牌组 {state.deck.length} | 弃牌 {state.discard.length}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <AiAdvisor state={state} onHighlightCard={setHighlightedCard} />
          <BattleLog log={state.log} />
        </div>
      </div>
    </div>
  );
};
