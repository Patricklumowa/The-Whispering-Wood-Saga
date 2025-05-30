
import React from 'react';
import { CombatState, Player, BodyPart, CombatEnemy } from '../types';

interface CombatDisplayProps {
  combatState: CombatState | null;
  player: Player;
}

const CombatDisplay: React.FC<CombatDisplayProps> = ({ combatState, player }) => {
  if (!combatState || combatState.activeEnemies.length === 0) return null;

  const activeFoe = combatState.activeEnemies.find(e => e.combatId === combatState.currentAttackingEnemyCombatId);

  const Bar: React.FC<{current: number, max: number, label: string, colorClass: string}> = ({current, max, label, colorClass}) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return (
        <div className="mb-1">
            <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span>{Math.max(0, current)}/{max}</span> 
            </div>
            <div className="w-full bg-terminal-border rounded h-2.5">
                <div className={`${colorClass} h-2.5 rounded`} style={{width: `${Math.max(0, percentage)}%`}}></div>
            </div>
        </div>
    );
  }

  return (
    <div className="p-3 border border-terminal-red rounded bg-red-900 bg-opacity-30">
      <h3 className="text-lg font-semibold text-terminal-red mb-2 border-b border-terminal-red pb-1">COMBAT! (1v1)</h3>
      
      <div>
          <h4 className="text-md text-terminal-green mb-1">{player.name} (Overall)</h4>
          <Bar current={player.health} max={player.maxHealth} label="Health" colorClass="bg-terminal-green" />
      </div>

      {activeFoe && (
        <div className="mt-2 p-2 border border-terminal-accent rounded">
            <h4 className="text-md text-terminal-yellow mb-1">Active Foe: {activeFoe.name}</h4>
            <Bar current={activeFoe.health} max={activeFoe.maxHealth} label="Health" colorClass="bg-terminal-yellow" />
            <div className="text-xs mt-0.5">
                Targeted Parts:
                {Object.entries(activeFoe.bodyParts).map(([part, state]) => (
                   <span key={part} className="ml-1">{part.substring(0,1)}: {state.currentHp}</span>
                ))}
            </div>
        </div>
      )}

      {combatState.waitingEnemies && combatState.waitingEnemies.length > 0 && (
        <div className="mt-2">
            <h5 className="text-sm text-terminal-cyan">Waiting Enemies:</h5>
            <ul className="text-xs text-terminal-text">
                {combatState.waitingEnemies.map(enemy => (
                    <li key={enemy.combatId}>- {enemy.name} (Health: {enemy.health}/{enemy.maxHealth})</li>
                ))}
            </ul>
        </div>
      )}
      
      <div className="mt-2 text-xs text-terminal-red italic h-12 overflow-y-auto custom-scrollbar">
        {combatState.log.slice(-5).map((l, i) => <p key={i}>{l}</p>)}
      </div>
      {combatState.playerTurn && <p className="text-sm text-terminal-green mt-1 animate-pulse">Your turn...</p>}
    </div>
  );
};

export default CombatDisplay;
