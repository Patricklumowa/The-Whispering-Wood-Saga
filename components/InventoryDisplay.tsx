
import React from 'react';
import { Item } from '../types';

interface InventoryDisplayProps {
  inventory: Item[];
  onItemAction: (command: string, itemName: string) => void;
}

const InventoryDisplay: React.FC<InventoryDisplayProps> = ({ inventory, onItemAction }) => {
  return (
    <div className="p-3 border border-terminal-border rounded h-full bg-opacity-50 bg-black overflow-y-auto custom-scrollbar">
      <h3 className="text-lg font-semibold text-terminal-accent mb-2 border-b border-terminal-border pb-1">Inventory</h3>
      {inventory.length === 0 ? (
        <p className="text-terminal-text text-sm italic">Your inventory is empty.</p>
      ) : (
        <ul className="space-y-1">
          {inventory.map((item, index) => (
            <li key={`${item.id}-${index}`} className="text-sm group">
              <span className="text-terminal-text">{item.name}</span>
              <div className="ml-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                {item.isUsable && (
                  <button 
                    onClick={() => onItemAction('use', item.name)} 
                    className="px-1 py-0.5 text-xs bg-terminal-blue text-terminal-bg rounded hover:bg-opacity-80 mr-1"
                  >
                    Use
                  </button>
                )}
                {item.isEquippable && (
                  <button 
                    onClick={() => onItemAction('equip', item.name)}
                    className="px-1 py-0.5 text-xs bg-terminal-green text-terminal-bg rounded hover:bg-opacity-80 mr-1"
                  >
                    Equip
                  </button>
                )}
                 <button 
                    onClick={() => onItemAction('examine', item.name)}
                    className="px-1 py-0.5 text-xs bg-terminal-cyan text-terminal-bg rounded hover:bg-opacity-80"
                  >
                    Examine
                  </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InventoryDisplay;
