import React, { useState } from 'react';
import type { Card } from '../engine/types';
import { CardView } from './CardView';
import { CardPreview } from './CardPreview';

interface HandAreaProps {
  hand: Card[];
  manaLeft: number;
  onPlayCard: (cardId: string) => void;
  highlightedCardId?: string | null;
}

export const HandArea: React.FC<HandAreaProps> = ({ hand, manaLeft, onPlayCard, highlightedCardId }) => {
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const count = hand.length;

  // Fan layout: each card gets a rotation and vertical offset
  const maxRotation = Math.min(count * 2.5, 20); // total fan spread in degrees
  const arcHeight = Math.min(count * 4, 30); // max vertical arc in px

  return (
    <div className="hand-area-wrapper">
      <div className="hand-area-fan">
        {count === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 'auto' }}>
            手牌已空
          </div>
        )}
        {hand.map((card, idx) => {
          const centerOffset = idx - (count - 1) / 2; // -N/2 to +N/2
          const rotation = count > 1 ? (centerOffset / ((count - 1) / 2)) * maxRotation : 0;
          const yOffset = count > 1 ? Math.abs(centerOffset) * (arcHeight / ((count - 1) / 2)) : 0;

          return (
            <div
              key={`${card.id}-${idx}`}
              className="hand-card-slot"
              style={{
                transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                zIndex: idx,
              }}
              onMouseEnter={() => setPreviewCard(card)}
              onMouseLeave={() => setPreviewCard(null)}
            >
              <CardView
                card={card}
                disabled={card.cost > manaLeft}
                highlighted={card.id === highlightedCardId}
                onClick={() => onPlayCard(card.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Gap D: Card detail preview */}
      {previewCard && <CardPreview card={previewCard} />}
    </div>
  );
};
