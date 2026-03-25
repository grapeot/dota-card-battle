import React from 'react';
import type { Card } from '../engine/types';

interface CardViewProps {
  card: Card;
  disabled: boolean;
  highlighted?: boolean;
  onClick: () => void;
}

const FACTION_COLORS: Record<string, string> = {
  '天辉': '#4ade80',
  '夜魇': '#dc2626',
  '中立': '#a8875e',
};

export const CardView: React.FC<CardViewProps> = ({ card, disabled, highlighted, onClick }) => {
  const imgSrc = `/assets/card_art/${card.image_file}`;
  const factionColor = FACTION_COLORS[card.faction] || '#4a5568';

  return (
    <div
      className={`card-view card-rarity-${card.rarity} card-type-${card.card_type} ${disabled ? 'card-disabled' : ''} ${highlighted ? 'card-highlighted' : ''}`}
      onClick={disabled ? undefined : onClick}
      title={disabled ? `费用不足 (需要 ${card.cost})` : card.description}
    >
      <div className="card-cost-badge">{card.cost}</div>
      <span className="card-type-badge">{card.card_type}</span>
      <div className="card-inner">
        <img
          className="card-art"
          src={imgSrc}
          alt={card.name}
          onError={e => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const placeholder = target.nextElementSibling as HTMLElement;
            if (placeholder) placeholder.style.display = 'flex';
          }}
        />
        <div className="card-art-placeholder" style={{ display: 'none' }}>
          {card.name}
        </div>
        {/* Faction color strip */}
        <div className="card-faction-strip" style={{ background: factionColor }} />
        <div className="card-info">
          <div className="card-name">{card.name}</div>
          <div className="card-desc">{card.description}</div>
          {card.keywords && card.keywords.length > 0 && (
            <div className="card-keywords">
              {card.keywords.map(kw => (
                <span key={kw} className="card-keyword-tag">{kw}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
