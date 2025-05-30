
import React, { useState, useEffect } from 'react';
import { DialogueChoice, AIInteractionState } from '../types';

interface InputAreaProps {
  onCommandSubmit: (command: string) => void;
  dialogueChoices?: DialogueChoice[];
  onDialogueChoice: (choiceIndex: number) => void;
  isCombatActive: boolean;
  playerName: string;
  isAiProcessing: boolean;
  aiInteraction: AIInteractionState;
  disabled?: boolean; // Added disabled prop
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onCommandSubmit, 
  dialogueChoices, 
  onDialogueChoice, 
  isCombatActive, 
  playerName,
  isAiProcessing,
  aiInteraction,
  disabled // Destructure the new prop
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isAiProcessing && aiInteraction.type === 'none') {
      // Input clear can be managed by handleSubmit or specifically if needed
    }
  }, [isAiProcessing, aiInteraction.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isAiProcessing && !disabled) {
      onCommandSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  let placeholderText = isCombatActive ? "Attack, use potion..." : "Type your command...";
  if (disabled) {
    placeholderText = "Game is over.";
  } else if (isAiProcessing) {
    placeholderText = "AI is processing...";
  } else if (aiInteraction.pendingPlayerInput) {
    // Generic placeholder if AI is waiting for clarification
    placeholderText = "AI is waiting for your response...";
  }


  if (dialogueChoices && dialogueChoices.length > 0 && aiInteraction.type !== 'pending_ai_clarification') { // Traditional dialogue choices
    return (
      <div className="p-4 border-t border-terminal-border">
        <p className="mb-2 text-terminal-cyan">Choose an option:</p>
        {dialogueChoices.map((choice, index) => (
          <button
            key={index}
            onClick={() => onDialogueChoice(index)}
            disabled={isAiProcessing || disabled} // Use disabled prop
            className="block w-full text-left p-2 mb-1 bg-terminal-border hover:bg-terminal-accent hover:text-terminal-bg rounded transition-colors duration-150 disabled:opacity-50"
          >
            {index + 1}. {choice.text}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-terminal-border">
      <div className="flex items-center">
        <span className="text-terminal-green mr-2">
          {isCombatActive ? `${playerName} (Combat)` : playerName}&gt;
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow bg-transparent border-b border-terminal-accent focus:outline-none focus:border-terminal-blue text-terminal-text p-1 disabled:opacity-70"
          placeholder={placeholderText}
          autoFocus
          disabled={isAiProcessing || disabled} // Use disabled prop
        />
         <button 
            type="submit" 
            className="ml-2 px-4 py-1 bg-terminal-accent text-terminal-bg rounded hover:bg-terminal-yellow transition-colors disabled:opacity-50"
            disabled={isAiProcessing || disabled} // Use disabled prop
        >
          Send
        </button>
      </div>
      {isAiProcessing && !disabled && <p className="text-xs text-terminal-cyan mt-1 animate-pulse">AI is processing your request...</p>}
    </form>
  );
};

export default InputArea;
