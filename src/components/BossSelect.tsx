import React, { useState, useEffect } from 'react';
import type { Boss } from '../engine/types';

interface BossSelectProps {
  bosses: Boss[];
  onSelect: (boss: Boss) => void;
}

const difficultyLabel: Record<string, string> = {
  easy: '简单',
  medium: '普通',
  hard: '困难',
};

function describeIntent(boss: Boss): string {
  const seq = boss.behavior.sequence;
  const parts = seq.map(step => {
    if (step.action === 'attack') return `攻击 ${step.value}`;
    if (step.action === 'multi') return `攻击 ${step.attack} + 护甲 ${step.armor}`;
    if (step.action === 'armor') return `护甲 ${step.value}`;
    return '';
  });
  return parts.join(' → ');
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export const BossSelect: React.FC<BossSelectProps> = ({ bosses, onSelect }) => {
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="boss-select-page">
      <h1>远古战场</h1>
      <p className="subtitle">选择你的对手，开始战斗</p>

      {isMobile && !dismissed && (
        <div className="mobile-notice">
          <p>本游戏针对桌面浏览器设计，建议在电脑上打开以获得最佳体验。</p>
          <button className="mobile-notice-btn" onClick={() => setDismissed(true)}>
            继续使用手机
          </button>
        </div>
      )}
      <div className="boss-cards-grid">
        {bosses.map(boss => (
          <div key={boss.id} className={`boss-card ${boss.difficulty}`}>
            <div className="boss-card-name">{boss.name}</div>
            <div className="boss-card-difficulty">{difficultyLabel[boss.difficulty] ?? boss.difficulty}</div>
            <div className="boss-card-hp">HP: {boss.hp}</div>
            <div className="boss-card-desc">
              <strong>行动模式：</strong>
              <br />
              {describeIntent(boss)}
            </div>
            <button
              className="boss-card-btn"
              onClick={() => onSelect(boss)}
            >
              迎战
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
