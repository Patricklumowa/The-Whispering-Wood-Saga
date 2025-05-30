
import { useReducer, useCallback, useEffect } from 'react';
import {
    GameState, GameAction, Player, Item, Location, NPCData, Quest, Enemy, DialogueChoice, Exit, ItemType,
    DialogueStage, AIInteractionState, DialogueActionReturn, LocationOnEnterReturn, PlayerBaseStats,
    BodyPart, BodyPartState, BodyPartCondition, CombatEnemy, EquipSlot, DialogueStageActionReturn, CombatState, AttackType
} from '../types';
import { LOCATIONS_DATA } from '../gameData/locations';
import { ITEMS_DATA } from '../gameData/items';
import { NPCS_DATA } from '../gameData/npcs';
import { ENEMIES_DATA } from '../gameData/enemies';
import { QUESTS_DATA } from '../gameData/quests';
import { callGemini } from '../lib/ai';

const XP_PER_LEVEL_BASE = 100;
const XP_PER_LEVEL_FACTOR = 1.6;
const ATTRIBUTE_POINTS_PER_LEVEL = 2;
const POWER_ATTACK_MAX_COOLDOWN = 3;

const createInitialBodyParts = (constitution: number, baseMaxHp: number): Record<BodyPart, BodyPartState> => {
    const headMax = Math.max(10, Math.floor(baseMaxHp * 0.20) + constitution);
    const torsoMax = Math.max(20, Math.floor(baseMaxHp * 0.35) + constitution * 2);
    const armMax = Math.max(15, Math.floor(baseMaxHp * 0.15) + constitution);
    const legMax = Math.max(15, Math.floor(baseMaxHp * 0.15) + constitution);
    return {
        [BodyPart.HEAD]: { condition: BodyPartCondition.HEALTHY, currentHp: headMax, maxHp: headMax },
        [BodyPart.TORSO]: { condition: BodyPartCondition.HEALTHY, currentHp: torsoMax, maxHp: torsoMax },
        [BodyPart.LEFT_ARM]: { condition: BodyPartCondition.HEALTHY, currentHp: armMax, maxHp: armMax },
        [BodyPart.RIGHT_ARM]: { condition: BodyPartCondition.HEALTHY, currentHp: armMax, maxHp: armMax },
        [BodyPart.LEFT_LEG]: { condition: BodyPartCondition.HEALTHY, currentHp: legMax, maxHp: legMax },
        [BodyPart.RIGHT_LEG]: { condition: BodyPartCondition.HEALTHY, currentHp: legMax, maxHp: legMax },
    };
};

const calculateMaxHp = (constitution: number, level: number): number => {
    return 50 + (constitution * 10) + (level * 5);
};

const initialPlayerBaseStats: PlayerBaseStats = {
    Strength: 6, Dexterity: 5, Constitution: 7, Intelligence: 5, Agility: 5,
};

const initialPlayerMaxHp = calculateMaxHp(initialPlayerBaseStats.Constitution, 1);

const initialEquippedItems: Record<EquipSlot, Item | null> = {
    [EquipSlot.MAIN_HAND]: null,
    [EquipSlot.OFF_HAND]: null,
    [EquipSlot.HEAD]: null,
    [EquipSlot.TORSO]: null,
    [EquipSlot.LEGS]: null,
    [EquipSlot.FEET]: null,
    [EquipSlot.HANDS]: null,
    [EquipSlot.AMULET]: null,
    [EquipSlot.RING1]: null,
    [EquipSlot.RING2]: null,
};


const initialPlayer: Player = {
  name: 'Adventurer',
  ...initialPlayerBaseStats,
  health: initialPlayerMaxHp,
  maxHealth: initialPlayerMaxHp,
  inventory: [],
  equippedItems: initialEquippedItems,
  gold: 75,
  level: 1,
  xp: 0,
  xpToNextLevel: XP_PER_LEVEL_BASE,
  attributePoints: 0,
  bodyParts: createInitialBodyParts(initialPlayerBaseStats.Constitution, initialPlayerMaxHp),
  isEvading: false,
  isDefending: false,
  powerAttackCooldown: 0,
  powerAttackMaxCooldown: POWER_ATTACK_MAX_COOLDOWN,
};

const initialAiInteractionState: AIInteractionState = {
  type: 'none',
  pendingPlayerInput: false,
  conversationHistory: [],
};

const initialState: GameState = {
  player: initialPlayer,
  currentLocationId: 'starter_room',
  messages: [{text: 'Welcome to Whispering Wood Saga! Type "help" for a list of commands, or type "?" followed by a question for AI assistance (e.g., "? what should I do?").', type: 'system'}],
  activeQuests: {},
  completedQuests: {},
  currentDialogueNpcId: null,
  currentDialogueStage: null,
  combatState: null,
  allLocations: {},
  allItems: {},
  allNpcs: {},
  allEnemies: {},
  allQuests: {},
  gameTime: 0,
  isLoading: true,
  isAiProcessing: false,
  aiInteraction: initialAiInteractionState,
  queuedActions: [],
  isGameOver: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  let newState = { ...state, gameTime: state.gameTime + 1, queuedActions: state.queuedActions ? [...state.queuedActions] : [] };
  if (action.type !== 'LOAD_GAME_STATE') {
    newState.messages = [...state.messages];
  }

  if (action.type === 'PLAYER_ATTACK' || action.type === 'MOVE' || action.type === 'START_COMBAT') {
    newState.player = { ...newState.player, isEvading: false, isDefending: false };
  }


  const addMessage = (text: string, type: GameState['messages'][0]['type'] = 'game') => {
    newState.messages.push({ text, type });
    if (newState.messages.length > 200) newState.messages.splice(0, newState.messages.length - 200);
  };

  const getCurrentLocation = () => newState.allLocations[newState.currentLocationId];
  const getItem = (itemId: string): Item | undefined => newState.allItems[itemId];
  const getNpc = (npcId: string): NPCData | undefined => newState.allNpcs[npcId];
  const getEnemyTemplate = (enemyId: string): Enemy | undefined => newState.allEnemies[enemyId];
  const getQuest = (questId: string): Quest | undefined => newState.allQuests[questId];

  const queueActions = (actions: GameAction | GameAction[]) => {
    const actionsArray = Array.isArray(actions) ? actions : [actions];
    newState.queuedActions = [...(newState.queuedActions || []), ...actionsArray];
  };

  const updateBodyPartCondition = (bodyPartState: BodyPartState, partName: BodyPart): string | null => {
    const oldCondition = bodyPartState.condition;
    if (bodyPartState.currentHp === 0) {
        bodyPartState.condition = BodyPartCondition.SEVERELY_INJURED;
    } else if (bodyPartState.currentHp <= bodyPartState.maxHp * 0.3) {
        bodyPartState.condition = BodyPartCondition.SEVERELY_INJURED;
    } else if (bodyPartState.currentHp <= bodyPartState.maxHp * 0.6) {
        bodyPartState.condition = BodyPartCondition.INJURED;
    } else if (bodyPartState.currentHp < bodyPartState.maxHp) {
        bodyPartState.condition = BodyPartCondition.BRUISED;
    } else {
        bodyPartState.condition = BodyPartCondition.HEALTHY;
    }
    if (oldCondition !== bodyPartState.condition) {
        const message = `${partName} is now ${bodyPartState.condition}.`;
        addMessage(message, 'body_condition');
        return message;
    }
    return null;
  }

  const updatePlayerBodyPart = (part: BodyPart, damage: number): string[] => {
    const messages: string[] = [];
    const bodyPartState = newState.player.bodyParts[part];
    const oldCondition = bodyPartState.condition; // Capture condition BEFORE damage and update

    bodyPartState.currentHp = Math.max(0, bodyPartState.currentHp - damage);

    const conditionChangeMessage = updateBodyPartCondition(bodyPartState, part); // This function will update bodyPartState.condition
    if (conditionChangeMessage) messages.push(conditionChangeMessage);

    if (bodyPartState.currentHp === 0) {
        if (part === BodyPart.HEAD || part === BodyPart.TORSO) {
            newState.player.health = 0;
            messages.push(`A fatal blow to your ${part}!`);
        }
    }
    
    // Now 'oldCondition' holds the state *before* updateBodyPartCondition potentially changed it
    if (bodyPartState.condition === BodyPartCondition.SEVERELY_INJURED) {
        if (oldCondition !== bodyPartState.condition) { // Check if condition *just* changed to severe
            if (part === BodyPart.LEFT_ARM || part === BodyPart.RIGHT_ARM) messages.push("Your attack effectiveness is reduced!");
            else if (part === BodyPart.LEFT_LEG || part === BodyPart.RIGHT_LEG) messages.push("Your ability to defend is hampered!");
        }
    }

    if (newState.player.health > 0) {
        newState.player.health = Math.max(0, newState.player.health - damage);
    }
    if (newState.player.health === 0 && !(part === BodyPart.HEAD || part === BodyPart.TORSO) && bodyPartState.currentHp > 0) {
        messages.push("The combined damage overwhelms you!");
    }
    return messages;
  };

  const updateEnemyBodyPart = (enemy: CombatEnemy, part: BodyPart, damage: number): string[] => {
    const messages: string[] = [];
    const bodyPartState = enemy.bodyParts[part];
    bodyPartState.currentHp = Math.max(0, bodyPartState.currentHp - damage);

    const conditionChangeMessage = updateBodyPartCondition(bodyPartState, part);
    if(conditionChangeMessage) messages.push(`${enemy.name}'s ${conditionChangeMessage}`);


    if (bodyPartState.currentHp === 0) {
         if (part === BodyPart.HEAD || part === BodyPart.TORSO) {
            enemy.health = 0;
            messages.push(`A fatal blow to ${enemy.name}'s ${part}!`);
        } else if (part === BodyPart.LEFT_ARM || part === BodyPart.RIGHT_ARM || part === BodyPart.LEFT_LEG || part === BodyPart.RIGHT_LEG) {
            messages.push(`${enemy.name}'s ${part} is crippled!`);
        }
    }
    
    if (enemy.health > 0) {
      enemy.health = Math.max(0, enemy.health - damage);
    }
    if (enemy.health === 0 && !(part === BodyPart.HEAD || part === BodyPart.TORSO) && bodyPartState.currentHp > 0) {
        messages.push(`The combined damage fells ${enemy.name}!`);
    }
    return messages;
  };

  const getPlayerEffectiveAttack = (): number => {
    let baseAttack = newState.player.Strength * 2 + Math.floor(newState.player.Dexterity / 2);
    const mainHandWeapon = newState.player.equippedItems[EquipSlot.MAIN_HAND];
    if (mainHandWeapon) {
        baseAttack += mainHandWeapon.attackBonus || 0;
    }
    if (newState.player.bodyParts[BodyPart.LEFT_ARM].condition === BodyPartCondition.SEVERELY_INJURED ||
        newState.player.bodyParts[BodyPart.RIGHT_ARM].condition === BodyPartCondition.SEVERELY_INJURED) {
        baseAttack *= 0.7;
    }
    return Math.max(1, Math.floor(baseAttack));
  };

  const getPlayerEffectiveDefense = (): number => {
    let baseDefense = newState.player.Agility * 1 + Math.floor(newState.player.Constitution / 2);
    Object.values(newState.player.equippedItems).forEach(item => {
        if (item && item.defenseBonus) {
            baseDefense += item.defenseBonus;
        }
    });
    if (newState.player.bodyParts[BodyPart.LEFT_LEG].condition === BodyPartCondition.SEVERELY_INJURED ||
        newState.player.bodyParts[BodyPart.RIGHT_LEG].condition === BodyPartCondition.SEVERELY_INJURED) {
        baseDefense *= 0.7;
    }
    return Math.floor(baseDefense);
  };

 const getEnemyEffectiveAttack = (enemy: CombatEnemy): number => {
    let baseAttack = enemy.Strength * 2 + Math.floor(enemy.Dexterity / 2);
    if (enemy.bodyParts[BodyPart.LEFT_ARM].condition === BodyPartCondition.SEVERELY_INJURED ||
        enemy.bodyParts[BodyPart.RIGHT_ARM].condition === BodyPartCondition.SEVERELY_INJURED) {
        baseAttack *= 0.6;
    }
    return Math.max(1, Math.floor(baseAttack));
};

const getEnemyEffectiveDefense = (enemy: CombatEnemy): number => {
    let baseDefense = enemy.Agility * 1 + Math.floor(enemy.Constitution / 2);
    if (enemy.bodyParts[BodyPart.LEFT_LEG].condition === BodyPartCondition.SEVERELY_INJURED ||
        enemy.bodyParts[BodyPart.RIGHT_LEG].condition === BodyPartCondition.SEVERELY_INJURED) {
        baseDefense *= 0.6;
    }
    return Math.floor(baseDefense);
};

const calculateDamage = (attackerPower: number, defenderDefense: number, attackType: AttackType, enemy?: CombatEnemy, targetBodyPart?: BodyPart): {damage: number, messages: string[]} => {
    const damageMessages: string[] = [];
    let baseDamageAttempt = attackerPower - defenderDefense;
    let minGuaranteedDamage = Math.max(1, Math.floor(attackerPower * 0.10));
    let rawDamage = Math.max(baseDamageAttempt, minGuaranteedDamage);

    let finalDamageMultiplier = 1.0;

    if (attackType === AttackType.POWER) {
        finalDamageMultiplier *= 1.75;
        damageMessages.push("A powerful blow!");
    }

    if (enemy && targetBodyPart && enemy.damageModifiers) {
        const partModifiers = enemy.damageModifiers[targetBodyPart];
        if (partModifiers && partModifiers[attackType] !== undefined) {
            const modifier = partModifiers[attackType]!;
            finalDamageMultiplier *= modifier;
            if (modifier > 1.0) damageMessages.push(`${enemy.name}'s ${targetBodyPart} is vulnerable to ${attackType} attacks!`);
            if (modifier < 1.0) damageMessages.push(`${enemy.name}'s ${targetBodyPart} resists ${attackType} attacks!`);
        }
    }
    if (enemy && targetBodyPart && enemy.weakSpots?.includes(targetBodyPart) && !(enemy.damageModifiers?.[targetBodyPart]?.[attackType])) {
        finalDamageMultiplier *= 1.3;
        damageMessages.push(`You hit a weak spot on ${enemy.name}'s ${targetBodyPart}!`);
    }


    rawDamage *= finalDamageMultiplier;
    const randomVariance = 0.9 + Math.random() * 0.2;
    const finalDamage = Math.max(1, Math.floor(rawDamage * randomVariance));

    return {damage: finalDamage, messages: damageMessages};
};

  const grantXP = (amount: number) => {
    newState.player.xp += amount;
    addMessage(`You gained ${amount} XP!`, 'level_up');
    if (newState.player.xp >= newState.player.xpToNextLevel) {
        queueActions({ type: 'LEVEL_UP'});
    }
  };

  const decrementPowerAttackCooldown = () => {
    if (newState.player.powerAttackCooldown > 0) {
        newState.player.powerAttackCooldown = Math.max(0, newState.player.powerAttackCooldown - 1);
    }
  };


  switch (action.type) {
    case 'INITIALIZE_GAME_DATA':
      newState.allLocations = {};
      for (const id in action.payload.locations) {
          const locTemplate = action.payload.locations[id];
          newState.allLocations[id] = {
              ...locTemplate,
              itemIds: [...locTemplate.itemIds],
              npcIds: [...locTemplate.npcIds],
              enemyIds: locTemplate.enemyIds ? locTemplate.enemyIds.map(e => (typeof e === 'object' ? {...e} : e)) : [],
              exits: locTemplate.exits.map(e => ({...e})),
              visited: id === 'starter_room',
          };
      }
      newState.allNpcs = {};
      for (const id in action.payload.npcs) {
          const npcTemplate = action.payload.npcs[id];
          const newDialogue: any = {};
          for (const stageKey in npcTemplate.dialogue) {
              newDialogue[stageKey] = {
                  ...npcTemplate.dialogue[stageKey],
                  choices: npcTemplate.dialogue[stageKey].choices ? npcTemplate.dialogue[stageKey].choices.map((c: any) => ({...c})) : undefined,
              };
          }
          newState.allNpcs[id] = {
              ...npcTemplate,
              dialogue: newDialogue,
              sellsItemIds: npcTemplate.sellsItemIds ? [...npcTemplate.sellsItemIds] : undefined,
              buysItemTypes: npcTemplate.buysItemTypes ? [...npcTemplate.buysItemTypes] : undefined,
              buysSpecificItemIds: npcTemplate.buysSpecificItemIds ? [...npcTemplate.buysSpecificItemIds] : undefined,
          };
      }
      newState.allQuests = {};
      for (const id in action.payload.quests) {
          const questTemplate = action.payload.quests[id];
          newState.allQuests[id] = {
              ...questTemplate,
              stages: questTemplate.stages.map(s => ({...s})),
              rewards: questTemplate.rewards ? {
                  ...questTemplate.rewards,
                  items: questTemplate.rewards.items ? [...questTemplate.rewards.items] : undefined,
              } : undefined,
          };
      }
      newState.allItems = action.payload.items; // Already deep copied via JSON.stringify
      newState.allEnemies = action.payload.enemies; // Already deep copied via JSON.stringify
      
      newState.isLoading = false;
      newState.isGameOver = false;
      newState.queuedActions = [];
      if (!newState.player.equippedItems || Object.keys(newState.player.equippedItems).length < Object.keys(EquipSlot).length / 2 ) {
        newState.player.equippedItems = JSON.parse(JSON.stringify(initialEquippedItems));
      }
      if (newState.player.powerAttackMaxCooldown === undefined) {
        newState.player.powerAttackMaxCooldown = POWER_ATTACK_MAX_COOLDOWN;
      }
      if (newState.player.powerAttackCooldown === undefined) {
        newState.player.powerAttackCooldown = 0;
      }
      return newState;

    case 'SET_PLAYER_NAME':
      newState.player = { ...newState.player, name: action.name };
      addMessage(`Your name is ${action.name}.`, 'system');
      return newState;

    case 'ADD_MESSAGE':
      addMessage(action.message, action.messageType || 'game');
      return newState;

    case 'MOVE': {
      if (newState.isGameOver) return newState;
      if (newState.aiInteraction.type !== 'none') {
        newState.aiInteraction = initialAiInteractionState;
      }
      const currentLocation = getCurrentLocation();
      const exit = currentLocation.exits.find(e => e.direction.toLowerCase() === action.direction.toLowerCase() && !e.hidden);

      if (exit) {
        if (exit.isLocked) {
          if (exit.keyId && newState.player.inventory.some(item => item.id === exit.keyId)) {
            addMessage(`You use the ${getItem(exit.keyId)?.name} to unlock the way ${exit.direction}.`, 'system');
             const newExits = currentLocation.exits.map(e => e.direction === exit.direction ? {...e, isLocked: false} : e);
             newState.allLocations[currentLocation.id] = {...currentLocation, exits: newExits};
          } else {
            addMessage(exit.lockMessage || `The way ${exit.direction} is locked.`, 'error');
            return newState;
          }
        }

        const previousLocationId = newState.currentLocationId;
        newState.currentLocationId = exit.locationId;
        const newLocation = getCurrentLocation();

        if (!newLocation) {
            addMessage(`Error: Destination "${exit.locationId}" for "${action.direction}" not found. Reverting.`, 'error');
            newState.currentLocationId = previousLocationId;
            return newState;
        }

        if (!newLocation.visited) {
          newState.allLocations[exit.locationId] = { ...newLocation, visited: true };
        }
        addMessage(`You go ${action.direction}.`, 'game');
        addMessage(`You are now in ${newLocation.name}.`, 'system');
        if (typeof newLocation.description === 'function') {
            addMessage(newLocation.description(newState), 'game');
        } else {
             addMessage("Error: Location description not available for " + newLocation.name, "error");
        }
        newLocation.itemIds.forEach(id => {
            const item = getItem(id);
            if(item) addMessage(`You see a ${item.name} here.`, 'game');
        });
        newLocation.npcIds.forEach(id => {
            const npc = getNpc(id);
            if(npc) addMessage(`${npc.name} is here.`, 'game');
        });
        if (newLocation.onEnter) {
            const onEnterResult = newLocation.onEnter(newState);
            if (typeof onEnterResult === 'string') {
                addMessage(onEnterResult, 'system');
            } else if (onEnterResult) {
                if (onEnterResult.message) addMessage(onEnterResult.message, 'system');
                if (onEnterResult.followUpActions) queueActions(onEnterResult.followUpActions);
            }
        }
        if (newLocation.enemyIds && newLocation.enemyIds.length > 0) {
            const enemySpawnData = newLocation.enemyIds;
            const enemiesToSpawn: string[] = [];
            enemySpawnData.forEach(spawnInfo => {
                if (typeof spawnInfo === 'string') {
                    if (spawnInfo.includes('_defeated_marker')) return;
                    if (Math.random() < 0.45) enemiesToSpawn.push(spawnInfo);
                } else {
                    if (spawnInfo.id.includes('_defeated_marker')) return;
                    for (let i = 0; i < spawnInfo.count; i++) {
                        enemiesToSpawn.push(spawnInfo.id);
                    }
                }
            });

            const finalEnemiesToSpawn = enemiesToSpawn.filter(id => !id.includes('_defeated_marker'));

            if (finalEnemiesToSpawn.length > 0 && !newState.combatState) {
                const nonBossSpawns = finalEnemiesToSpawn.filter(id => {
                    if (id === 'giant_cave_spider' && newLocation.id === 'spiders_lair' && newLocation.onEnter) return false;
                    if (id === 'bandit_leader' && newLocation.id === 'bandit_watchtower_interior' && newLocation.onEnter) return false;
                    if (id === 'hobgoblin_bruiser' && newLocation.id === 'goblin_chieftain_hut') return false;
                    return true;
                });

                if (nonBossSpawns.length > 0) {
                    queueActions({ type: 'START_COMBAT', enemyIds: nonBossSpawns });
                }
            }
        }
      } else {
        addMessage(`You can't go ${action.direction}.`, 'error');
      }
      return newState;
    }

    case 'TAKE_ITEM': {
        if (newState.isGameOver) return newState;
        const itemNameLower = action.itemName.toLowerCase();
        const loc = getCurrentLocation();
        const itemInLocation = action.itemId
            ? getItem(action.itemId)
            : loc.itemIds.map(id => getItem(id)).find(i => i?.name.toLowerCase() === itemNameLower);

        if (itemInLocation && loc.itemIds.includes(itemInLocation.id)) {
            const itemIndexInLoc = loc.itemIds.findIndex(id => id === itemInLocation.id);
            newState.player.inventory = [...newState.player.inventory, JSON.parse(JSON.stringify(itemInLocation))]; // Deep copy item
            const updatedItemIds = loc.itemIds.filter((_, index) => index !== itemIndexInLoc);
            newState.allLocations[loc.id] = {...loc, itemIds: updatedItemIds};
            addMessage(`You take the ${itemInLocation.name}.`, 'game');
            Object.values(newState.activeQuests).forEach(q => {
                if (!q.isCompleted && q.stages[q.currentStageIndex]?.isCompleted?.(newState)) {
                     queueActions({ type: 'ADVANCE_QUEST', questId: q.id });
                }
            });
        } else {
            addMessage(`There is no ${action.itemName} here.`, 'error');
        }
        return newState;
    }

    case 'USE_ITEM': {
        if (newState.isGameOver) return newState;
        const itemNameLower = action.itemName.toLowerCase();
        const itemIndex = action.itemId
            ? newState.player.inventory.findIndex(i => i.id === action.itemId)
            : newState.player.inventory.findIndex(i => i.name.toLowerCase() === itemNameLower);

        if (itemIndex > -1) {
            const itemToUse = newState.player.inventory[itemIndex];
            if (itemToUse.isUsable) {
                let used = false;
                let itemConsumed = true;
                let messages: string[] = [];
                
                if (itemToUse.type === ItemType.POTION && itemToUse.healAmount) {
                    let totalHealApplied = 0;
                    let availableHeal = itemToUse.healAmount;

                    const bodyPartOrder: BodyPart[] = [BodyPart.HEAD, BodyPart.TORSO, BodyPart.LEFT_ARM, BodyPart.RIGHT_ARM, BodyPart.LEFT_LEG, BodyPart.RIGHT_LEG];
                    const severityOrder = [BodyPartCondition.SEVERELY_INJURED, BodyPartCondition.INJURED, BodyPartCondition.BRUISED];

                    // Heal body parts first
                    for (const severity of severityOrder) {
                        for (const partKey of bodyPartOrder) {
                            const partState = newState.player.bodyParts[partKey];
                            if (partState.condition === severity && partState.currentHp < partState.maxHp && availableHeal > 0) {
                                const hpNeeded = partState.maxHp - partState.currentHp;
                                const healToPart = Math.min(availableHeal, hpNeeded);
                                
                                partState.currentHp += healToPart;
                                availableHeal -= healToPart;
                                totalHealApplied += healToPart;
                                
                                messages.push(`Your ${partKey} heals for ${healToPart} HP.`);
                                const conditionChangeMsg = updateBodyPartCondition(partState, partKey);
                                if(conditionChangeMsg && !messages.some(m => m.includes(conditionChangeMsg))) messages.push(conditionChangeMsg);

                                if (availableHeal <= 0) break;
                            }
                        }
                        if (availableHeal <= 0) break;
                    }

                    // Then apply remaining to overall health if any
                    if (availableHeal > 0 && newState.player.health < newState.player.maxHealth) {
                        const overallHealNeeded = newState.player.maxHealth - newState.player.health;
                        const healToOverall = Math.min(availableHeal, overallHealNeeded);
                        newState.player.health += healToOverall;
                        availableHeal -= healToOverall;
                        totalHealApplied += healToOverall;
                        messages.push(`You restore ${healToOverall} overall health.`);
                    }

                    if (totalHealApplied > 0) {
                        messages.unshift(`You use the ${itemToUse.name}.`);
                         if(newState.player.health > newState.player.maxHealth) newState.player.health = newState.player.maxHealth; // Cap overall health
                        messages.push(`Your health is now ${newState.player.health}/${newState.player.maxHealth}.`);
                        used = true;
                    } else {
                        messages.push(`You use the ${itemToUse.name}, but it has no effect. You are already in good shape.`);
                        itemConsumed = false; // Don't consume if no healing occurred
                    }

                } else if (itemToUse.statBonus) { // Other potion types (e.g. stat bonus)
                    const { stat, amount } = itemToUse.statBonus;
                    newState.player[stat] = (newState.player[stat] || 0) + amount;
                    messages.push(`You use the ${itemToUse.name}. You feel your ${stat} increase by ${amount}!`);
                    used = true;
                } else if (itemToUse.type === ItemType.TOOL && itemToUse.bodyPartHeal) { // Tools like splints
                    const targetPart = action.targetBodyPart;
                    if (targetPart && newState.player.bodyParts[targetPart]) {
                        const partState = newState.player.bodyParts[targetPart];
                        if (partState.condition === BodyPartCondition.SEVERELY_INJURED || partState.condition === BodyPartCondition.INJURED) {
                            const improvedCondition = itemToUse.bodyPartHeal.conditionImprovement || BodyPartCondition.INJURED;
                            partState.condition = improvedCondition; // Directly set condition for tools
                            if (itemToUse.bodyPartHeal.amount) { // If tool gives specific HP
                                partState.currentHp = Math.min(partState.maxHp, partState.currentHp + itemToUse.bodyPartHeal.amount);
                            } else { // Default HP boost for condition improvement if not specified
                                if (improvedCondition === BodyPartCondition.INJURED) partState.currentHp = Math.min(partState.maxHp, Math.max(partState.currentHp, Math.floor(partState.maxHp * 0.4)));
                                else if (improvedCondition === BodyPartCondition.BRUISED) partState.currentHp = Math.min(partState.maxHp, Math.max(partState.currentHp, Math.floor(partState.maxHp * 0.7)));
                            }
                            partState.currentHp = Math.min(partState.maxHp, partState.currentHp);
                            updateBodyPartCondition(partState, targetPart); // Recalculate based on new HP

                            messages.push(`You use ${itemToUse.name} on your ${targetPart}. Its condition improves.`);
                            used = true;
                        } else {
                            messages.push(`Your ${targetPart} doesn't need a ${itemToUse.name} right now.`);
                            itemConsumed = false;
                        }
                    } else {
                        messages.push(`Which body part do you want to use the ${itemToUse.name} on? (e.g., 'use ${itemToUse.name} on left arm')`);
                        itemConsumed = false;
                    }
                }


                if (used && itemConsumed) {
                    const newInventory = [...newState.player.inventory];
                    newInventory.splice(itemIndex, 1);
                    newState.player.inventory = newInventory;
                } else if (!used && messages.length === 0) {
                     messages.push(`${itemToUse.name} cannot be used that way or has no effect right now.`);
                }
                messages.forEach(m => addMessage(m, 'game'));
            } else {
                addMessage(`You cannot use the ${itemToUse.name}.`, 'error');
            }
        } else {
            addMessage(`You don't have a ${action.itemName}.`, 'error');
        }
        return newState;
    }

    case 'EQUIP_ITEM': {
        if (newState.isGameOver) return newState;
        const itemNameLower = action.itemName.toLowerCase();
        const itemIndex = action.itemId
            ? newState.player.inventory.findIndex(i => i.id === action.itemId)
            : newState.player.inventory.findIndex(i => i.name.toLowerCase() === itemNameLower);

        if (itemIndex > -1) {
            const itemToEquip = newState.player.inventory[itemIndex];
            if (itemToEquip.isEquippable && itemToEquip.equipSlot) {
                const targetSlot = itemToEquip.equipSlot;

                const currentlyEquippedItem = newState.player.equippedItems[targetSlot];
                const newInventory = [...newState.player.inventory];
                newInventory.splice(itemIndex, 1);

                if (currentlyEquippedItem) {
                    newInventory.push(currentlyEquippedItem);
                    addMessage(`You unequip ${currentlyEquippedItem.name}.`, 'game');
                }

                newState.player.equippedItems = { ...newState.player.equippedItems, [targetSlot]: itemToEquip };
                newState.player.inventory = newInventory;
                addMessage(`You equip the ${itemToEquip.name} to your ${targetSlot}.`, 'game');
            } else if (itemToEquip && (!itemToEquip.isEquippable || !itemToEquip.equipSlot)) {
                 addMessage(`You cannot equip the ${itemToEquip.name}. It doesn't seem to fit anywhere or isn't equippable.`, 'error');
            }
        } else {
            addMessage(`You don't have a ${action.itemName} to equip.`, 'error');
        }
        return newState;
    }

    case 'UNEQUIP_ITEM': {
        if (newState.isGameOver) return newState;
        const { slot } = action;
        const itemToUnequip = newState.player.equippedItems[slot];

        if (itemToUnequip) {
            newState.player.inventory = [...newState.player.inventory, itemToUnequip];
            newState.player.equippedItems = { ...newState.player.equippedItems, [slot]: null };
            addMessage(`You unequip the ${itemToUnequip.name} from your ${slot}.`, 'game');
        } else {
            addMessage(`You have nothing equipped in your ${slot}.`, 'error');
        }
        return newState;
    }

    case 'EXAMINE': {
        if (newState.isGameOver) return newState;
        const targetNameLower = action.targetName.toLowerCase();
        const currentLocation = getCurrentLocation();

        if (!currentLocation) {
            addMessage("Error: Current location data seems to be missing for examine.", "error");
            return newState;
        }

        if (!targetNameLower || targetNameLower === 'room' || targetNameLower === 'here' || targetNameLower === 'around') {
            addMessage(`Location: ${currentLocation.name}`, 'system');
            if (typeof currentLocation.description === 'function') {
                addMessage(currentLocation.description(newState), 'game');
            } else {
                addMessage("Error: Location description not available for " + currentLocation.name, "error");
            }

            if (currentLocation.itemIds.length > 0) {
                addMessage("You see the following items:", 'game');
                currentLocation.itemIds.forEach(id => {
                    const item = getItem(id);
                    if (item) addMessage(`- ${item.name}`, 'game');
                });
            } else {
                addMessage("You see no items here.", 'game');
            }

            if (currentLocation.npcIds.length > 0) {
                addMessage("People here:", 'game');
                currentLocation.npcIds.forEach(id => {
                    const npc = getNpc(id);
                    if (npc) addMessage(`- ${npc.name}`, 'game');
                });
            } else {
                addMessage("There is no one else here.", 'game');
            }

            addMessage("Exits:", 'game');
            currentLocation.exits.forEach(exit => {
                if (!exit.hidden) {
                    addMessage(`- ${exit.direction}${exit.isLocked ? ' (Locked)' : ''}`, 'game');
                }
            });

        } else if (targetNameLower === 'self' || targetNameLower === newState.player.name.toLowerCase()) {
            const p = newState.player;
            const bodyConditions = Object.entries(p.bodyParts).map(([part, state]) => `${part}: ${state.currentHp}/${state.maxHp} (${state.condition})`).join('\n  ');
            const equipped = Object.entries(p.equippedItems).filter(([,item])=>item).map(([slot,item])=>`${slot}: ${item!.name}`).join('\n  ') || 'Nothing';
            addMessage(
    `Character: ${p.name} (Level ${p.level})
    XP: ${p.xp}/${p.xpToNextLevel}, Attribute Points: ${p.attributePoints}
    Health: ${p.health}/${p.maxHealth}
    Stats: Str-${p.Strength}, Dex-${p.Dexterity}, Con-${p.Constitution}, Int-${p.Intelligence}, Agi-${p.Agility}
    Gold: ${p.gold}g
    Power Attack Cooldown: ${p.powerAttackCooldown > 0 ? `${p.powerAttackCooldown} turns` : 'Ready'}
    Body Condition:
      ${bodyConditions}
    Equipped:
      ${equipped}`, 'game');

        } else {
            let foundItem = newState.player.inventory.find(i => i.name.toLowerCase() === targetNameLower);
            if (foundItem) {
                addMessage(`${foundItem.name}: ${foundItem.description}`, 'game');
                return newState;
            }
            foundItem = Object.values(newState.player.equippedItems).find(i => i && i.name.toLowerCase() === targetNameLower) || undefined;
            if (foundItem) {
                addMessage(`${foundItem.name}: ${foundItem.description}`, 'game');
                return newState;
            }
            foundItem = currentLocation.itemIds.map(id => getItem(id)).find(i => i && i.name.toLowerCase() === targetNameLower);
            if (foundItem) {
                addMessage(`${foundItem.name}: ${foundItem.description}`, 'game');
                return newState;
            }
            const foundNpc = currentLocation.npcIds.map(id => getNpc(id)).find(n => n && n.name.toLowerCase() === targetNameLower);
            if (foundNpc) {
                let npcDescription = `${foundNpc.name}: ${foundNpc.description}`;
                if (foundNpc.isVendor) {
                    npcDescription += `\nThis individual appears to be a merchant.`;
                    if (foundNpc.sellsItemIds && foundNpc.sellsItemIds.length > 0) {
                        const itemNames = foundNpc.sellsItemIds.map(id => getItem(id)?.name).filter(Boolean).join(', ');
                        npcDescription += `\n  For Sale: ${itemNames || 'Nothing currently'}.`;
                    } else {
                        npcDescription += `\n  They don't seem to have anything for sale right now.`;
                    }
                    let buyInfo = "";
                    if (foundNpc.buysItemTypes && foundNpc.buysItemTypes.length > 0) {
                        buyInfo += ` Generally interested in: ${foundNpc.buysItemTypes.join(', ')}.`;
                    }
                    if (foundNpc.buysSpecificItemIds && foundNpc.buysSpecificItemIds.length > 0) {
                        const specificItemNames = foundNpc.buysSpecificItemIds.map(id => getItem(id)?.name).filter(Boolean).join(', ');
                        buyInfo += ` Specifically looking for: ${specificItemNames}.`;
                    }
                    if (buyInfo) {
                        npcDescription += `\n  Buying: ${buyInfo.trim()}`;
                    } else {
                        npcDescription += `\n  They don't seem to be buying anything specific at the moment.`;
                    }
                }
                if (foundNpc.isHealer) {
                  npcDescription += `\nThis person looks skilled in the healing arts.`;
                }
                addMessage(npcDescription, 'game');
                return newState;
            }
            addMessage(`You don't see any "${action.targetName}" to examine here.`, 'error');
        }
        return newState;
    }
    case 'TALK_TO_NPC': {
      if (newState.isGameOver) return newState;
      const npcNameLower = action.npcName.toLowerCase();
      const currentLoc = getCurrentLocation();
      const npcData = action.npcId
        ? getNpc(action.npcId)
        : currentLoc.npcIds.map(id => getNpc(id)).find(n => n?.name.toLowerCase() === npcNameLower);

      if (npcData && currentLoc.npcIds.includes(npcData.id)) {
        newState.currentDialogueNpcId = npcData.id;
        newState.currentDialogueStage = npcData.initialDialogueStage;

        const stageKey = npcData.initialDialogueStage;
        const stage = npcData.dialogue[stageKey];

        if (stage) {
          let dialogueText = typeof stage.text === 'function' ? stage.text(newState.player, npcData, newState) : stage.text;
          addMessage(`${npcData.name}: "${dialogueText}"`, 'dialogue');

          
          if (npcData.isHealer && npcData.greetChoicesGenerator) {
            const dynamicChoices = npcData.greetChoicesGenerator(newState.player, npcData, newState);
            const staticChoices = stage.choices?.filter(c => !c.text.startsWith("Treat my")) || [];
             
             if (!newState.allNpcs[npcData.id].dialogue[stageKey].choices) {
                 newState.allNpcs[npcData.id].dialogue[stageKey].choices = [];
             }
            newState.allNpcs[npcData.id].dialogue[stageKey].choices = [...dynamicChoices, ...staticChoices];
          }


          if (stage.action) {
            const actionResult = stage.action(newState);
            if (typeof actionResult === 'string') addMessage(actionResult, 'dialogue');
            else if (actionResult) {
                if(actionResult.message) addMessage(actionResult.message, 'dialogue');
                if((actionResult as DialogueStageActionReturn).followUpActions) queueActions((actionResult as DialogueStageActionReturn).followUpActions!);
            }
          }
          if (stage.givesItem) {
            const itemTemplate = getItem(stage.givesItem);
            if (itemTemplate) {
                newState.player.inventory.push(JSON.parse(JSON.stringify(itemTemplate)));
                addMessage(`You received ${itemTemplate.name} from ${npcData.name}.`, 'game');
            }
          }
          if (stage.startsQuest) {
              if (!newState.activeQuests[stage.startsQuest] && !newState.completedQuests[stage.startsQuest]) {
                queueActions({type: 'START_QUEST', questId: stage.startsQuest});
              }
          }

          if (stage.autoAdvanceTo) {
            newState.currentDialogueStage = stage.autoAdvanceTo;
            const nextStageData = npcData.dialogue[stage.autoAdvanceTo];
            if (nextStageData) {
                let nextDialogueText = typeof nextStageData.text === 'function' ? nextStageData.text(newState.player, npcData, newState) : nextStageData.text;
                addMessage(`${npcData.name}: "${nextDialogueText}"`, 'dialogue');
                 if (nextStageData.action) {
                    const nextActionResult = nextStageData.action(newState);
                    if (typeof nextActionResult === 'string') addMessage(nextActionResult, 'dialogue');
                    else if (nextActionResult) {
                        if(nextActionResult.message) addMessage(nextActionResult.message, 'dialogue');
                        if((nextActionResult as DialogueStageActionReturn).followUpActions) queueActions((nextActionResult as DialogueStageActionReturn).followUpActions!);
                    }
                 }
                 if (nextStageData.givesItem) {
                    const itemTemplate = getItem(nextStageData.givesItem);
                    if (itemTemplate) {
                        newState.player.inventory.push(JSON.parse(JSON.stringify(itemTemplate)));
                        addMessage(`You received ${itemTemplate.name} from ${npcData.name}.`, 'game');
                    }
                 }
                 if (nextStageData.startsQuest) {
                    if (!newState.activeQuests[nextStageData.startsQuest] && !newState.completedQuests[nextStageData.startsQuest]) {
                       queueActions({type: 'START_QUEST', questId: nextStageData.startsQuest});
                    }
                 }
                 if (nextStageData.endsDialogue) {
                    newState.currentDialogueNpcId = null;
                    newState.currentDialogueStage = null;
                    addMessage("Dialogue ended.", 'system');
                } else if (!nextStageData.choices || nextStageData.choices.length === 0 && !nextStageData.autoAdvanceTo) {
                    newState.currentDialogueNpcId = null;
                    newState.currentDialogueStage = null;
                }
            } else {
                newState.currentDialogueNpcId = null;
                newState.currentDialogueStage = null;
                addMessage("Dialogue ended abruptly (auto-advance to non-existent stage).", 'system');
            }
          } else if (stage.endsDialogue) {
            newState.currentDialogueNpcId = null;
            newState.currentDialogueStage = null;
            addMessage("Dialogue ended.", 'system');
          }
          else if (!stage.choices || stage.choices.length === 0) {
            
            const currentStageDefinition = npcData.dialogue[newState.currentDialogueStage as string | number];
            let finalChoices = currentStageDefinition?.choices || [];
            if (npcData.isHealer && npcData.greetChoicesGenerator && newState.currentDialogueStage === 'greet') {
                 const dynamicChoices = npcData.greetChoicesGenerator(newState.player, npcData, newState);
                 const staticChoices = currentStageDefinition?.choices?.filter(c => !c.text.startsWith("Treat my")) || [];
                 finalChoices = [...dynamicChoices, ...staticChoices];
            }
            if (finalChoices.length === 0) {
                 newState.currentDialogueNpcId = null;
                 newState.currentDialogueStage = null;
            }
          }

        } else {
          addMessage(`Error: NPC ${npcData.name} has no starting dialogue stage ('${stageKey}') defined.`, 'error');
          newState.currentDialogueNpcId = null;
          newState.currentDialogueStage = null;
        }
      } else {
        addMessage(`You don't see ${action.npcName} here.`, 'error');
      }
      return newState;
    }
    case 'SELECT_DIALOGUE_CHOICE': {
      if (newState.isGameOver) return newState;
      const npc = newState.currentDialogueNpcId ? getNpc(newState.currentDialogueNpcId) : null;
      const stageKey = newState.currentDialogueStage;

      if (npc && stageKey !== null) {
        let currentStageDef = npc.dialogue[stageKey];
        
        if (npc.isHealer && npc.greetChoicesGenerator && stageKey === 'greet') {
            const dynamicChoices = npc.greetChoicesGenerator(newState.player, npc, newState);
            const staticChoices = npc.dialogue[stageKey].choices?.filter(c => !c.text.startsWith("Treat my")) || [];
            currentStageDef = {...npc.dialogue[stageKey], choices: [...dynamicChoices, ...staticChoices]};
        }


        const availableChoices = currentStageDef?.choices?.filter(choice => {
            if (choice.requiredQuestStage) {
                const q = newState.activeQuests[choice.requiredQuestStage.questId] || newState.completedQuests[choice.requiredQuestStage.questId];
                if (choice.requiredQuestStage.stage === 'not_started') return !q;
                if (choice.requiredQuestStage.stage === 'completed') return !!q && q.isCompleted;
                return q && !q.isCompleted && q.currentStageIndex === choice.requiredQuestStage.stage;
            }
            if (choice.requiredPlayerLevel && newState.player.level < choice.requiredPlayerLevel) return false;
            
            return true;
        }) || [];

        if (currentStageDef && availableChoices && action.choiceIndex >= 0 && action.choiceIndex < availableChoices.length) {
          const choice = availableChoices[action.choiceIndex];
          addMessage(`${newState.player.name}: "${choice.text}"`, 'player');

          if (choice.action) {
            const actionResult = choice.action(newState); 
             if (typeof actionResult === 'string') {
                 addMessage(actionResult, 'dialogue');
                 
             } else if (actionResult) {
                if(actionResult.message) addMessage(actionResult.message, 'dialogue');
                if(actionResult.followUpActions) queueActions(actionResult.followUpActions);
            }
          }


          if (choice.setsQuestStage) {
            const questToSet = newState.allQuests[choice.setsQuestStage.questId];
            if (questToSet) {
                if (!newState.activeQuests[questToSet.id] && !newState.completedQuests[questToSet.id]) {
                     queueActions({ type: 'START_QUEST', questId: questToSet.id });
                }
                if (choice.setsQuestStage.stage !== 0 || (newState.activeQuests[questToSet.id] && newState.activeQuests[questToSet.id].currentStageIndex !== choice.setsQuestStage.stage)) {
                    queueActions({ type: 'ADVANCE_QUEST', questId: questToSet.id, stageIndex: choice.setsQuestStage.stage });
                }
            }
          }

          if (choice.closesDialogue) {
            newState.currentDialogueNpcId = null;
            newState.currentDialogueStage = null;
            addMessage("Dialogue ended.", 'system');
          } else if (choice.nextStage !== undefined) {
            newState.currentDialogueStage = choice.nextStage;
            const nextStageData = npc.dialogue[choice.nextStage];
            if (nextStageData) {
              let dialogueText = typeof nextStageData.text === 'function' ? nextStageData.text(newState.player, npc, newState) : nextStageData.text;
              addMessage(`${npc.name}: "${dialogueText}"`, 'dialogue');

              if (nextStageData.action) {
                const nextActionResult = nextStageData.action(newState);
                 if (typeof nextActionResult === 'string') addMessage(nextActionResult, 'dialogue');
                 else if (nextActionResult) {
                    if(nextActionResult.message) addMessage(nextActionResult.message, 'dialogue');
                    if((nextActionResult as DialogueStageActionReturn).followUpActions) queueActions((nextActionResult as DialogueStageActionReturn).followUpActions!);
                }
              }
              if (nextStageData.givesItem) {
                const itemTemplate = getItem(nextStageData.givesItem);
                if (itemTemplate) {
                    newState.player.inventory.push(JSON.parse(JSON.stringify(itemTemplate)));
                    addMessage(`You received ${itemTemplate.name} from ${npc.name}.`, 'game');
                }
              }
              if (nextStageData.startsQuest) {
                 if (!newState.activeQuests[nextStageData.startsQuest] && !newState.completedQuests[nextStageData.startsQuest]) {
                    queueActions({type: 'START_QUEST', questId: nextStageData.startsQuest});
                 }
              }

              if (nextStageData.autoAdvanceTo) {
                newState.currentDialogueStage = nextStageData.autoAdvanceTo;
                const finalStageData = npc.dialogue[nextStageData.autoAdvanceTo];
                if (finalStageData) {
                    let finalText = typeof finalStageData.text === 'function' ? finalStageData.text(newState.player, npc, newState) : finalStageData.text;
                    addMessage(`${npc.name}: "${finalText}"`, 'dialogue');
                     if (finalStageData.action) {
                        const finalActionResult = finalStageData.action(newState);
                        if (typeof finalActionResult === 'string') addMessage(finalActionResult, 'dialogue');
                        else if (finalActionResult) {
                            if(finalActionResult.message) addMessage(finalActionResult.message, 'dialogue');
                            if((finalActionResult as DialogueStageActionReturn).followUpActions) queueActions((finalActionResult as DialogueStageActionReturn).followUpActions!);
                        }
                    }
                     if (finalStageData.givesItem) {
                        const itemTemplate = getItem(finalStageData.givesItem);
                        if (itemTemplate) {
                            newState.player.inventory.push(JSON.parse(JSON.stringify(itemTemplate)));
                            addMessage(`You received ${itemTemplate.name} from ${npc.name}.`, 'game');
                        }
                    }
                    if (finalStageData.startsQuest) {
                        if (!newState.activeQuests[finalStageData.startsQuest] && !newState.completedQuests[finalStageData.startsQuest]) {
                            queueActions({type: 'START_QUEST', questId: finalStageData.startsQuest});
                        }
                    }
                    if (finalStageData.endsDialogue) {
                        newState.currentDialogueNpcId = null;
                        newState.currentDialogueStage = null;
                        addMessage("Dialogue ended.", 'system');
                    } else if (!finalStageData.choices || finalStageData.choices.length === 0 && !finalStageData.autoAdvanceTo) {
                        newState.currentDialogueNpcId = null;
                        newState.currentDialogueStage = null;
                    }
                } else {
                    newState.currentDialogueNpcId = null;
                    newState.currentDialogueStage = null;
                    addMessage("Dialogue ended abruptly (auto-advance to non-existent stage).", 'system');
                }
              } else if (nextStageData.endsDialogue) {
                newState.currentDialogueNpcId = null;
                newState.currentDialogueStage = null;
                addMessage("Dialogue ended.", 'system');
              } else if (!nextStageData.choices || nextStageData.choices.length === 0) {
                newState.currentDialogueNpcId = null;
                newState.currentDialogueStage = null;
              }

            } else {
              addMessage(`Error: Dialogue choice leads to an unknown stage ('${choice.nextStage}').`, "error");
              newState.currentDialogueNpcId = null;
              newState.currentDialogueStage = null;
              addMessage("Dialogue ended abruptly.", 'system');
            }
          } else {
            newState.currentDialogueNpcId = null;
            newState.currentDialogueStage = null;
          }
        } else {
          addMessage("Invalid dialogue choice or stage.", 'error');
           newState.currentDialogueNpcId = null;
           newState.currentDialogueStage = null;
        }
      } else {
        addMessage("Not currently in a dialogue or NPC/Stage is missing.", 'error');
      }
      return newState;
    }
    case 'END_DIALOGUE': {
      if (newState.isGameOver) return newState;
      if (newState.currentDialogueNpcId) {
        addMessage("Dialogue ended.", 'system');
      }
      newState.currentDialogueNpcId = null;
      newState.currentDialogueStage = null;
      return newState;
    }
    case 'START_QUEST': {
      if (newState.isGameOver) return newState;
      const questTemplate = getQuest(action.questId);
      if (questTemplate && !newState.activeQuests[action.questId] && !newState.completedQuests[action.questId]) {
        const newQuest: Quest = JSON.parse(JSON.stringify(questTemplate));
        newQuest.currentStageIndex = 0;
        newQuest.isCompleted = false;
        newQuest.isFailed = false;

        newState.activeQuests[action.questId] = newQuest;
        addMessage(`New Quest Started: ${newQuest.title}`, 'quest');
        if (newQuest.stages[0]) {
            addMessage(newQuest.stages[0].description, 'quest');
        } else {
            addMessage("This quest has no defined stages yet.", 'error');
        }
      } else if (newState.activeQuests[action.questId] || newState.completedQuests[action.questId]) {
      } else {
          addMessage(`Error: Quest "${action.questId}" not found.`, 'error');
      }
      return newState;
    }

    case 'ADVANCE_QUEST': {
        if (newState.isGameOver) return newState;
        const quest = newState.activeQuests[action.questId];
        if (quest) {
            const targetStageIndex = action.stageIndex !== undefined ? action.stageIndex : quest.currentStageIndex + 1;

            if (targetStageIndex >= quest.stages.length -1) { // Reached final stage or explicitly set to final
                quest.currentStageIndex = quest.stages.length - 1;
                quest.isCompleted = true;
                newState.completedQuests[action.questId] = quest;
                delete newState.activeQuests[action.questId];
                addMessage(`Quest Completed: ${quest.title}!`, 'quest');
                if (quest.stages[quest.currentStageIndex] && quest.stages[quest.currentStageIndex].description) {
                     addMessage(quest.stages[quest.currentStageIndex].description, 'quest');
                }
                if (quest.rewards) {
                    if (quest.rewards.gold) { newState.player.gold += quest.rewards.gold; addMessage(`You receive ${quest.rewards.gold} gold.`, 'quest');}
                    if (quest.rewards.items) {
                        quest.rewards.items.forEach(itemId => {
                            const itemTemplate = getItem(itemId);
                            if (itemTemplate) {
                                newState.player.inventory.push(JSON.parse(JSON.stringify(itemTemplate)));
                                addMessage(`You receive ${itemTemplate.name}.`, 'quest');
                            }
                        });
                    }
                    if (quest.rewards.xp) { grantXP(quest.rewards.xp); }
                    if (quest.rewards.attributePoints) {
                        newState.player.attributePoints += quest.rewards.attributePoints;
                        addMessage(`You gain ${quest.rewards.attributePoints} attribute point(s)!`, 'level_up');
                    }
                }
            } else { // Not the final stage yet
                 quest.currentStageIndex = targetStageIndex;
                addMessage(`Quest Updated: ${quest.title}`, 'quest');
                addMessage(quest.stages[quest.currentStageIndex].description, 'quest');
                // Check if current stage has auto-completion condition
                if (quest.stages[quest.currentStageIndex]?.isCompleted?.(newState) && targetStageIndex < quest.stages.length -1 ) {
                    queueActions({type: 'ADVANCE_QUEST', questId: action.questId});
                }
            }
        } else if (newState.completedQuests[action.questId]) {
        } else {
            addMessage(`Quest "${action.questId}" not found or not active.`, 'error');
        }
        return newState;
    }


    case 'START_COMBAT': {
        if (newState.isGameOver) return newState;
        const allEnemiesForEncounter: CombatEnemy[] = [];
        let combatIdCounter = 0;
        action.enemyIds.forEach(enemyId => {
            const enemyTemplate = getEnemyTemplate(enemyId);
            if (enemyTemplate) {
                const combatInstance: CombatEnemy = JSON.parse(JSON.stringify(enemyTemplate));
                combatInstance.combatId = `${enemyId}_${combatIdCounter++}`;
                combatInstance.health = combatInstance.maxHealth;
                Object.values(combatInstance.bodyParts).forEach(bp => bp.currentHp = bp.maxHp);
                allEnemiesForEncounter.push(combatInstance);
            } else {
                addMessage(`Error: Enemy template ${enemyId} not found.`, 'error');
            }
        });

        if (allEnemiesForEncounter.length > 0) {
            const firstEnemy = allEnemiesForEncounter[0];
            const waitingEnemies = allEnemiesForEncounter.slice(1);
            const enemyNames = allEnemiesForEncounter.map(e => e.name).join(', ');

            addMessage(`You encounter: ${enemyNames}!`, 'combat');
            addMessage(`${firstEnemy.name} steps forward to attack!`, 'combat');

            newState.combatState = {
                activeEnemies: allEnemiesForEncounter,
                currentAttackingEnemyCombatId: firstEnemy.combatId,
                waitingEnemies: waitingEnemies,
                playerTurn: true,
                log: [`Combat started with ${enemyNames}!`, `${firstEnemy.name} is active.`],
                currentTargetEnemyId: firstEnemy.combatId,
            };
            newState.player = {...newState.player, isEvading: false, isDefending: false, powerAttackCooldown: Math.max(0, newState.player.powerAttackCooldown -1 ) };

            const markBossDefeatedOrEngaged = (bossId: string, locationId: string, markerId: string) => {
                if (action.enemyIds.includes(bossId) && getCurrentLocation().id === locationId) {
                    const loc = getCurrentLocation();
                    let enemyIdArray = loc.enemyIds || [];
                    if (enemyIdArray.length > 0 && typeof enemyIdArray[0] === 'string') {
                        enemyIdArray = (enemyIdArray as string[]).map(id => ({id, count: 1}));
                    }

                    if (!(enemyIdArray as Array<{id:string}>).some(e => e.id === markerId)) {
                        newState.allLocations[loc.id] = {
                            ...loc,
                            enemyIds: [...(enemyIdArray as Array<{id: string, count: number}>), {id: markerId, count:0}]
                        };
                    }
                }
            };
            markBossDefeatedOrEngaged('giant_cave_spider', 'spiders_lair', 'giant_cave_spider_defeated_marker');
            markBossDefeatedOrEngaged('bandit_leader', 'bandit_watchtower_interior', 'bandit_leader_defeated_marker');
            markBossDefeatedOrEngaged('hobgoblin_bruiser', 'goblin_chieftain_hut', 'hobgoblin_bruiser_defeated_marker');

        }
        return newState;
    }

    case 'PLAYER_ATTACK': {
        if (newState.isGameOver) return newState;
        if (newState.combatState && newState.combatState.playerTurn) {
            const combat = newState.combatState;
            newState.player = {...newState.player, isEvading: false, isDefending: false };

            const { attackType: initialAttackType } = action;
            let currentAttackType = initialAttackType;
            let playerAttackPower = getPlayerEffectiveAttack();

            if (currentAttackType === AttackType.POWER) {
                if (newState.player.powerAttackCooldown > 0) {
                    addMessage(`Power Attack is on cooldown for ${newState.player.powerAttackCooldown} more turn(s). Regular attack performed.`, 'combat');
                    currentAttackType = AttackType.SLASH;
                } else {
                    newState.player.powerAttackCooldown = newState.player.powerAttackMaxCooldown;
                    addMessage(`You unleash a Power Attack!`, 'combat');
                }
            }

            const currentAttackingEnemy = combat.activeEnemies.find(e => e.combatId === combat.currentAttackingEnemyCombatId);

            if (!currentAttackingEnemy) {
                addMessage("Error: No active enemy to attack.", "error");
                if (combat.activeEnemies.length > 0) {
                    combat.currentAttackingEnemyCombatId = combat.activeEnemies[0].combatId;
                    combat.currentTargetEnemyId = combat.activeEnemies[0].combatId;
                     
                    const reassignedEnemy = combat.activeEnemies.find(e => e.combatId === combat.currentAttackingEnemyCombatId);
                    if (!reassignedEnemy) {
                         addMessage("Critical Error: Could not assign active enemy after initial check.", "error");
                         newState.combatState = null;
                         return newState;
                    }
                } else {
                    addMessage("No enemies left in this encounter.", "error");
                    newState.combatState = null;
                    return newState;
                }
            }
            
            const enemyToAttack = combat.activeEnemies.find(e => e.combatId === combat.currentAttackingEnemyCombatId);
            if (!enemyToAttack) {
                addMessage("Critical Error: Target enemy vanished before attack resolution.", "error");
                newState.combatState = null;
                return newState;
            }


            if (Math.random() < enemyToAttack.evasionChance) {
                addMessage(`${enemyToAttack.name} evades your ${currentAttackType} attack!`, 'combat');
            } else {
                const enemyDefensePower = getEnemyEffectiveDefense(enemyToAttack);
                const targetBodyPart = action.targetBodyPart || BodyPart.TORSO;

                const {damage, messages: damageCalcMessages} = calculateDamage(playerAttackPower, enemyDefensePower, currentAttackType, enemyToAttack, targetBodyPart);
                damageCalcMessages.forEach(m => addMessage(m, 'combat'));

                updateEnemyBodyPart(enemyToAttack, targetBodyPart, damage);
                const msg = `You ${currentAttackType} ${enemyToAttack.name}'s ${targetBodyPart} for ${damage} damage. (${enemyToAttack.health}/${enemyToAttack.maxHealth} total)`;
                addMessage(msg, 'combat');
                combat.log.push(msg);

                if (enemyToAttack.health <= 0) {
                    addMessage(`${enemyToAttack.name} defeated!`, 'combat');
                    if (enemyToAttack.xp) grantXP(enemyToAttack.xp);
                    if (enemyToAttack.goldDrop) {
                        const goldAmount = Math.floor(Math.random() * (enemyToAttack.goldDrop.max - enemyToAttack.goldDrop.min + 1)) + enemyToAttack.goldDrop.min;
                        if (goldAmount > 0) {
                            newState.player.gold += goldAmount;
                            addMessage(`You loot ${goldAmount} gold.`, 'game');
                        }
                    }
                    enemyToAttack.lootTable.forEach(loot => {
                        if (Math.random() < loot.dropChance) {
                            const itemTemplate = getItem(loot.itemId);
                            if (itemTemplate) {
                                newState.player.inventory.push(JSON.parse(JSON.stringify(itemTemplate)));
                                addMessage(`You loot ${itemTemplate.name}.`, 'game');
                            }
                        }
                    });

                    combat.activeEnemies = combat.activeEnemies.filter(e => e.combatId !== enemyToAttack.combatId);

                    Object.values(newState.activeQuests).forEach(q => {
                        if (!q.isCompleted && q.stages[q.currentStageIndex]?.isCompleted?.(newState)) {
                             queueActions({ type: 'ADVANCE_QUEST', questId: q.id });
                        }
                    });

                    if (combat.waitingEnemies.length > 0) {
                        const nextEnemy = combat.waitingEnemies.shift() as CombatEnemy;
                        combat.currentAttackingEnemyCombatId = nextEnemy.combatId;
                        combat.currentTargetEnemyId = nextEnemy.combatId;
                        addMessage(`${nextEnemy.name} steps forward!`, 'combat');
                        combat.playerTurn = false;
                        decrementPowerAttackCooldown();
                        queueActions({ type: 'ENEMY_ATTACK', enemyCombatId: nextEnemy.combatId });
                    } else {
                        addMessage("All enemies defeated!", "combat");
                        newState.combatState = null;
                        decrementPowerAttackCooldown();
                    }
                    return newState;
                }
            }
            
            combat.playerTurn = false;
            decrementPowerAttackCooldown();
            if (combat.currentAttackingEnemyCombatId) {
                 queueActions({ type: 'ENEMY_ATTACK', enemyCombatId: combat.currentAttackingEnemyCombatId });
            } else if (combat.activeEnemies.length === 0 && combat.waitingEnemies.length === 0) {
                
                addMessage("All enemies dealt with (final check in player attack).", "combat");
                newState.combatState = null;
            }
             

        } else if (newState.combatState && !newState.combatState.playerTurn) {
            addMessage("It's not your turn!", "error");
        } else if (!newState.combatState) {
             addMessage("You are not in combat.", "error");
        }
        return newState;
    }

    case 'ENEMY_ATTACK': {
        if (newState.isGameOver) return newState;
        if(newState.combatState && newState.player.health > 0) {
            const combat = newState.combatState;

            if (action.enemyCombatId !== combat.currentAttackingEnemyCombatId) {
                const allQueuedEnemyActionsProcessed = !newState.queuedActions || newState.queuedActions.filter(qa => qa.type === 'ENEMY_ATTACK').length <= 1;
                if (allQueuedEnemyActionsProcessed) {
                    combat.playerTurn = true;
                }
                return newState;
            }

            const attackingEnemy = combat.activeEnemies.find(e => e.combatId === combat.currentAttackingEnemyCombatId);

            if (attackingEnemy && attackingEnemy.health > 0) {
                if (newState.player.isEvading) {
                    const playerEvasionRoll = newState.player.Agility + Math.floor(Math.random() * 20) + 1;
                    const enemyAttackRoll = attackingEnemy.Dexterity + Math.floor(Math.random() * 20) + 1;
                    if (playerEvasionRoll > enemyAttackRoll) {
                        addMessage(`You successfully evade ${attackingEnemy.name}'s attack!`, 'combat');
                         newState.player.isEvading = false;
                         combat.playerTurn = true;
                        return newState;
                    } else {
                        addMessage(`You attempt to evade, but ${attackingEnemy.name} connects!`, 'combat');
                    }
                }
                 newState.player.isEvading = false;

                if (attackingEnemy.fleeChance && attackingEnemy.health < attackingEnemy.maxHealth * 0.2 && Math.random() < attackingEnemy.fleeChance) {
                    addMessage(`${attackingEnemy.name} attempts to flee!`, 'combat');
                    combat.activeEnemies = combat.activeEnemies.filter(e => e.combatId !== attackingEnemy.combatId);
                    combat.waitingEnemies = combat.waitingEnemies.filter(e => e.combatId !== attackingEnemy.combatId);

                    if (combat.currentAttackingEnemyCombatId === attackingEnemy.combatId) {
                        if (combat.waitingEnemies.length > 0) {
                            const nextEnemy = combat.waitingEnemies.shift() as CombatEnemy;
                            combat.currentAttackingEnemyCombatId = nextEnemy.combatId;
                            combat.currentTargetEnemyId = nextEnemy.combatId;
                            addMessage(`${nextEnemy.name} steps forward as ${attackingEnemy.name} flees!`, 'combat');
                            queueActions({ type: 'ENEMY_ATTACK', enemyCombatId: nextEnemy.combatId });

                        } else {
                            addMessage(`${attackingEnemy.name} fled! Combat ends.`, "combat");
                            newState.combatState = null;
                        }
                    }
                     combat.playerTurn = true;
                    return newState;

                } else {
                    const enemyAttackPower = getEnemyEffectiveAttack(attackingEnemy);
                    let playerDefensePower = getPlayerEffectiveDefense();
                    
                    const {damage, messages: damageCalcMessages} = calculateDamage(enemyAttackPower, playerDefensePower, AttackType.SLASH);
                    damageCalcMessages.forEach(m => addMessage(m, 'combat'));


                    if (newState.player.isDefending) {
                        const shield = newState.player.equippedItems[EquipSlot.OFF_HAND];
                        let defendedDamage = damage;
                        if (shield && shield.type === ItemType.SHIELD) {
                            defendedDamage = Math.floor(defendedDamage * 0.5);
                            defendedDamage = Math.max(0, defendedDamage - (shield.defenseBonus || 0));
                            addMessage(`You defend with your ${shield.name}, reducing the damage!`, 'combat');
                        } else {
                            addMessage(`You try to defend, but have no shield equipped! Damage taken.`, 'combat');
                        }
                         newState.player.isDefending = false;
                         updatePlayerBodyPart(BodyPart.TORSO, defendedDamage);
                         addMessage(`${attackingEnemy.name} attacks for ${defendedDamage} damage (defended). (${newState.player.health}/${newState.player.maxHealth} total)`, 'combat');

                    } else {
                        const targetablePlayerParts = [BodyPart.TORSO, BodyPart.HEAD, BodyPart.LEFT_ARM, BodyPart.RIGHT_ARM, BodyPart.LEFT_LEG, BodyPart.RIGHT_LEG];
                        const targetedPlayerPart = targetablePlayerParts[Math.floor(Math.random() * targetablePlayerParts.length)];
                        updatePlayerBodyPart(targetedPlayerPart, damage);
                        const enemyMsg = `${attackingEnemy.name} attacks your ${targetedPlayerPart} for ${damage} damage. (${newState.player.health}/${newState.player.maxHealth} total)`;
                        addMessage(enemyMsg, 'combat');
                        combat.log.push(enemyMsg);
                    }
                }

                if (newState.player.health <= 0) {
                    addMessage('You have been defeated!', 'system');
                    addMessage('GAME OVER. Your adventure ends here.', 'error');
                    addMessage('Your progress has been wiped from the annals of time.', 'system');
                    newState.isGameOver = true;
                    newState.combatState = null;
                    return newState;
                }
            }
            if(newState.combatState) newState.combatState.playerTurn = true;
        }
        return newState;
    }
    case 'EVADE_ACTION':
        if (newState.isGameOver) return newState;
        if (newState.combatState && newState.combatState.playerTurn) {
            newState.player.isEvading = true;
            newState.player.isDefending = false;
            addMessage("You prepare to evade the next attack.", 'combat');
            newState.combatState.playerTurn = false;
            decrementPowerAttackCooldown();
            if (newState.combatState.currentAttackingEnemyCombatId) {
                queueActions({ type: 'ENEMY_ATTACK', enemyCombatId: newState.combatState.currentAttackingEnemyCombatId });
            } else {
                 addMessage("No active enemy to evade from.", "error");
                 newState.combatState.playerTurn = true;
            }
        } else {
            addMessage("You can only evade during your turn in combat.", 'error');
        }
        return newState;

    case 'DEFEND_ACTION':
        if (newState.isGameOver) return newState;
        if (newState.combatState && newState.combatState.playerTurn) {
            const shield = newState.player.equippedItems[EquipSlot.OFF_HAND];
            if (shield && shield.type === ItemType.SHIELD) {
                newState.player.isDefending = true;
                newState.player.isEvading = false;
                addMessage(`You raise your ${shield.name} to defend.`, 'combat');
                newState.combatState.playerTurn = false;
                decrementPowerAttackCooldown();
                 if (newState.combatState.currentAttackingEnemyCombatId) {
                    queueActions({ type: 'ENEMY_ATTACK', enemyCombatId: newState.combatState.currentAttackingEnemyCombatId });
                } else {
                    addMessage("No active enemy to defend against.", "error");
                    newState.combatState.playerTurn = true;
                }
            } else {
                addMessage("You need a shield equipped in your off-hand to defend.", 'error');
            }
        } else {
            addMessage("You can only defend during your turn in combat.", 'error');
        }
        return newState;

    case 'LEVEL_UP': {
        if (newState.isGameOver) return newState;
        newState.player.level++;
        newState.player.xp -= newState.player.xpToNextLevel;
        newState.player.xpToNextLevel = Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_PER_LEVEL_FACTOR, newState.player.level -1));
        newState.player.attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
        const oldMaxHp = newState.player.maxHealth;
        newState.player.maxHealth = calculateMaxHp(newState.player.Constitution, newState.player.level);
        const healthIncrease = newState.player.maxHealth - oldMaxHp;
        newState.player.health = newState.player.maxHealth;
        newState.player.bodyParts = createInitialBodyParts(newState.player.Constitution, newState.player.maxHealth);
         Object.values(newState.player.bodyParts).forEach(bp => bp.currentHp = bp.maxHp);
        addMessage(`Congratulations! You reached Level ${newState.player.level}!`, 'level_up');
        addMessage(`Max Health +${healthIncrease}. Health restored. You have ${newState.player.attributePoints} attribute points to spend.`, 'level_up');
        if (newState.player.xp >= newState.player.xpToNextLevel) {
            queueActions({ type: 'LEVEL_UP'});
        }
        return newState;
    }

    case 'ALLOCATE_ATTRIBUTE_POINT': {
        if (newState.isGameOver) return newState;
        const { attribute, points } = action.payload;
        if (newState.player.attributePoints >= points) {
            newState.player[attribute] = (newState.player[attribute] || 0) + points;
            newState.player.attributePoints -= points;
            if (attribute === 'Constitution') {
                const oldMaxHp = newState.player.maxHealth;
                newState.player.maxHealth = calculateMaxHp(newState.player.Constitution, newState.player.level);
                const hpDiff = newState.player.maxHealth - oldMaxHp;
                newState.player.health += hpDiff;
                if (newState.player.health > newState.player.maxHealth) newState.player.health = newState.player.maxHealth;
                newState.player.bodyParts = createInitialBodyParts(newState.player.Constitution, newState.player.maxHealth);
                 Object.values(newState.player.bodyParts).forEach(bp => bp.currentHp = bp.maxHp);
            }
            addMessage(`You increased your ${attribute} by ${points}. You have ${newState.player.attributePoints} attribute points remaining.`, 'level_up');
        } else {
            addMessage(`Not enough attribute points. You have ${newState.player.attributePoints}.`, 'error');
        }
        return newState;
    }

    case 'BUY_ITEM': {
        if (newState.isGameOver) return newState;
        const { itemName, itemId, npcId } = action;
        const npc = getNpc(npcId);
        if (!npc) {
            addMessage(`NPC not found.`, 'error');
            return newState;
        }
        if (!npc.isVendor) {
            addMessage(`${npc.name} is not a vendor.`, 'shop');
            return newState;
        }
        const itemToBuyTemplate = itemId
            ? getItem(itemId)
            : npc.sellsItemIds?.map(id => getItem(id)).find(i => i?.name.toLowerCase() === itemName.toLowerCase());

        if (!itemToBuyTemplate || !npc.sellsItemIds?.includes(itemToBuyTemplate.id)) {
            addMessage(`${npc.name} does not sell ${itemName}.`, 'shop');
            return newState;
        }
        if (newState.player.gold < itemToBuyTemplate.value) {
            addMessage(`You don't have enough gold to buy ${itemToBuyTemplate.name}. You need ${itemToBuyTemplate.value} gold, but have ${newState.player.gold}.`, 'shop');
            return newState;
        }

        newState.player.gold -= itemToBuyTemplate.value;
        newState.player.inventory = [...newState.player.inventory, JSON.parse(JSON.stringify(itemToBuyTemplate))];
        addMessage(`You bought ${itemToBuyTemplate.name} from ${npc.name} for ${itemToBuyTemplate.value} gold.`, 'shop');
        return newState;
    }
    case 'SELL_ITEM': {
        if (newState.isGameOver) return newState;
        const { itemName, itemId, npcId } = action;
        const npc = getNpc(npcId);

        if (!npc) {
            addMessage(`NPC not found.`, 'error');
            return newState;
        }
        if (!npc.isVendor) {
            addMessage(`${npc.name} is not a vendor.`, 'shop');
            return newState;
        }

        const itemIndexInInventory = newState.player.inventory.findIndex(i => i.id === itemId || i.name.toLowerCase() === itemName.toLowerCase());
        if (itemIndexInInventory === -1) {
            addMessage(`You don't have ${itemName} in your inventory.`, 'shop');
            return newState;
        }

        const itemToSell = newState.player.inventory[itemIndexInInventory];

        const canSell = (npc.buysItemTypes && npc.buysItemTypes.includes(itemToSell.type)) ||
                        (npc.buysSpecificItemIds && npc.buysSpecificItemIds.includes(itemToSell.id));

        if (!canSell) {
            addMessage(`${npc.name} is not interested in buying ${itemToSell.name}.`, 'shop');
            return newState;
        }

        newState.player.gold += itemToSell.value;
        const newInventory = [...newState.player.inventory];
        newInventory.splice(itemIndexInInventory, 1);
        newState.player.inventory = newInventory;
        addMessage(`You sold ${itemToSell.name} to ${npc.name} for ${itemToSell.value} gold.`, 'shop');
        return newState;
    }


    case 'LOAD_GAME_STATE': {
        const loadedPlayer = action.payload.player;
        if (!loadedPlayer.bodyParts) {
            loadedPlayer.bodyParts = createInitialBodyParts(loadedPlayer.Constitution || initialPlayerBaseStats.Constitution, loadedPlayer.maxHealth || initialPlayerMaxHp);
        }
        if (loadedPlayer.attributePoints === undefined) loadedPlayer.attributePoints = 0;
        (Object.keys(initialPlayerBaseStats) as Array<keyof PlayerBaseStats>).forEach(stat => {
            if (loadedPlayer[stat] === undefined) {
                loadedPlayer[stat] = initialPlayerBaseStats[stat];
            }
        });
        if (loadedPlayer.Constitution && loadedPlayer.level) {
             loadedPlayer.maxHealth = calculateMaxHp(loadedPlayer.Constitution, loadedPlayer.level);
             if(loadedPlayer.health > loadedPlayer.maxHealth) loadedPlayer.health = loadedPlayer.maxHealth;
        }
        if (!loadedPlayer.equippedItems || Object.keys(loadedPlayer.equippedItems).length < Object.keys(EquipSlot).length / 2 ) {
            loadedPlayer.equippedItems = JSON.parse(JSON.stringify(initialEquippedItems));
        }
        (Object.values(EquipSlot) as EquipSlot[]).forEach(slot => {
            if (!(slot in loadedPlayer.equippedItems)) {
                loadedPlayer.equippedItems[slot] = null;
            }
        });
        if(loadedPlayer.powerAttackCooldown === undefined) loadedPlayer.powerAttackCooldown = 0;
        if(loadedPlayer.powerAttackMaxCooldown === undefined) loadedPlayer.powerAttackMaxCooldown = POWER_ATTACK_MAX_COOLDOWN;

        const reconstructedState: GameState = {
            ...initialState, 
            player: loadedPlayer,
            currentLocationId: action.payload.currentLocationId,
            activeQuests: {}, 
            completedQuests: {}, 
            gameTime: action.payload.gameTime,
            messages: [{text: "Game loaded. Welcome back!", type: 'system'}],
            isLoading: false,
            isGameOver: action.payload.isGameOver || false, 
            allLocations: {}, 
            allItems: ITEMS_DATA, // Use original template
            allNpcs: NPCS_DATA,   // Use original template
            allEnemies: ENEMIES_DATA, // Use original template
            allQuests: QUESTS_DATA, // Use original template
            aiInteraction: initialAiInteractionState,
            isAiProcessing: false,
            queuedActions: [],
        };

        const reconstructedLocations: Record<string, Location> = {};
        Object.keys(LOCATIONS_DATA).forEach(locId => {
            const templateLocation = LOCATIONS_DATA[locId];
            const savedDynamicData = (action.payload as any).locationsDynamicData?.[locId];

            reconstructedLocations[locId] = {
                ...templateLocation, 
                itemIds: savedDynamicData?.itemIds !== undefined ? [...savedDynamicData.itemIds] : [...templateLocation.itemIds],
                npcIds: [...templateLocation.npcIds], 
                enemyIds: savedDynamicData?.enemyIds !== undefined ? savedDynamicData.enemyIds.map((e: any) => typeof e === 'object' ? {...e} : e) : (templateLocation.enemyIds ? templateLocation.enemyIds.map(e => (typeof e === 'object' ? {...e} : e)) : []),
                visited: savedDynamicData?.visited !== undefined ? savedDynamicData.visited : (locId === 'starter_room'),
                exits: templateLocation.exits.map(e => ({...e})), 
            };
        });
        reconstructedState.allLocations = reconstructedLocations;

        Object.keys(action.payload.activeQuests || {}).forEach(questId => {
            const template = QUESTS_DATA[questId];
            const savedQuest = action.payload.activeQuests[questId];
            if (template && savedQuest) {
                reconstructedState.activeQuests[questId] = {
                    ...template, 
                    currentStageIndex: savedQuest.currentStageIndex,
                    isCompleted: savedQuest.isCompleted, 
                    isFailed: savedQuest.isFailed,
                };
            }
        });
        Object.keys(action.payload.completedQuests || {}).forEach(questId => {
            const template = QUESTS_DATA[questId];
            const savedQuest = action.payload.completedQuests[questId];
             if (template && savedQuest) {
                reconstructedState.completedQuests[questId] = {
                     ...template,
                    currentStageIndex: savedQuest.currentStageIndex,
                    isCompleted: true, 
                    isFailed: savedQuest.isFailed,
                };
            }
        });
      return reconstructedState;
    }
    case 'SET_GAME_STATE': return { ...newState, ...action.payload, messages: [...(action.payload.messages || newState.messages)] };
    case 'SET_AI_PROCESSING': return { ...newState, isAiProcessing: action.payload };
    case 'SET_AI_INTERACTION': return { ...newState, aiInteraction: action.payload, isAiProcessing: action.payload.type === 'none' ? false : newState.isAiProcessing };
    case 'ADD_QUEUED_ACTIONS': return { ...newState, queuedActions: [...(newState.queuedActions || []), ...action.payload] };
    case 'CLEAR_QUEUED_ACTIONS': return { ...newState, queuedActions: [] };
    case 'SET_COMBAT_TARGET':
        if (newState.isGameOver) return newState;
        if (newState.combatState && newState.combatState.currentAttackingEnemyCombatId) {
            const target = newState.combatState.activeEnemies.find(e => e.combatId === newState.combatState!.currentAttackingEnemyCombatId);
             if (target) {
                newState.combatState.currentTargetEnemyId = newState.combatState.currentAttackingEnemyCombatId;
                addMessage(`You are targeting ${target.name}.`, 'combat');
             } else {
                addMessage(`Cannot set target. Active enemy not found.`, 'error');
             }
        }
        return newState;
    case 'GAME_OVER_ACKNOWLEDGED':
        return newState;
    default:
      console.warn("Unhandled action type in gameReducer (should be impossible with discriminated union):", (action as any)?.type);
      addMessage(`Internal Error: Unhandled action type: ${(action as any)?.type}`, 'error');
      return state;
  }
}


export function useGameEngine() {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    if (gameState.isLoading) {
        dispatch({
            type: 'INITIALIZE_GAME_DATA',
            payload: {
                locations: LOCATIONS_DATA, // Pass original object
                items: JSON.parse(JSON.stringify(ITEMS_DATA)), // Deep copy for items
                npcs: NPCS_DATA,       // Pass original object
                enemies: JSON.parse(JSON.stringify(ENEMIES_DATA)), // Deep copy for enemies
                quests: QUESTS_DATA      // Pass original object
            }
        });
    }
  }, [gameState.isLoading]);

  useEffect(() => {
      if (gameState.queuedActions && gameState.queuedActions.length > 0) {
        const actionsToDispatch = [...gameState.queuedActions];
        dispatch({ type: 'CLEAR_QUEUED_ACTIONS' });
        actionsToDispatch.forEach(actionToDispatch => {
          dispatch(actionToDispatch);
        });
      }
    }, [gameState.queuedActions]);

  const handleAiDrivenCommand = async (rawInput: string) => {
    if (gameState.isGameOver) {
        dispatch({type: 'ADD_MESSAGE', message: "The game is over. No commands can be processed.", messageType: 'error'});
        return;
    }
    dispatch({ type: 'SET_AI_PROCESSING', payload: true });
    dispatch({ type: 'SET_AI_INTERACTION', payload: { type: 'none' } });

    const currentLocation = gameState.allLocations[gameState.currentLocationId];
    if (!currentLocation) {
        dispatch({type: 'ADD_MESSAGE', message: "Error: Current location data is missing. Cannot process command.", messageType: 'error'});
        dispatch({ type: 'SET_AI_PROCESSING', payload: false });
        return;
    }

    const visibleItems = currentLocation.itemIds.map(id => gameState.allItems[id]).filter(Boolean) as Item[];
    const visibleNpcs = currentLocation.npcIds.map(id => gameState.allNpcs[id]).filter(Boolean) as NPCData[];
    const playerInventory = gameState.player.inventory;

    const equippedItemsString = Object.entries(gameState.player.equippedItems)
        .filter(([, item]) => item !== null)
        .map(([slot, item]) => `${slot}: ${item!.name}`)
        .join('; ') || 'None';

    let combatContext = "";
    if (gameState.combatState && gameState.combatState.activeEnemies.length > 0) {
        combatContext = "IN COMBAT (1v1 focus):\n";
        const activeEnemy = gameState.combatState.activeEnemies.find(e => e.combatId === gameState.combatState!.currentAttackingEnemyCombatId);
        if (activeEnemy) {
            combatContext += `Current Foe: ${activeEnemy.name} (ID: ${activeEnemy.combatId}, Health: ${activeEnemy.health}/${activeEnemy.maxHealth})\n`;
            combatContext += `  Body Parts: ${Object.entries(activeEnemy.bodyParts).map(([part, state]) => `${part}: ${state.currentHp}/${state.maxHp} (${state.condition})`).join(', ')}\n`;
            if (activeEnemy.weakSpots && activeEnemy.weakSpots.length > 0) combatContext += `  Weak Spots: ${activeEnemy.weakSpots.join(', ')}\n`;
             if (activeEnemy.damageModifiers) combatContext += `  Damage Modifiers: (complex, AI should infer based on attack type)\n`;
        }
        if (gameState.combatState.waitingEnemies.length > 0) {
            combatContext += `Waiting Enemies: ${gameState.combatState.waitingEnemies.map(e => e.name).join(', ')}\n`;
        }
        if (gameState.player.isDefending) combatContext += "Player is currently DEFENDING.\n";
        if (gameState.player.isEvading) combatContext += "Player is currently EVADING.\n";
        if (gameState.player.powerAttackCooldown > 0) combatContext += `Player Power Attack Cooldown: ${gameState.player.powerAttackCooldown} turns.\n`;
    }

    const activeQuestsString = Object.values(gameState.activeQuests).map(q => `${q.title}: ${q.stages[q.currentStageIndex].description}`).join('\n') || 'None';

    const context = `
Player Name: ${gameState.player.name}
Player Level: ${gameState.player.level}, XP: ${gameState.player.xp}/${gameState.player.xpToNextLevel}, Attribute Points: ${gameState.player.attributePoints}
Player Stats: Str-${gameState.player.Strength}, Dex-${gameState.player.Dexterity}, Con-${gameState.player.Constitution}, Int-${gameState.player.Intelligence}, Agi-${gameState.player.Agility}
Player Overall Health: ${gameState.player.health}/${gameState.player.maxHealth}
Player Body Parts: ${Object.entries(gameState.player.bodyParts).map(([part, state]) => `${part}: ${state.currentHp}/${state.maxHp} (${state.condition})`).join('; ')}
Current Location: ${currentLocation.name} (ID: ${currentLocation.id}) - ${typeof currentLocation.description === 'function' ? currentLocation.description(gameState) : 'No description.'}
Items here: ${visibleItems.length > 0 ? visibleItems.map(i => `${i.name} (ID: ${i.id}, Value: ${i.value}g)`).join(', ') : 'None'}
NPCs here: ${visibleNpcs.length > 0 ? visibleNpcs.map(n => `${n.name} (ID: ${n.id})${n.isVendor ? ` (Vendor - Sells: ${n.sellsItemIds?.map(id => gameState.allItems[id]?.name).filter(Boolean).join(', ') || 'nothing specific listed'}, Buys: ${n.buysItemTypes?.join(', ') || 'various goods'})` : ''}${n.isHealer ? ' (Healer)' : ''}`).join('; ') : 'None'}
Your inventory: ${playerInventory.length > 0 ? playerInventory.map(i => `${i.name} (ID: ${i.id}, Value: ${i.value}g, Type: ${i.type}, Equipable to: ${i.equipSlot || 'N/A'})`).join(', ') : 'Empty'}
Equipped Items: ${equippedItemsString}
Gold: ${gameState.player.gold}g
Active Quests:
${activeQuestsString}
${combatContext}
`;

    const actionSchema = `
You must respond with a JSON array of action objects. Each object must have "actionType" and "params".
Valid actionTypes and their params:
- "MOVE": {"direction": "north" | "south" | "east" | "west" | "up" | "down" | "enter specific place name" | "northwest" | "northeast" | "southwest" | "southeast" | "leave tower" | "enter tower"}
- "TAKE_ITEM": {"itemName": "item name", "itemId": "item_id_if_known_else_omit"}
- "USE_ITEM": {"itemName": "item name", "itemId": "item_id_if_known_else_omit", "targetBodyPart": "Head"|"Torso"|"LeftArm"|"RightArm"|"LeftLeg"|"RightLeg" (Optional, for items like splints)}
- "EQUIP_ITEM": {"itemName": "item name from inventory", "itemId": "item_id_if_known_else_omit", "slot": "MainHand"|"OffHand"|"Head"|"Torso"|"Legs"|"Feet"|"Hands"|"Amulet"|"Ring1"|"Ring2" (Required if item has equipSlot, infer from item type and name if ambiguous e.g. "equip iron helmet" -> slot: "Head")}
- "UNEQUIP_ITEM": {"slot": "MainHand"|"OffHand"|"Head"|"Torso"|"Legs"|"Feet"|"Hands"|"Amulet"|"Ring1"|"Ring2" (Required, e.g. "unequip helmet" -> slot:"Head", "unequip sword" -> slot:"MainHand", "unequip shield" -> slot:"OffHand")}
- "EXAMINE": {"targetName": "item name" | "npc name" | "room" | "specific feature" | "self"}
- "TALK_TO_NPC": {"npcName": "npc name", "npcId": "npc_id_if_known_else_omit"}
- "PLAYER_ATTACK": {"attackType": "thrust"|"slash"|"power", "targetEnemyId": "current_active_enemy_combat_id_from_context_ONLY", "targetBodyPart": "Head"|"Torso"|"LeftArm"|"RightArm"|"LeftLeg"|"RightLeg" (Optional, defaults to Torso)}
- "ALLOCATE_ATTRIBUTE_POINT": {"payload": {"attribute": "Strength"|"Dexterity"|"Constitution"|"Intelligence"|"Agility", "points": number}}
- "BUY_ITEM": {"itemName": "item name", "itemId": "item_id_if_known_else_omit", "npcId": "npc_id_of_vendor"}
- "SELL_ITEM": {"itemName": "item name from player inventory", "itemId": "item_id_from_player_inventory", "npcId": "npc_id_of_vendor"}
- "SET_COMBAT_TARGET": {"enemyCombatId": "current_active_enemy_combat_id_from_context_ONLY"}
- "EVADE_ACTION": {} (No params)
- "DEFEND_ACTION": {} (No params)
- "UNKNOWN_COMMAND": {"reason": "your explanation"}

Example Player Input: "thrust attack goblin's head"
Context: Current Foe: Goblin Scout (ID: goblin_scout_0)
Response: [{"actionType": "PLAYER_ATTACK", "params": {"attackType": "thrust", "targetEnemyId": "goblin_scout_0", "targetBodyPart": "Head"}}]

When using item/npc/enemy ID, ALWAYS prefer the ID from the context if available. PLAYER_ATTACK *must* use the 'Current Foe's ID.
For "PLAYER_ATTACK", if no specific attackType (thrust, slash, power) is mentioned by player, default to "slash".
`;

    const systemInstruction = `You are a text adventure game parser. Analyze the player's input and the provided game context. Convert the player's intent into a sequence of one or more game actions based on the schema. If an item, NPC or enemy is mentioned, use its ID if available in the context. For EQUIP_ITEM/UNEQUIP_ITEM, determine the correct 'slot'. For BUY_ITEM/SELL_ITEM, 'npcId' is crucial. If player says 'buy/sell from/to [NPC_NAME]', use the NPC's ID. If unclear/invalid, use UNKNOWN_COMMAND. "look" or "look around" is EXAMINE "room". In combat, PLAYER_ATTACK *must* target the 'Current Foe'. If player says 'attack', infer attackType as 'slash' if not specified.`;
    const fullPrompt = `Game Context:\n${context}\nAction Schema:\n${actionSchema}\nPlayer Input: "${rawInput}"\n\nJSON Response:`;

    try {
        const aiResponseJson = await callGemini(fullPrompt, systemInstruction);
        let parsedActions: { actionType: string; params: any }[] = [];
        let cleanedJsonStr = aiResponseJson.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = cleanedJsonStr.match(fenceRegex);
        if (match && match[2]) cleanedJsonStr = match[2].trim();

        try {
            parsedActions = JSON.parse(cleanedJsonStr);
        } catch (e) {
            console.error("Failed to parse AI JSON for command:", e, "Raw:", aiResponseJson);
            if (aiResponseJson.startsWith("Error:") || aiResponseJson.startsWith("AI client is not initialized") || aiResponseJson.startsWith("Sorry, I'm having trouble")) {
                dispatch({type: 'ADD_MESSAGE', message: aiResponseJson, messageType: 'error'});
            } else {
                dispatch({type: 'ADD_MESSAGE', message: "AI response invalid for command. Fuzzy circuits.", messageType: 'ai_assist'});
            }
            parsedActions = [{actionType: "UNKNOWN_COMMAND", params: {reason: "Malformed AI data received from AI for command."}}];
        }

        if (Array.isArray(parsedActions)) {
            if (parsedActions.length > 0) {
                const gameActions: GameAction[] = parsedActions.map(pa => {
                    switch (pa.actionType) {
                        case 'MOVE': return { type: 'MOVE', direction: pa.params.direction };
                        case 'TAKE_ITEM': return { type: 'TAKE_ITEM', itemName: pa.params.itemName, itemId: pa.params.itemId };
                        case 'USE_ITEM': return { type: 'USE_ITEM', itemName: pa.params.itemName, itemId: pa.params.itemId, targetBodyPart: pa.params.targetBodyPart };
                        case 'EQUIP_ITEM': return { type: 'EQUIP_ITEM', itemName: pa.params.itemName, itemId: pa.params.itemId, slot: pa.params.slot };
                        case 'UNEQUIP_ITEM': return { type: 'UNEQUIP_ITEM', slot: pa.params.slot };
                        case 'EXAMINE': return { type: 'EXAMINE', targetName: pa.params.targetName };
                        case 'TALK_TO_NPC': return { type: 'TALK_TO_NPC', npcName: pa.params.npcName, npcId: pa.params.npcId };
                        case 'PLAYER_ATTACK':
                            if (gameState.combatState && gameState.combatState.currentAttackingEnemyCombatId) {
                                return { type: 'PLAYER_ATTACK', attackType: pa.params.attackType || AttackType.SLASH, targetEnemyId: gameState.combatState.currentAttackingEnemyCombatId, targetBodyPart: pa.params.targetBodyPart };
                            }
                            dispatch({type: 'ADD_MESSAGE', message: `AI tried to attack, but no active enemy focus.`, messageType: 'error'});
                            return null;
                        case 'ALLOCATE_ATTRIBUTE_POINT': return { type: 'ALLOCATE_ATTRIBUTE_POINT', payload: pa.params.payload };
                        case 'BUY_ITEM': return { type: 'BUY_ITEM', itemName: pa.params.itemName, itemId: pa.params.itemId, npcId: pa.params.npcId};
                        case 'SELL_ITEM': return { type: 'SELL_ITEM', itemName: pa.params.itemName, itemId: pa.params.itemId, npcId: pa.params.npcId};
                        case 'SET_COMBAT_TARGET':
                             if (gameState.combatState && gameState.combatState.currentAttackingEnemyCombatId) {
                                return { type: 'SET_COMBAT_TARGET', enemyCombatId: gameState.combatState.currentAttackingEnemyCombatId };
                             }
                             dispatch({type: 'ADD_MESSAGE', message: `AI tried to set target, but no active enemy focus.`, messageType: 'error'});
                             return null;
                        case 'EVADE_ACTION': return { type: 'EVADE_ACTION' };
                        case 'DEFEND_ACTION': return { type: 'DEFEND_ACTION' };
                        case 'UNKNOWN_COMMAND':
                            dispatch({type: 'ADD_MESSAGE', message: `AI: ${pa.params.reason || rawInput}`, messageType: 'ai_assist'});
                            return null;
                        default:
                            dispatch({type: 'ADD_MESSAGE', message: `AI suggested unknown action: ${pa.actionType}`, messageType: 'error'});
                            return null;
                    }
                }).filter(Boolean) as GameAction[];

                if (gameActions.length > 0) {
                    dispatch({ type: 'ADD_QUEUED_ACTIONS', payload: gameActions });
                } else if (!parsedActions.some(pa => pa.actionType === "UNKNOWN_COMMAND")) {
                     dispatch({type: 'ADD_MESSAGE', message: "AI processed the command, but no specific game action was taken.", messageType: 'ai_assist'});
                }
            } else if (aiResponseJson.length > 0 && !aiResponseJson.startsWith("AI client is not initialized") && !aiResponseJson.startsWith("Error:") && !aiResponseJson.startsWith("Sorry, I'm having trouble")) {
                 dispatch({type: 'ADD_MESSAGE', message: `AI: ${aiResponseJson}`, messageType: 'ai_assist'});
            } else if (aiResponseJson.length === 0 && !(aiResponseJson.startsWith("Error:") || aiResponseJson.startsWith("AI client is not initialized") || aiResponseJson.startsWith("Sorry, I'm having trouble"))) {
                 dispatch({type: 'ADD_MESSAGE', message: "The AI gave no response for command.", messageType: 'ai_assist'});
            }
        } else {
            dispatch({type: 'ADD_MESSAGE', message: "AI command response was not in the expected format.", messageType: 'ai_assist'});
            dispatch({ type: 'ADD_QUEUED_ACTIONS', payload: [{ type: 'ADD_MESSAGE', message: "Malformed AI command data (not an array).", messageType: 'error' }] });
        }

    } catch (error) {
        console.error("Error in AI command processing:", error);
        dispatch({type: 'ADD_MESSAGE', message: "Unexpected error with AI command processing.", messageType: 'error'});
    } finally {
        dispatch({ type: 'SET_AI_PROCESSING', payload: false });
    }
  };

  const handleAskAiQuery = async (queryString: string) => {
    if (gameState.isGameOver) {
        dispatch({type: 'ADD_MESSAGE', message: "The game is over. The spirits are silent.", messageType: 'error'});
        return;
    }

    // Cheat code detection
    const lowerQuery = queryString.toLowerCase().trim();
    if (lowerQuery === "give me gold") {
        const goldAmount = 1000;
        dispatch({ type: 'SET_GAME_STATE', payload: { player: { ...gameState.player, gold: gameState.player.gold + goldAmount } } });
        dispatch({ type: 'ADD_MESSAGE', message: `CHEAT ACTIVATED: You received ${goldAmount} gold! Poof!`, messageType: 'system' });
        // No SET_AI_PROCESSING needed if we return early before it's set to true
        return;
    }
    if (lowerQuery === "give attributes points" || lowerQuery === "give me attribute points" || lowerQuery === "give attribute points") {
        const pointsAmount = 5;
        dispatch({ type: 'SET_GAME_STATE', payload: { player: { ...gameState.player, attributePoints: gameState.player.attributePoints + pointsAmount } } });
        dispatch({ type: 'ADD_MESSAGE', message: `CHEAT ACTIVATED: You gained ${pointsAmount} attribute points! Power surges!`, messageType: 'system' });
        return;
    }

    dispatch({ type: 'SET_AI_PROCESSING', payload: true });
    dispatch({ type: 'ADD_MESSAGE', message: `AI Assistant is pondering your question: "${queryString}"...`, messageType: 'ai_assist' });

    const currentLocation = gameState.allLocations[gameState.currentLocationId];
    if (!currentLocation) {
        dispatch({type: 'ADD_MESSAGE', message: "Error: Current location data is missing. Cannot process query.", messageType: 'error'});
        dispatch({ type: 'SET_AI_PROCESSING', payload: false });
        return;
    }

    const visibleItems = currentLocation.itemIds.map(id => gameState.allItems[id]).filter(Boolean) as Item[];
    const visibleNpcs = currentLocation.npcIds.map(id => gameState.allNpcs[id]).filter(Boolean) as NPCData[];
    const playerInventory = gameState.player.inventory;
    const equippedItemsString = Object.entries(gameState.player.equippedItems)
        .filter(([, item]) => item !== null)
        .map(([slot, item]) => `${slot}: ${item!.name}`)
        .join('; ') || 'None';

    let combatContext = "";
    if (gameState.combatState && gameState.combatState.currentAttackingEnemyCombatId) {
        const activeEnemy = gameState.combatState.activeEnemies.find(e => e.combatId === gameState.combatState!.currentAttackingEnemyCombatId);
        if (activeEnemy) {
            combatContext = `Player is IN COMBAT (1v1 focus).\nCurrently fighting: ${activeEnemy.name} (Health: ${activeEnemy.health}/${activeEnemy.maxHealth}).\n`;
        }
        if (gameState.combatState.waitingEnemies.length > 0) {
            combatContext += `Enemies waiting: ${gameState.combatState.waitingEnemies.map(e => e.name).join(', ')}.\n`;
        }
        if (gameState.player.powerAttackCooldown > 0) combatContext += `Player Power Attack Cooldown: ${gameState.player.powerAttackCooldown} turns.\n`;
    }

    const activeQuestsString = Object.values(gameState.activeQuests).map(q => `- ${q.title}: ${q.stages[q.currentStageIndex].description}`).join('\n') || 'None';
    const completedQuestsString = Object.values(gameState.completedQuests).map(q => `- ${q.title} (Completed)`).join('\n') || 'None';


    const gameContextForQuery = `
Player Name: ${gameState.player.name}, Level: ${gameState.player.level}, Health: ${gameState.player.health}/${gameState.player.maxHealth}
Player Stats: Str-${gameState.player.Strength}, Dex-${gameState.player.Dexterity}, Con-${gameState.player.Constitution}, Int-${gameState.player.Intelligence}, Agi-${gameState.player.Agility}
Player Power Attack Cooldown: ${gameState.player.powerAttackCooldown > 0 ? `${gameState.player.powerAttackCooldown} turns` : 'Ready'}
Current Location: ${currentLocation.name} - ${typeof currentLocation.description === 'function' ? currentLocation.description(gameState) : 'No description.'}
Items in Location: ${visibleItems.length > 0 ? visibleItems.map(i => i.name).join(', ') : 'None'}
NPCs in Location: ${visibleNpcs.length > 0 ? visibleNpcs.map(n => `${n.name}${n.isVendor ? ' (Vendor)' : ''}${n.isHealer ? ' (Healer)' : ''}`).join(', ') : 'None'}
Player Inventory: ${playerInventory.length > 0 ? playerInventory.map(i => i.name).join(', ') : 'Empty'}
Equipped Items: ${equippedItemsString}
Gold: ${gameState.player.gold}g
Active Quests:
${activeQuestsString}
Completed Quests:
${completedQuestsString}
${combatContext}
    `;

    const systemInstructionForQuery = `You are a friendly and helpful game assistant for the text-based adventure game 'Whispering Wood Saga'. The player is asking for guidance or information.
Based on the player's question and the provided game context:
- Provide concise and useful hints.
- Explain game mechanics if asked (e.g., how attack types like thrust, slash, power work, or about enemy vulnerabilities).
- Analyze the situation if requested.
- Suggest possible next steps or areas to explore.
- Avoid revealing major spoilers or direct solutions unless the player is clearly stuck and asks for explicit help.
- If the question is vague, offer general advice relevant to their current situation.
- Respond in a slightly immersive or thematic tone, fitting a fantasy world, but keep it clear.
- Do not try to parse the question as a game command. You are here to answer the question.
- If the question is about enemy weaknesses, you can hint at general types of weaknesses (e.g., "Skeletons don't like being smashed," or "Goblins are quick, but their torsos might be vulnerable to a well-aimed thrust.") without giving exact numbers.
- If the question is completely unrelated to the game, politely state that you can only help with game-related queries.`;

    const fullPromptForQuery = `Game Context:\n${gameContextForQuery}\n\nPlayer's Question: "${queryString}"\n\nAssistant's Helpful Answer:`;

    try {
        const aiResponse = await callGemini(fullPromptForQuery, systemInstructionForQuery);
        dispatch({ type: 'ADD_MESSAGE', message: `AI Assistant: ${aiResponse}`, messageType: 'ai_assist' });
    } catch (error) {
        console.error("Error in AI query processing:", error);
        dispatch({type: 'ADD_MESSAGE', message: "AI Assistant had trouble understanding that.", messageType: 'error'});
    } finally {
        dispatch({ type: 'SET_AI_PROCESSING', payload: false });
    }
  };


  const processCommand = useCallback(async (input: string) => {
    if ((gameState.isLoading && !gameState.combatState) || gameState.isGameOver) {
      if (gameState.isGameOver) dispatch({type: 'ADD_MESSAGE', message: "The game is over. Your journey has ended.", messageType: 'system'});
      return;
    }
    if (gameState.isAiProcessing) {
        dispatch({type: 'ADD_MESSAGE', message: "Please wait, AI is processing...", messageType: 'system'});
        return;
    }

    dispatch({type: 'ADD_MESSAGE', message: `> ${input}`, messageType: 'player'});

    if (input.startsWith('?')) {
        const queryString = input.substring(1).trim();
        if (queryString) {
            await handleAskAiQuery(queryString);
        } else {
            dispatch({type: 'ADD_MESSAGE', message: "What would you like to ask the AI assistant?", messageType: 'system'});
        }
        return;
    }

    const [command] = input.toLowerCase().split(' ');

    if (gameState.combatState && gameState.combatState.playerTurn) {
        await handleAiDrivenCommand(input);
        return;
    }
    if (gameState.currentDialogueNpcId && command !== 'cancel') {
         await handleAiDrivenCommand(input);
         return;
    }


    switch (command) {
      case 'save':
        dispatch({type: 'ADD_MESSAGE', message: 'Use the "Save Game" button or type "save" to get your save code.', messageType: 'system'});
        break;
      case 'load':
        dispatch({type: 'ADD_MESSAGE', message: 'Use the "Load from Code" button or type "load" to input your save code.', messageType: 'system'});
        break;
      case 'help':
        dispatch({type: 'ADD_MESSAGE', message: 'Commands: go [dir], look/examine [target/room/self], take/get [item], use [item] (on [body part]), equip [item] (to [slot]), unequip [slot], inv, stats, allocate [N] points to [stat], talk [npc], quests, save, load, help. Combat: attack [thrust/slash/power] ([body part]), use [potion], evade, defend. Ask AI for help: ? [your question]', messageType: 'system'});
        break;
      case 'inventory': case 'inv': case 'i':
        const invItems = gameState.player.inventory;
        if (invItems.length === 0) {
            dispatch({type: 'ADD_MESSAGE', message: 'Your inventory is empty.', messageType: 'game'});
        } else {
            dispatch({type: 'ADD_MESSAGE', message: 'You are carrying:\n' + invItems.map(i => `- ${i.name} (Value: ${i.value}g)`).join('\n'), messageType: 'game'});
        }
        break;
      case 'stats': case 'status':
        const p = gameState.player;
        const bodyConditions = Object.entries(p.bodyParts).map(([part, state]) => `${part}: ${state.currentHp}/${state.maxHp} (${state.condition})`).join('\n  ');
        const equipped = Object.entries(p.equippedItems).filter(([,item])=>item).map(([slot,item])=>`${slot}: ${item!.name}`).join('\n  ') || 'Nothing';
        dispatch({type: 'ADD_MESSAGE', message:
`Character: ${p.name} (Level ${p.level})
XP: ${p.xp}/${p.xpToNextLevel}, Attribute Points: ${p.attributePoints}
Health: ${p.health}/${p.maxHealth}
Stats: Str-${p.Strength}, Dex-${p.Dexterity}, Con-${p.Constitution}, Int-${p.Intelligence}, Agi-${p.Agility}
Gold: ${p.gold}g
Power Attack Cooldown: ${p.powerAttackCooldown > 0 ? `${p.powerAttackCooldown} turns` : 'Ready'}
Body Condition:
  ${bodyConditions}
Equipped:
  ${equipped}
`, messageType: 'game'});
        break;
      case 'quests': case 'journal':
         const active = Object.values(gameState.activeQuests);
         const completed = Object.values(gameState.completedQuests);
         let questMsg = "Active Quests:\n";
         if (active.length > 0) questMsg += active.map(q => `- ${q.title}: ${q.stages[q.currentStageIndex].description}`).join('\n');
         else questMsg += "- None\n";
         questMsg += "\nCompleted Quests:\n";
         if (completed.length > 0) questMsg += completed.map(q => `- ${q.title}`).join('\n');
         else questMsg += "- None";
         dispatch({type: 'ADD_MESSAGE', message: questMsg, messageType: 'quest'});
        break;
      case 'cancel':
        if (gameState.aiInteraction.type !== 'none') {
            dispatch({ type: 'SET_AI_INTERACTION', payload: initialAiInteractionState });
            dispatch({ type: 'ADD_MESSAGE', message: "AI interaction cancelled.", messageType: 'system' });
        } else if (gameState.currentDialogueNpcId) { dispatch({ type: 'END_DIALOGUE' }); }
        else { dispatch({ type: 'ADD_MESSAGE', message: "Nothing to cancel.", messageType: 'system' });}
        break;
      default:
        await handleAiDrivenCommand(input);
    }
  }, [gameState, dispatch]);

  return { gameState, dispatch, processCommand };
}
