
import React, { useEffect, useRef } from 'react';
import { GameState } from '../types';

interface GameDisplayProps {
  messages: GameState['messages'];
}

const GameDisplay: React.FC<GameDisplayProps> = ({ messages }) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const getMessageColor = (type: GameState['messages'][0]['type']) => {
    switch (type) {
      case 'player': return 'text-terminal-green';
      case 'system': return 'text-terminal-cyan';
      case 'error': return 'text-terminal-red';
      case 'combat': return 'text-terminal-yellow';
      case 'quest': return 'text-terminal-purple';
      case 'dialogue': return 'text-terminal-blue';
      case 'ai_assist': return 'text-fuchsia-400'; // A distinct color for AI's direct responses
      case 'level_up': return 'text-yellow-300 font-bold';
      case 'shop': return 'text-lime-400'; // Color for shop transactions
      case 'body_condition': return 'text-orange-400';
      case 'game':
      default:
        return 'text-terminal-text';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 border border-terminal-border rounded bg-opacity-50 bg-black custom-scrollbar">
      {messages.map((msg, index) => (
        <p key={index} className={`mb-1 ${getMessageColor(msg.type)} whitespace-pre-wrap`}>
          {msg.text}
        </p>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default GameDisplay;
