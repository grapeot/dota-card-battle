import React from 'react';
import type { Card } from '../engine/types';

interface CardPreviewProps {
  card: Card;
}

const FACTION_LABELS: Record<string, string> = {
  '天辉': '天辉阵营',
  '夜魇': '夜魇阵营',
  '中立': '中立势力',
};

export const CardPreview: React.FC<CardPreviewProps> = ({ card }) => {
  const imgSrc = `/assets/card_art/${card.image_file}`;

  return (
    <div className="card-preview-overlay">
      <div className={`card-preview card-rarity-${card.rarity}`}>
        <img className="card-preview-art" src={imgSrc} alt={card.name}
          onError={e => { e.currentTarget.style.display = 'none'; }} />
        <div className="card-preview-body">
          <div className="card-preview-header">
            <span className="card-preview-cost">{card.cost}</span>
            <span className="card-preview-name">{card.name}</span>
            <span className="card-preview-type">{card.card_type}</span>
          </div>
          <div className="card-preview-faction">{FACTION_LABELS[card.faction] || card.faction} · {card.archetype}</div>
          <div className="card-preview-desc">{card.description}</div>
          {card.keywords.length > 0 && (
            <div className="card-preview-keywords">
              {card.keywords.map(kw => (
                <span key={kw} className="card-preview-kw">{kw}</span>
              ))}
            </div>
          )}
          <div className="card-preview-rarity">{card.rarity}</div>
        </div>
      </div>
    </div>
  );
};
