
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  POTION = 'potion',
  KEY = 'key',
  QUEST_ITEM = 'quest_item',
  MISC = 'misc',
  BOOK = 'book',
  TOOL = 'tool', // For items like splints
  SHIELD = 'shield',
}

export enum EquipSlot {
  MAIN_HAND = 'MainHand',
  OFF_HAND = 'OffHand',
  HEAD = 'Head',
  TORSO = 'Torso',
  LEGS = 'Legs',
  FEET = 'Feet',
  HANDS = 'Hands',
  AMULET = 'Amulet',
  RING1 = 'Ring1',
  RING2 = 'Ring2',
}

export enum BodyPart {
  HEAD = 'Head',
  TORSO = 'Torso',
  LEFT_ARM = 'LeftArm',
  RIGHT_ARM = 'RightArm',
  LEFT_LEG = 'LeftLeg',
  RIGHT_LEG = 'RightLeg',
}

export enum BodyPartCondition {
  HEALTHY = 'Healthy',
  BRUISED = 'Bruised', // Light damage
  INJURED = 'Injured', // Moderate damage, minor penalties
  SEVERELY_INJURED = 'Severely Injured', // Heavy damage, significant penalties
  MISSING = 'Missing', // Dismembered/Destroyed - Not fully implemented beyond severe injury
}

export enum AttackType {
  THRUST = 'thrust',
  SLASH = 'slash',
  POWER = 'power',
}

export interface BodyPartState {
  condition: BodyPartCondition;
  currentHp: number;
  maxHp: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  attackBonus?: number;
  defenseBonus?: number;
  healAmount?: number; // For general health potions
  bodyPartHeal?: { part?: BodyPart; conditionImprovement?: BodyPartCondition; amount?: number }; // For splints or targeted healing
  statBonus?: { stat: keyof PlayerBaseStats; amount: number, duration?: number };
  unlocks?: string;
  isEquippable?: boolean;
  equipSlot?: EquipSlot; // Defines where the item can be equipped
  isUsable?: boolean;
  value: number;
  useOnBodyPart?: BodyPart; // For items like splints
  allowedAttackTypes?: AttackType[]; // Optional: define which attacks this weapon can do
}

export interface PlayerBaseStats {
  Strength: number;
  Dexterity: number;
  Constitution: number;
  Intelligence: number;
  Agility: number;
}

export interface Player extends PlayerBaseStats {
  name: string;
  health: number;
  maxHealth: number;
  inventory: Item[];
  equippedItems: Record<EquipSlot, Item | null>;
  gold: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  attributePoints: number;
  bodyParts: Record<BodyPart, BodyPartState>;
  isEvading?: boolean;
  isDefending?: boolean;
  powerAttackCooldown: number;
  powerAttackMaxCooldown: number;
}

export interface Exit {
  direction: string;
  locationId: string;
  isLocked?: boolean;
  keyId?: string;
  lockMessage?: string;
  hidden?: boolean;
}

export interface DialogueActionReturn {
  message?: string;
  followUpActions?: GameAction | GameAction[];
}

export interface DialogueChoice {
  text: string;
  nextStage?: string | number;
  action?: (game: GameState) => DialogueActionReturn | string | void;
  closesDialogue?: boolean;
  requiredQuestStage?: { questId: string; stage: number | 'not_started' | 'completed' };
  setsQuestStage?: { questId: string; stage: number };
  requiredPlayerLevel?: number;
}

export interface DialogueStageActionReturn {
  message?: string;
  followUpActions?: GameAction | GameAction[];
}

export interface DialogueStage {
  text: (player: Player, npc: NPCData, gameState: GameState) => string;
  choices?: DialogueChoice[];
  endsDialogue?: boolean;
  autoAdvanceTo?: string | number;
  givesItem?: string;
  startsQuest?: string;
  action?: (game: GameState) => DialogueStageActionReturn | string | void;
}

export interface NPCData {
  id: string;
  name: string;
  description: string;
  dialogue: Record<string | number, DialogueStage>;
  greetChoicesGenerator?: (player: Player, npc: NPCData, gameState: GameState) => DialogueChoice[];
  initialDialogueStage: string | number;
  hostile?: boolean;
  relatedQuestIds?: string[];
  personalityPrompt?: string;
  isVendor?: boolean;
  sellsItemIds?: string[];
  buysItemTypes?: ItemType[];
  buysSpecificItemIds?: string[];
  isHealer?: boolean; // For physician type NPCs
}

export interface QuestStage {
  description: string;
  target?: string;
  targetCount?: number;
  isCompleted?: (gameState: GameState) => boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  stages: QuestStage[];
  currentStageIndex: number;
  isCompleted: boolean;
  isFailed: boolean;
  rewards?: {
    gold?: number;
    items?: string[];
    xp?: number;
    attributePoints?: number;
  };
  giverNpcId?: string;
}

export interface Enemy extends PlayerBaseStats {
  id:string;
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  lootTable: Array<{ itemId: string; dropChance: number }>;
  goldDrop?: { min: number; max: number };
  xp: number;
  bodyParts: Record<BodyPart, BodyPartState>;
  weakSpots?: BodyPart[];
  evasionChance: number;
  fleeChance?: number;
  attackPattern?: Array<{ type: 'basic' | 'strong_attack' | 'target_specific_part'; part?: BodyPart; chance: number }>;
  dialogue?: Record<string, string>;
  damageModifiers?: Partial<Record<BodyPart, Partial<Record<AttackType, number>>>>; // e.g. { TORSO: { THRUST: 1.5, SLASH: 0.8 }, HEAD: { POWER: 2.0 } }
}

export interface LocationOnEnterReturn {
  message?: string;
  followUpActions?: GameAction | GameAction[];
}

export interface Location {
  id: string;
  name: string;
  description: (gameState: GameState) => string;
  exits: Exit[];
  itemIds: string[];
  npcIds: string[];
  enemyIds?: Array<string | {id: string, count: number, respawnTime?: number}>; // Updated type
  onEnter?: (gameState: GameState) => LocationOnEnterReturn | string | void;
  visited: boolean;
  isShop?: boolean;
  isDungeon?: boolean;
  isInn?: boolean; // For Inn locations
  mapCoordinates: { x: number; y: number };
}

export interface CombatEnemy extends Enemy {
  combatId: string;
}

export interface CombatState {
  activeEnemies: CombatEnemy[];
  currentAttackingEnemyCombatId: string | null;
  waitingEnemies: CombatEnemy[];
  playerTurn: boolean;
  log: string[];
  turnOrder?: string[];
  currentTargetEnemyId?: string;
}

export interface AIInteractionState {
  type: 'none' | 'pending_ai_clarification';
  pendingPlayerInput?: boolean;
  conversationHistory?: Array<{ speaker: 'player' | 'ai' | 'system'; text: string }>;
  data?: any;
}

export interface GameState {
  player: Player;
  currentLocationId: string;
  messages: Array<{text: string, type: 'game' | 'player' | 'system' | 'combat' | 'error' | 'quest' | 'dialogue' | 'ai_assist' | 'level_up' | 'shop' | 'body_condition'}>;
  activeQuests: Record<string, Quest>;
  completedQuests: Record<string, Quest>;
  currentDialogueNpcId: string | null;
  currentDialogueStage: string | number | null;
  combatState: CombatState | null;
  allLocations: Record<string, Location>;
  allItems: Record<string, Item>;
  allNpcs: Record<string, NPCData>;
  allEnemies: Record<string, Enemy>;
  allQuests: Record<string, Quest>;
  gameTime: number;
  isLoading: boolean;
  isAiProcessing: boolean;
  aiInteraction: AIInteractionState;
  queuedActions?: GameAction[];
  isGameOver: boolean;
}

export type GameAction =
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'PROCESS_INPUT'; input: string }
  | { type: 'SELECT_DIALOGUE_CHOICE'; choiceIndex: number }
  | { type: 'START_GAME' }
  | { type: 'LOAD_GAME_STATE'; payload: GameState }
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'ADD_MESSAGE'; message: string; messageType?: GameState['messages'][0]['type'] }
  | { type: 'MOVE'; direction: string }
  | { type: 'TAKE_ITEM'; itemName: string; itemId?: string }
  | { type: 'DROP_ITEM'; itemName: string }
  | { type: 'USE_ITEM'; itemName: string; itemId?: string; targetBodyPart?: BodyPart }
  | { type: 'EQUIP_ITEM'; itemName: string; itemId?: string; slot?: EquipSlot }
  | { type: 'UNEQUIP_ITEM'; slot: EquipSlot }
  | { type: 'EXAMINE'; targetName: string }
  | { type: 'TALK_TO_NPC'; npcName: string; npcId?: string }
  | { type: 'END_DIALOGUE' }
  | { type: 'START_COMBAT'; enemyIds: string[] }
  | { type: 'PLAYER_ATTACK'; attackType: AttackType; targetEnemyId?: string; targetBodyPart?: BodyPart }
  | { type: 'ENEMY_ATTACK'; enemyCombatId: string}
  | { type: 'END_COMBAT'; victory: boolean }
  | { type: 'START_QUEST'; questId: string }
  | { type: 'ADVANCE_QUEST'; questId: string; stageIndex?: number }
  | { type: 'COMPLETE_QUEST'; questId: string }
  | { type: 'FAIL_QUEST'; questId: string }
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME_REQUEST' }
  | { type: 'INITIALIZE_GAME_DATA'; payload: { locations: Record<string, Location>, items: Record<string, Item>, npcs: Record<string, NPCData>, enemies: Record<string, Enemy>, quests: Record<string, Quest> } }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'SET_AI_INTERACTION'; payload: AIInteractionState }
  | { type: 'AI_PROCESS_NPC_DIALOGUE'; npcId: string; playerInput?: string}
  | { type: 'ADD_QUEUED_ACTIONS'; payload: GameAction[] }
  | { type: 'CLEAR_QUEUED_ACTIONS' }
  | { type: 'LEVEL_UP' }
  | { type: 'ALLOCATE_ATTRIBUTE_POINT'; payload: { attribute: keyof PlayerBaseStats; points: number } }
  | { type: 'BUY_ITEM'; itemName: string; itemId?: string; npcId: string; }
  | { type: 'SELL_ITEM'; itemName: string; itemId: string; npcId: string; }
  | { type: 'SET_COMBAT_TARGET'; enemyCombatId: string }
  | { type: 'EVADE_ACTION' }
  | { type: 'DEFEND_ACTION' }
  | { type: 'GAME_OVER_ACKNOWLEDGED'}
  | { type: 'REST_AT_INN'; npcId: string; cost: number } // For Inn resting
  | { type: 'TREAT_INJURY'; npcId: string; bodyPart: BodyPart; cost: number }; // For Physician
