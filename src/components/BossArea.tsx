import React from 'react';
import type { BossState } from '../engine/types';

interface BossAreaProps {
  boss: BossState;
  silenceReduction: number;
}

const BOSS_PORTRAITS: Record<string, string> = {
  forest_troll: '/assets/boss_portraits/forest_troll_0.jpg',
  shadow_warden: '/assets/boss_portraits/shadow_warden_0.jpg',
  ancient_wyrm: '/assets/boss_portraits/ancient_wyrm_0.jpg',
};

const BOSS_BACKGROUNDS: Record<string, string> = {
  forest_troll: '/assets/backgrounds/battlefield_forest_0.jpg',
  shadow_warden: '/assets/backgrounds/battlefield_fortress_0.jpg',
  ancient_wyrm: '/assets/backgrounds/battlefield_cavern_0.jpg',
};

function getIntentIcon(boss: BossState): string {
  const intent = boss.currentIntent;
  if (!intent) return '';
  if (intent.action === 'attack') return '\u2694\uFE0F'; // swords
  if (intent.action === 'armor') return '\uD83D\uDEE1\uFE0F'; // shield
  if (intent.action === 'multi') return '\u2694\uFE0F\uD83D\uDEE1\uFE0F'; // both
  return '';
}

function formatIntent(boss: BossState): string {
  const intent = boss.currentIntent;
  if (!intent) return '...';
  const silenceMult = (100 - boss.silenceReduction) / 100;

  if (intent.action === 'attack') {
    const val = Math.round((intent.value ?? 0) * silenceMult);
    return `${val}`;
  }
  if (intent.action === 'armor') {
    const val = Math.round((intent.value ?? 0) * silenceMult);
    return `${val}`;
  }
  if (intent.action === 'multi') {
    const atk = Math.round((intent.attack ?? 0) * silenceMult);
    const arm = Math.round((intent.armor ?? 0) * silenceMult);
    return `${atk} + ${arm}`;
  }
  return '...';
}

function intentLabel(boss: BossState): string {
  const intent = boss.currentIntent;
  if (!intent) return '待机';
  if (intent.action === 'attack') return '攻击';
  if (intent.action === 'armor') return '蓄甲';
  if (intent.action === 'multi') return '攻击 + 蓄甲';
  return '待机';
}

export { BOSS_BACKGROUNDS };

export const BossArea: React.FC<BossAreaProps> = ({ boss }) => {
  const hpPct = Math.max(0, (boss.currentHp / boss.maxHp) * 100);
  const isLowHp = hpPct < 30;
  const portrait = BOSS_PORTRAITS[boss.boss.id];

  return (
    <div className={`boss-area ${isLowHp ? 'boss-low-hp' : ''}`}>
      <div className="boss-portrait-container">
        {portrait && (
          <img className="boss-portrait" src={portrait} alt={boss.boss.name}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
        )}
        {!portrait && (
          <div className="boss-portrait-fallback">{boss.boss.name[0]}</div>
        )}
      </div>

      <div className="boss-info-column">
        <div className="boss-name-row">
          <span className="boss-name">{boss.boss.name}</span>
          <span className={`boss-difficulty-tag ${boss.boss.difficulty}`}>
            {boss.boss.difficulty === 'easy' ? '简单' : boss.boss.difficulty === 'medium' ? '普通' : '困难'}
          </span>
        </div>

        <div className="boss-hp-block">
          <div className="hp-bar-track">
            <div
              className={`hp-bar-fill boss-hp ${isLowHp ? 'hp-critical' : ''}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <div className="hp-text">
            {boss.currentHp} / {boss.maxHp}
            {boss.armor > 0 && <span className="boss-armor-inline"> | \uD83D\uDEE1 {boss.armor}</span>}
          </div>
        </div>
      </div>

      <div className="boss-intent-block">
        <div className="boss-intent-label">意图</div>
        <div className="boss-intent-icon">{getIntentIcon(boss)}</div>
        <div className="boss-intent-value">{formatIntent(boss)}</div>
        <div className="boss-intent-type">{intentLabel(boss)}</div>
        {boss.silenceReduction > 0 && (
          <div className="boss-silence-tag">沉默 -{boss.silenceReduction}%</div>
        )}
      </div>
    </div>
  );
};
