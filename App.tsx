
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import Modal from './components/Modal';
import GameDisplay from './components/GameDisplay';
import InputArea from './components/InputArea';
import PlayerStatsDisplay from './components/PlayerStatsDisplay';
import InventoryDisplay from './components/InventoryDisplay';
import QuestLogDisplay from './components/QuestLogDisplay';
import CombatDisplay from './components/CombatDisplay';
import WorldMap from './components/WorldMap';
import { DialogueChoice, GameState } from './types';
import { initializeAiClient, callGemini, getAiClient } from './lib/ai';
import { obfuscateState, deobfuscateCode } from './lib/saveLoadUtils';

const App: React.FC = () => {
  const { gameState, dispatch, processCommand: engineProcessCommand } = useGameEngine();

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const [isSaveCodeModalOpen, setIsSaveCodeModalOpen] = useState(false);
  const [generatedSaveCode, setGeneratedSaveCode] = useState('');
  const [isLoadCodeModalOpen, setIsLoadCodeModalOpen] = useState(false);
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [loadCodeError, setLoadCodeError] = useState<string | null>(null);
  const saveCodeTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Effect 1: AI Initialization Check
  useEffect(() => {
    if (!getAiClient() && !gameState.isGameOver) {
      setIsApiKeyModalOpen(true);
    }
  }, [gameState.isGameOver]);

  const handleApiKeySubmit = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('Please enter an API key.');
      return;
    }
    setApiKeyError(null);
    dispatch({ type: 'SET_AI_PROCESSING', payload: true });

    if (initializeAiClient(apiKeyInput.trim())) {
      const testResponse = await callGemini('test');
      if (testResponse && !testResponse.toLowerCase().startsWith('error:')) {
        setApiKeyInput('');
        setIsApiKeyModalOpen(false);
        dispatch({ type: 'ADD_MESSAGE', message: 'AI Client initialized successfully.', messageType: 'system' });
      } else {
        setApiKeyError(testResponse || 'The provided API key is invalid or could not connect.');
      }
    } else {
      setApiKeyError('Failed to initialize AI client. The key might be malformed.');
    }
    dispatch({ type: 'SET_AI_PROCESSING', payload: false });
  };


  // Effect 2: Player Name Modal Logic
  useEffect(() => {
    if (isApiKeyModalOpen || gameState.isGameOver || gameState.isLoading) {
      setIsNameModalOpen(false);
      return;
    }
    
    const hasSavedPlayerName = gameState.player.name && gameState.player.name !== 'Adventurer' && gameState.player.name !== '';

    if (hasSavedPlayerName) {
      setIsNameModalOpen(false);
      if (!gameStarted) setGameStarted(true);
    } else {
      if ((gameState.player.name === 'Adventurer' || gameState.player.name === '') && getAiClient()) {
        setIsNameModalOpen(true);
      } else { 
        setGameStarted(true);
        setIsNameModalOpen(false);
      }
    }
  }, [isApiKeyModalOpen, gameState.player.name, gameState.isLoading, gameStarted, gameState.isGameOver]);


  const handleNameSubmit = () => {
    if (playerNameInput.trim()) {
      dispatch({ type: 'SET_PLAYER_NAME', name: playerNameInput.trim() });
      setIsNameModalOpen(false);
      setGameStarted(true);

      if (gameState.gameTime <= 1 && !gameState.messages.some(m => m.text.includes("Welcome,"))) { 
        dispatch({type: 'ADD_MESSAGE', message: `Welcome, ${playerNameInput.trim()}! Your adventure begins.`, messageType: 'system'});
        const initialLocation = gameState.allLocations[gameState.currentLocationId];
        if (initialLocation && typeof initialLocation.description === 'function') {
            dispatch({type: 'ADD_MESSAGE', message: initialLocation.description(gameState), messageType: 'game'});
            initialLocation.itemIds.forEach(id => {
                const item = gameState.allItems[id];
                if (item) dispatch({type: 'ADD_MESSAGE', message: `You see a ${item.name} here.`, messageType: 'game'});
            });
        }
      }
    }
  };

  const generateAndShowSaveCode = () => {
    const minimalState = {
        player: gameState.player,
        currentLocationId: gameState.currentLocationId,
        activeQuests: gameState.activeQuests,
        completedQuests: gameState.completedQuests,
        locationsDynamicData: Object.fromEntries(
            Object.entries(gameState.allLocations).map(([id, loc]) => [id, {
                visited: loc.visited,
                itemIds: loc.itemIds, 
                enemyIds: loc.enemyIds, 
            }])
        ),
        gameTime: gameState.gameTime,
        isGameOver: gameState.isGameOver,
    };
    const code = obfuscateState(minimalState);
    setGeneratedSaveCode(code);
    setIsSaveCodeModalOpen(true);
  };

  const handleLoadFromCode = () => {
    if (!loadCodeInput.trim()) {
        setLoadCodeError("Please paste your save code.");
        return;
    }
    setLoadCodeError(null);
    const deobfuscated = deobfuscateCode(loadCodeInput.trim());

    if (deobfuscated) {
        if (typeof deobfuscated === 'object' && deobfuscated !== null && 'player' in deobfuscated && 'currentLocationId' in deobfuscated) {
            dispatch({ type: 'LOAD_GAME_STATE', payload: deobfuscated as GameState }); 
            setIsLoadCodeModalOpen(false);
            setLoadCodeInput('');
            // After loading a state, re-prompt for API key if not set.
            if (!getAiClient()) {
              setIsApiKeyModalOpen(true);
            }
        } else {
            setLoadCodeError("Invalid save code format. The code does not seem to represent a valid game state.");
        }
    } else {
        setLoadCodeError("Invalid or corrupted save code. Could not decrypt or parse.");
    }
  };
  
  const copySaveCodeToClipboard = () => {
    if (saveCodeTextAreaRef.current) {
      saveCodeTextAreaRef.current.select();
      document.execCommand('copy');
      dispatch({type: 'ADD_MESSAGE', message: "Save code copied to clipboard!", messageType: 'system'});
    }
  };

  const processCommand = useCallback(async (input: string) => {
    const commandLower = input.toLowerCase().trim();
    if (commandLower === 'save') {
        if (!gameState.isGameOver && gameStarted) {
            generateAndShowSaveCode();
        } else {
            dispatch({ type: 'ADD_MESSAGE', message: "Cannot save now.", messageType: 'error' });
        }
        return;
    }
    if (commandLower === 'load') {
         if (!isLoadCodeModalOpen) { 
            setIsLoadCodeModalOpen(true);
            setLoadCodeError(null);
        }
        return;
    }
    await engineProcessCommand(input);
  }, [engineProcessCommand, gameState.isGameOver, gameStarted, isLoadCodeModalOpen]);


  const handleItemAction = useCallback((command: string, itemName: string) => {
    if (gameState.isGameOver) return;
    processCommand(`${command} ${itemName}`);
  }, [processCommand, gameState.isGameOver]);

  const handleDialogueChoice = useCallback((choiceIndex: number) => {
    if (gameState.isGameOver) return;
    dispatch({ type: 'SELECT_DIALOGUE_CHOICE', choiceIndex });
  }, [dispatch, gameState.isGameOver]);

  const handleNewGame = () => {
    window.location.reload(); 
  };
  
  const handleMapNodeClick = useCallback((locationId: string) => {
    const location = gameState.allLocations[locationId];
    if (location) {
      processCommand(`examine ${location.name}`);
    }
  }, [gameState.allLocations, processCommand]);

  const currentNpc = gameState.currentDialogueNpcId ? gameState.allNpcs[gameState.currentDialogueNpcId] : null;
  let dialogueChoicesForInput: DialogueChoice[] | undefined = undefined;

  if (currentNpc && gameState.currentDialogueStage !== null) {
    const stageDef = currentNpc.dialogue[gameState.currentDialogueStage];
    let choicesToShow: DialogueChoice[] = [];

    if (currentNpc.isHealer && currentNpc.id === 'village_healer_lyra' && gameState.currentDialogueStage === 'greet' && typeof currentNpc.greetChoicesGenerator === 'function') {
        const dynamicChoices = currentNpc.greetChoicesGenerator(gameState.player, currentNpc, gameState);
        const staticStageChoices = stageDef?.choices || [];
        const uniqueStaticChoices = staticStageChoices.filter(sc => !dynamicChoices.some(dc => dc.text.startsWith(sc.text.substring(0,10)) )); 
        choicesToShow = [...dynamicChoices, ...uniqueStaticChoices];
    } else if (stageDef?.choices) {
        choicesToShow = stageDef.choices;
    }

    if (choicesToShow.length > 0) {
        dialogueChoicesForInput = choicesToShow.filter(choice => {
            if (choice.requiredQuestStage) {
                const q = gameState.activeQuests[choice.requiredQuestStage.questId] || gameState.completedQuests[choice.requiredQuestStage.questId];
                if (choice.requiredQuestStage.stage === 'not_started') return !q;
                if (choice.requiredQuestStage.stage === 'completed') return !!q && q.isCompleted;
                if (q && typeof choice.requiredQuestStage.stage === 'number') return q.currentStageIndex === choice.requiredQuestStage.stage && !q.isCompleted;
                return false;
            }
            if (choice.requiredPlayerLevel && gameState.player.level < choice.requiredPlayerLevel) return false;
            if (choice.condition && !choice.condition(gameState)) return false;
            return true;
        });
    }
  }

  const shouldRenderMainUI = !isApiKeyModalOpen && !isNameModalOpen && gameStarted && !gameState.isGameOver && !isSaveCodeModalOpen && !isLoadCodeModalOpen;

  if (gameState.isLoading && !gameStarted) {
    return <div className="flex items-center justify-center h-screen text-terminal-cyan text-xl">Loading Game Data...</div>;
  }

  return (
    <div className="bg-terminal-bg min-h-screen text-terminal-text font-mono flex flex-col p-1 sm:p-2 md:p-3 selection:bg-terminal-accent selection:text-terminal-bg">
      <Modal 
        isOpen={isApiKeyModalOpen} 
        title="Enter Gemini API Key" 
        showCloseButton={false}
      >
        <p className="mb-3 text-sm text-terminal-text">This game requires a Google Gemini API key to function.</p>
        {apiKeyError && <p className="text-terminal-red text-xs mb-2 p-2 bg-red-900 bg-opacity-30 rounded">{apiKeyError}</p>}
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleApiKeySubmit()}
          className="w-full p-2 mb-2 bg-terminal-text bg-opacity-10 border border-terminal-border rounded text-terminal-text focus:outline-none focus:border-terminal-accent"
          placeholder="Your Gemini API Key"
        />
        <button
          onClick={handleApiKeySubmit}
          disabled={gameState.isAiProcessing}
          className="w-full p-2 bg-terminal-accent text-terminal-bg rounded hover:bg-terminal-yellow transition-colors disabled:opacity-50"
        >
          {gameState.isAiProcessing ? 'Verifying...' : 'Submit Key'}
        </button>
        <p className="text-xs text-terminal-border mt-3">You can obtain a key from Google AI Studio.</p>
      </Modal>

      <Modal 
        isOpen={isNameModalOpen} 
        title="Enter Your Name" 
        showCloseButton={false}
      >
        <p className="mb-3 text-sm text-terminal-text">Welcome, adventurer! What shall we call you?</p>
        <input
          type="text"
          value={playerNameInput}
          onChange={(e) => setPlayerNameInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
          className="w-full p-2 mb-2 bg-terminal-text bg-opacity-10 border border-terminal-border rounded text-terminal-text focus:outline-none focus:border-terminal-accent"
          placeholder="Your character's name"
          maxLength={20}
        />
        <button
          onClick={handleNameSubmit}
          className="w-full p-2 bg-terminal-accent text-terminal-bg rounded hover:bg-terminal-yellow transition-colors"
        >
          Begin Adventure
        </button>
      </Modal>

     <Modal isOpen={gameState.isGameOver} title="Game Over" showCloseButton={false}>
        <p className="text-terminal-red text-lg mb-4">Your adventure has come to an unfortunate end.</p>
        <p className="text-terminal-text mb-4">
          The Whispering Woods have claimed another soul. But fear not, for every ending is a new beginning!
        </p>
        <button
          onClick={handleNewGame}
          className="w-full p-2 bg-terminal-green text-terminal-bg rounded hover:bg-opacity-80 transition-colors mb-2"
        >
          Start Anew
        </button>
         <button
          onClick={() => { setIsLoadCodeModalOpen(true); setLoadCodeError(null); }}
          className="w-full p-2 bg-terminal-cyan text-terminal-bg rounded hover:bg-opacity-80 transition-colors"
        >
          Load From Code
        </button>
      </Modal>

      <Modal 
        isOpen={isSaveCodeModalOpen} 
        onClose={() => setIsSaveCodeModalOpen(false)} 
        title="Save Game Code"
      >
        <p className="mb-2 text-sm">Copy the code below and save it securely to load your progress later.</p>
        <textarea
          ref={saveCodeTextAreaRef}
          readOnly
          value={generatedSaveCode}
          className="w-full h-32 p-2 mb-2 bg-terminal-text bg-opacity-10 border border-terminal-border rounded text-terminal-text focus:outline-none custom-scrollbar text-xs"
        />
        <button 
          onClick={copySaveCodeToClipboard}
          className="w-full p-2 bg-terminal-blue text-terminal-bg rounded hover:bg-opacity-80 transition-colors mr-2"
        >
          Copy to Clipboard
        </button>
        <button 
          onClick={() => setIsSaveCodeModalOpen(false)}
          className="w-full p-2 mt-2 bg-terminal-border text-terminal-text rounded hover:bg-opacity-70 transition-colors"
        >
          Close
        </button>
      </Modal>

      <Modal 
        isOpen={isLoadCodeModalOpen} 
        onClose={() => {setIsLoadCodeModalOpen(false); setLoadCodeError(null);}} 
        title="Load Game from Code"
      >
        <p className="mb-2 text-sm">Paste your save code below to load your game progress.</p>
        {loadCodeError && <p className="text-terminal-red text-xs mb-2">{loadCodeError}</p>}
        <textarea
          value={loadCodeInput}
          onChange={(e) => setLoadCodeInput(e.target.value)}
          className="w-full h-32 p-2 mb-2 bg-terminal-text bg-opacity-10 border border-terminal-border rounded text-terminal-text focus:outline-none focus:border-terminal-accent custom-scrollbar text-xs"
          placeholder="Paste your save code here"
        />
        <button 
          onClick={handleLoadFromCode}
          className="w-full p-2 bg-terminal-green text-terminal-bg rounded hover:bg-opacity-80 transition-colors"
        >
          Load Game
        </button>
      </Modal>


      {shouldRenderMainUI && (
        <>
          <header className="mb-2 flex flex-wrap justify-between items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-terminal-green">Whispering Wood Saga</h1>
            <div>
              <button onClick={generateAndShowSaveCode} className="px-3 py-1 bg-terminal-blue text-terminal-bg rounded hover:bg-opacity-80 transition-colors mr-2 text-xs sm:text-sm">Save Game</button>
              <button onClick={() => {setIsLoadCodeModalOpen(true); setLoadCodeError(null);}} className="px-3 py-1 bg-terminal-cyan text-terminal-bg rounded hover:bg-opacity-80 transition-colors text-xs sm:text-sm">Load from Code</button>
            </div>
          </header>

          <main className="h-0 flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 overflow-hidden">
            
            <div className="flex flex-col gap-2 overflow-hidden md:order-1 lg:order-1">
              <div className="flex-1 min-h-0"> 
                <PlayerStatsDisplay player={gameState.player} />
              </div>
              <div className="flex-1 min-h-0"> 
                 <InventoryDisplay inventory={gameState.player.inventory} onItemAction={handleItemAction} />
              </div>
            </div>

            <div className="flex flex-col gap-2 overflow-hidden md:order-3 lg:order-2">
              {gameState.combatState && <CombatDisplay combatState={gameState.combatState} player={gameState.player} />}
              <div className="flex-1 min-h-0"> 
                <GameDisplay messages={gameState.messages} />
              </div>
            </div>

            <div className="flex flex-col gap-2 overflow-hidden md:order-2 lg:order-3">
               <div className="h-48 md:h-1/2 lg:h-2/5 min-h-[150px] max-h-[300px] xl:max-h-[350px]">
                 <WorldMap 
                    locations={gameState.allLocations} 
                    currentLocId={gameState.currentLocationId} 
                    onNodeClick={handleMapNodeClick}
                  />
              </div>
              <div className="flex-1 min-h-0"> 
                <QuestLogDisplay activeQuests={gameState.activeQuests} completedQuests={gameState.completedQuests} />
              </div>
            </div>
          </main>

          <footer className="mt-2">
            <InputArea
              onCommandSubmit={processCommand}
              dialogueChoices={dialogueChoicesForInput}
              onDialogueChoice={handleDialogueChoice}
              isCombatActive={!!gameState.combatState}
              playerName={gameState.player.name}
              isAiProcessing={gameState.isAiProcessing}
              aiInteraction={gameState.aiInteraction}
              disabled={gameState.isGameOver || isApiKeyModalOpen || isNameModalOpen || isSaveCodeModalOpen || isLoadCodeModalOpen}
            />
          </footer>
        </>
      )}
      {!shouldRenderMainUI && !isApiKeyModalOpen && !isNameModalOpen && !isSaveCodeModalOpen && !isLoadCodeModalOpen && !gameState.isGameOver &&
        <div className="flex items-center justify-center h-screen text-terminal-cyan text-xl">Initializing Interface...</div>
      }
    </div>
  );
};

export default App;
