import React, { useState } from 'react';
import type { BattleState } from '../engine/types';
import { getAiAdvice } from '../engine/aiAdvisor';
import type { AiAdvice } from '../engine/aiAdvisor';

interface AiAdvisorProps {
  state: BattleState;
  onHighlightCard: (cardId: string | null) => void;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ state, onHighlightCard }) => {
  const [expanded, setExpanded] = useState(true);

  if (state.phase !== 'PLAYER_ACTION') {
    return null;
  }

  const advice: AiAdvice = getAiAdvice(state);

  const strategyLabel: Record<string, string> = {
    offense: '⚔ 进攻',
    defense: '🛡 防御',
    relic: '💎 遗物',
    end_turn: '⏭ 结束',
  };

  const strategyColor: Record<string, string> = {
    offense: '#e53e3e',
    defense: '#3182ce',
    relic: '#d4af37',
    end_turn: '#718096',
  };

  return (
    <div className="ai-advisor">
      <div
        className="ai-advisor-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="ai-advisor-title">AI 建议</span>
        <span
          className="ai-advisor-strategy"
          style={{ color: strategyColor[advice.strategy] }}
        >
          {strategyLabel[advice.strategy]}
        </span>
        <span className="ai-advisor-toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="ai-advisor-body">
          <div className="ai-advisor-reasoning">{advice.reasoning}</div>

          {advice.cardRankings.length > 0 && (
            <div className="ai-advisor-rankings">
              <div className="ai-advisor-rankings-title">出牌优先级：</div>
              {advice.cardRankings.slice(0, 5).map((r, i) => (
                <div
                  key={r.cardId}
                  className={`ai-rank-item ${r.cardId === advice.recommendedCardId ? 'ai-rank-recommended' : ''}`}
                  onMouseEnter={() => onHighlightCard(r.cardId)}
                  onMouseLeave={() => onHighlightCard(null)}
                >
                  <span className="ai-rank-num">{i + 1}.</span>
                  <span className="ai-rank-name">{r.cardName}</span>
                  <span className="ai-rank-reason">{r.reason}</span>
                  <span className="ai-rank-score">{r.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
