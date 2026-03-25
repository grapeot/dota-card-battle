import React, { useEffect, useRef } from 'react';

interface BattleLogProps {
  log: string[];
}

function classifyEntry(entry: string): string {
  if (entry.startsWith('---')) return 'log-entry log-separator';
  if (entry.includes('攻击') && entry.includes('造成')) return 'log-entry log-damage';
  if (entry.includes('护甲')) return 'log-entry log-armor';
  if (entry.includes('恢复') && entry.includes('生命')) return 'log-entry log-heal';
  if (entry.includes('遗物')) return 'log-entry log-relic';
  if (entry.includes('弃牌堆') || entry.includes('洗入')) return 'log-entry log-system';
  return 'log-entry';
}

export const BattleLog: React.FC<BattleLogProps> = ({ log }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [log]);

  return (
    <div className="battle-log">
      <div className="battle-log-title">战斗记录</div>
      <div className="battle-log-entries">
        {log.map((entry, i) => (
          <div key={i} className={classifyEntry(entry)}>
            {entry}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
