
import React from 'react';
import { Quest } from '../types';

interface QuestLogDisplayProps {
  activeQuests: Record<string, Quest>;
  completedQuests: Record<string, Quest>;
}

const QuestLogDisplay: React.FC<QuestLogDisplayProps> = ({ activeQuests, completedQuests }) => {
  const activeQuestArray = Object.values(activeQuests);
  const completedQuestArray = Object.values(completedQuests);

  return (
    <div className="p-3 border border-terminal-border rounded h-full bg-opacity-50 bg-black overflow-y-auto custom-scrollbar">
      <h3 className="text-lg font-semibold text-terminal-accent mb-2 border-b border-terminal-border pb-1">Quest Log</h3>
      
      <h4 className="text-md font-semibold text-terminal-cyan mt-2 mb-1">Active Quests</h4>
      {activeQuestArray.length === 0 ? (
        <p className="text-terminal-text text-sm italic">No active quests.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {activeQuestArray.map(quest => (
            <li key={quest.id} className="text-terminal-text">
              <strong>{quest.title}:</strong> {quest.stages[quest.currentStageIndex].description}
            </li>
          ))}
        </ul>
      )}

      <h4 className="text-md font-semibold text-terminal-cyan mt-3 mb-1">Completed Quests</h4>
      {completedQuestArray.length === 0 ? (
        <p className="text-terminal-text text-sm italic">No completed quests yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {completedQuestArray.map(quest => (
            <li key={quest.id} className="text-terminal-text opacity-70">
              <strong>{quest.title}</strong> (Completed)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuestLogDisplay;
