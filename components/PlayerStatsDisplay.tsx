
import React from 'react';
import { Player, BodyPart, BodyPartCondition, EquipSlot, Item } from '../types'; // Added EquipSlot, Item

interface PlayerStatsDisplayProps {
  player: Player;
}

const StatItem: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
  <div className={`flex justify-between text-sm ${className}`}>
    <span className="text-terminal-cyan">{label}:</span>
    <span className="text-terminal-text">{value}</span>
  </div>
);

const getBodyPartColor = (condition: BodyPartCondition) => {
  switch (condition) {
    case BodyPartCondition.HEALTHY: return 'text-terminal-green';
    case BodyPartCondition.BRUISED: return 'text-yellow-400';
    case BodyPartCondition.INJURED: return 'text-terminal-yellow';
    case BodyPartCondition.SEVERELY_INJURED: return 'text-terminal-red';
    case BodyPartCondition.MISSING: return 'text-red-700';
    default: return 'text-terminal-text';
  }
};

const PlayerStatsDisplay: React.FC<PlayerStatsDisplayProps> = ({ player }) => {

  const calculateDisplayAttack = (p: Player): number => {
    let baseAttack = p.Strength * 2 + Math.floor(p.Dexterity / 2);
    const mainHandWeapon = p.equippedItems[EquipSlot.MAIN_HAND];
    if (mainHandWeapon) {
        baseAttack += mainHandWeapon.attackBonus || 0;
    }
    if (p.bodyParts[BodyPart.LEFT_ARM].condition === BodyPartCondition.SEVERELY_INJURED ||
        p.bodyParts[BodyPart.RIGHT_ARM].condition === BodyPartCondition.SEVERELY_INJURED) {
        baseAttack *= 0.7;
    }
    return Math.max(1, Math.floor(baseAttack));
  };

  const calculateDisplayDefense = (p: Player): number => {
    let baseDefense = p.Agility * 1 + Math.floor(p.Constitution / 2);
    Object.values(p.equippedItems).forEach(item => {
        if (item && item.defenseBonus) {
            baseDefense += item.defenseBonus;
        }
    });
     if (p.bodyParts[BodyPart.LEFT_LEG].condition === BodyPartCondition.SEVERELY_INJURED ||
        p.bodyParts[BodyPart.RIGHT_LEG].condition === BodyPartCondition.SEVERELY_INJURED) {
        baseDefense *= 0.7;
    }
    return Math.floor(baseDefense);
  };

  const displayAttack = calculateDisplayAttack(player);
  const displayDefense = calculateDisplayDefense(player);

  return (
    <div className="p-3 border border-terminal-border rounded h-full bg-opacity-50 bg-black overflow-y-auto custom-scrollbar">
      <h3 className="text-lg font-semibold text-terminal-accent mb-2 border-b border-terminal-border pb-1">Player Status</h3>
      <StatItem label="Name" value={player.name} />
      <StatItem label="Level" value={player.level} className="font-semibold" />
      <StatItem label="XP" value={`${player.xp} / ${player.xpToNextLevel}`} />
      <StatItem label="Attribute Pts" value={player.attributePoints} className="font-semibold text-terminal-yellow" />
      <StatItem label="Health (Overall)" value={`${player.health} / ${player.maxHealth}`} />

      <h4 className="text-md font-semibold text-terminal-cyan mt-2 mb-1 border-t border-terminal-border pt-1">Attributes</h4>
      <StatItem label="Strength" value={player.Strength} />
      <StatItem label="Dexterity" value={player.Dexterity} />
      <StatItem label="Constitution" value={player.Constitution} />
      <StatItem label="Intelligence" value={player.Intelligence} />
      <StatItem label="Agility" value={player.Agility} />

      <h4 className="text-md font-semibold text-terminal-cyan mt-2 mb-1 border-t border-terminal-border pt-1">Combat Stats</h4>
      <StatItem label="Attack (Effective)" value={displayAttack} />
      <StatItem label="Defense (Effective)" value={displayDefense} />
      <StatItem 
        label="Power Attack" 
        value={player.powerAttackCooldown > 0 ? `Cooldown: ${player.powerAttackCooldown}t` : 'Ready'} 
        className={player.powerAttackCooldown > 0 ? 'text-terminal-yellow' : 'text-terminal-green'}
      />
      <StatItem label="Gold" value={`${player.gold}g`} />

      <h4 className="text-md font-semibold text-terminal-accent mt-2 mb-1 border-t border-terminal-border pt-1">Equipped</h4>
      <div className="text-xs grid grid-cols-2 gap-x-1">
        {(Object.keys(EquipSlot) as Array<keyof typeof EquipSlot>).map(slotKey => {
          const slot = EquipSlot[slotKey];
          const item = player.equippedItems[slot];
          return (
            <div key={slot}>
              <span className="text-terminal-cyan">{slot.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="text-terminal-text ml-1">{item?.name || 'None'}</span>
            </div>
          );
        })}
      </div>

      <h4 className="text-md font-semibold text-terminal-accent mt-2 mb-1 border-t border-terminal-border pt-1">Body Condition</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 text-xs">
        {Object.entries(player.bodyParts).map(([part, state]) => (
          <div key={part} className={`flex justify-between ${getBodyPartColor(state.condition)}`}>
            <span>{part.replace(/([A-Z])/g, ' $1').trim()}:</span>
            <span>{state.currentHp}/{state.maxHp} ({state.condition.substring(0,3)})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerStatsDisplay;
