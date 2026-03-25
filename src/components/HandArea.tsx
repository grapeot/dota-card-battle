import React from 'react';
import type { Card } from '../engine/types';
import { CardView } from './CardView';

interface HandAreaProps {
  hand: Card[];
  manaLeft: number;
  onPlayCard: (cardId: string) => void;
  highlightedCardId?: string | null;
}

export const HandArea: React.FC<HandAreaProps> = ({ hand, manaLeft, onPlayCard, highlightedCardId }) => {
  return (
    <div className="hand-area">
      {hand.length === 0 && (
        <div style={{ color: '#718096', fontSize: '0.85rem', margin: 'auto' }}>
          手牌已空
        </div>
      )}
      {hand.map((card, idx) => (
        <CardView
          key={`${card.id}-${idx}`}
          card={card}
          disabled={card.cost > manaLeft}
          highlighted={card.id === highlightedCardId}
          onClick={() => onPlayCard(card.id)}
        />
      ))}
    </div>
  );
};
