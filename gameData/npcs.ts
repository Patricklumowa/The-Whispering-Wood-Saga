
import { NPCData, GameState, Player, DialogueActionReturn, DialogueStageActionReturn, GameAction, ItemType, BodyPart, BodyPartCondition, DialogueChoice } from '../types';

export const NPCS_DATA: Record<string, NPCData> = {
  'old_hermit': {
    id: 'old_hermit',
    name: 'Old Hermit',
    description: 'A wizened old man with piercing eyes. He seems to know more than he lets on.',
    initialDialogueStage: 'start',
    dialogue: {
      'start': {
        text: (player: Player, npc: NPCData, gameState: GameState) => {
            const orbQuest = gameState.activeQuests['find_mystic_orb'] || gameState.completedQuests['find_mystic_orb'];
            if (orbQuest && orbQuest.isCompleted) {
                 return `"The woods are calmer, thanks to you, ${player.name}. But I sense a new disquiet, a shadow stirring..."`;
            }
            if (orbQuest && orbQuest.currentStageIndex === 2) { // Orb placed, needs to talk to hermit
                return `"You've returned, ${player.name}. I felt a shift in the woods. Did you place the Orb in the Mossy Clearing?"`;
            }
            return `"The hermit looks you up and down. "Another wanderer, eh? The Whispering Wood to the north is dangerous, ${player.name}. Best be prepared if you venture there."`;
        },
        choices: [
          {
            text: "Yes, I placed the Orb. The clearing felt... peaceful.",
            nextStage: 'orb_placed_confirm',
            requiredQuestStage: { questId: 'find_mystic_orb', stage: 2}
          },
          { text: "Ask about the woods.", nextStage: 'woods_info', requiredQuestStage: {questId: 'find_mystic_orb', stage: 'not_started'} },
          { text: "Ask if he needs help.", nextStage: 'ask_help', requiredQuestStage: {questId: 'find_mystic_orb', stage: 'not_started'} },
          {
            text: "Ask about the 'new disquiet' or 'shadow stirring'.",
            nextStage: 'shadow_intro',
            requiredQuestStage: { questId: 'find_mystic_orb', stage: 'completed' }
          },
          { text: "Leave.", closesDialogue: true },
        ],
      },
      'woods_info': {
        text: (player: Player, npc: NPCData, gameState: GameState) => `"The Whispering Wood... they say ancient things stir within. Goblins, and worse. If you seek something, tread carefully."`,
        choices: [
          { text: "Anything else?", nextStage: 'start' },
          { text: "Leave.", closesDialogue: true },
        ],
      },
      'ask_help': {
        text: (player: Player, npc: NPCData, gameState: GameState) => `"Help? Heh. Perhaps. There's a Mystic Orb hidden deep in the woods. Said to have calming properties. If you were to find it and bring it to the Mossy Clearing, it might appease the restless spirits there. What say you?"`,
        choices: [
          {
            text: "I'll find the Mystic Orb.",
            nextStage: 'accept_orb_quest_action',
          },
          { text: "I can't right now.", nextStage: 'start' },
        ],
      },
      'accept_orb_quest_action': {
        text: (p,n,gs) => "The hermit nods. \"Good. The spirits of the wood will thank you, as will I.\"",
        action: (game: GameState): DialogueActionReturn => {
            if (!game.activeQuests['find_mystic_orb'] && !game.completedQuests['find_mystic_orb']) {
              return {
                followUpActions: { type: 'START_QUEST', questId: 'find_mystic_orb' }
              };
            }
            return { message: "You've already accepted this task."};
          },
        autoAdvanceTo: 'accept_orb_quest_details',
      },
      'accept_orb_quest_details': {
          text: (player: Player, npc: NPCData, gameState: GameState) => `"The orb is said to be in the deepest parts of the woods. Look for a pedestal. Then take it to the Mossy Clearing. Be safe."`,
          endsDialogue: true,
      },
      'orb_placed_confirm': {
        text: (player: Player, npc: NPCData, gameState: GameState) => `"Excellent, ${player.name}. That was a vital task. The balance, for a time, is restored there. Take this for your troubles."`,
        action: (game: GameState): DialogueStageActionReturn => {
            if(game.activeQuests['find_mystic_orb'] && game.activeQuests['find_mystic_orb'].currentStageIndex === 2) {
                return { followUpActions: { type: 'ADVANCE_QUEST', questId: 'find_mystic_orb', stageIndex: 3 }};
            }
            return {};
        },
        autoAdvanceTo: 'shadow_intro',
      },
      'shadow_intro': {
        text: (player, npc, gs) => `The hermit's gaze becomes distant. "The calm is fragile. A shadow grows, ${player.name}. Not of these woods, but something older, fouler. It festers in forgotten places. I sense its tendrils reaching even towards the old ruins west of the Deep Woods. Will you investigate this encroaching darkness? The fate of these lands might depend on it."`,
        choices: [
            {
                text: "I will investigate the ruins and this shadow.",
                nextStage: 'accept_shadow_quest_action',
            },
            { text: "I need to prepare first.", nextStage: 'start'},
        ]
      },
      'accept_shadow_quest_action': {
        text: (p,n,gs) => `"Brave soul. The path will be perilous. Look for signs of unnatural corruption. The ruins are a good place to start. May your light pierce the darkness."`,
        action: (game: GameState): DialogueActionReturn => {
            if (!game.activeQuests['the_spreading_shadow'] && !game.completedQuests['the_spreading_shadow']) {
                return { followUpActions: { type: 'START_QUEST', questId: 'the_spreading_shadow' } };
            }
            return { message: "You are already committed to this path." };
        },
        endsDialogue: true,
      },
    },
    relatedQuestIds: ['find_mystic_orb', 'the_spreading_shadow'],
  },
  'worried_villager': {
    id: 'worried_villager',
    name: 'Worried Villager (Elara)',
    description: 'A young woman named Elara, wringing her hands and looking distressed.',
    initialDialogueStage: 'start',
    dialogue: {
      'start': {
        text: (player: Player, npc: NPCData, game: GameState) => {
          const quest = game.activeQuests['goblin_menace'];
          if (quest && quest.isCompleted) {
            return `"Thank you again for dealing with those goblins, ${player.name}. The paths are much safer."`;
          }
          if (quest && quest.currentStageIndex === 1 && player.inventory.some(item => item.id === 'goblin_ear')) {
            return `"Oh, you found... one of *their* ears? That means you've dealt with some of them! Did you get enough?"`;
          }
          return `"Oh, brave traveler! Goblins have been spotted near the forest entrance, harassing anyone who passes. My son was supposed to return from gathering herbs hours ago! Will you help?"`;
        },
        choices: [
          {
            text: "I'll deal with the goblins.",
            nextStage: 'accept_goblin_quest_action',
            requiredQuestStage: { questId: 'goblin_menace', stage: 'not_started' }
          },
          {
            text: "Here are the goblin ears you wanted.",
            nextStage: 'goblin_ears_delivered_action',
            requiredQuestStage: { questId: 'goblin_menace', stage: 1 }
          },
          { text: "I can't help right now.", closesDialogue: true },
          { text: "Goodbye.", closesDialogue: true, requiredQuestStage: { questId: 'goblin_menace', stage: 'completed'}},
        ],
      },
      'accept_goblin_quest_action': {
        text: (p,n,gs) => "Elara sighs in relief. \"Oh, thank you! Be careful, they are vicious!\"",
        action: (game: GameState): DialogueActionReturn => {
            if (!game.activeQuests['goblin_menace'] && !game.completedQuests['goblin_menace']) {
              return {
                followUpActions: { type: 'START_QUEST', questId: 'goblin_menace' }
              };
            }
            return { message: "You are already on this task." };
          },
        autoAdvanceTo: 'accept_goblin_quest_details'
      },
      'accept_goblin_quest_details': {
        text: (player: Player, npc: NPCData, gameState: GameState) => `"Please, defeat 3 goblins near the forest entrance. Bring me back proof, perhaps... some of their ears, as gruesome as that sounds. It's the only way we'll know it's safe."`,
        endsDialogue: true,
      },
      'goblin_ears_delivered_action': {
          text: (p,n,gs) => "Processing goblin ears...",
          action: (game: GameState): DialogueActionReturn => {
              const goblinEarsInInventory = game.player.inventory.filter(item => item.id === 'goblin_ear').length;
              const requiredEars = game.allQuests['goblin_menace']?.stages[1]?.targetCount || 3;
              if (goblinEarsInInventory >= requiredEars) {
                let earsToRemove = requiredEars;
                const newInventory = game.player.inventory.filter(item => {
                    if (item.id === 'goblin_ear' && earsToRemove > 0) {
                        earsToRemove--;
                        return false;
                    }
                    return true;
                });

                const followUpActions: GameAction[] = [
                    {type: 'SET_GAME_STATE', payload: { player: {...game.player, inventory: newInventory}}},
                    {type: 'ADVANCE_QUEST', questId: 'goblin_menace', stageIndex: 2}
                ];
                return {
                    followUpActions: followUpActions
                };
              } else {
                return { message: `"You don't have enough goblin ears yet. I believe you needed ${requiredEars}."`};
              }
            },
          autoAdvanceTo: 'goblin_ears_delivered_text'
      },
      'goblin_ears_delivered_text': {
        text: (player: Player, npc: NPCData, gameState: GameState) => {
            if (gameState.completedQuests['goblin_menace'] || (gameState.activeQuests['goblin_menace'] && gameState.activeQuests['goblin_menace'].currentStageIndex === 2) ) {
                return `"Thank you again, brave ${player.name}. Willow Creek is safer because of you. Please, take this as a token of my gratitude."`;
            }
            return `"You still need to collect enough goblin ears."`;
        },
        endsDialogue: true,
      }
    },
    relatedQuestIds: ['goblin_menace'],
  },
  'borin_blacksmith': {
    id: 'borin_blacksmith',
    name: 'Borin Ironbeard',
    description: 'A stout dwarf with a magnificent beard, soot-stained apron, and powerful arms. He looks busy but acknowledges your presence.',
    initialDialogueStage: 'greet',
    isVendor: true,
    sellsItemIds: [
        'iron_sword', 'leather_armor', 'health_potion', 'iron_helmet', 'crude_splint',
        'wooden_buckler', 'short_bow', 'studded_leather_armor', 'sturdy_iron_boots',
        'rough_leather_gloves', 'iron_kite_shield'
    ],
    buysItemTypes: [ItemType.WEAPON, ItemType.ARMOR, ItemType.MISC, ItemType.SHIELD, ItemType.TOOL],
    dialogue: {
        'greet': {
            text: (player: Player, npc: NPCData, gameState: GameState) => {
                const hammerQuest = gameState.activeQuests['borins_lost_hammer'] || gameState.completedQuests['borins_lost_hammer'];
                if (hammerQuest && hammerQuest.isCompleted) {
                    return `"Back again, ${player.name}? Thanks for finding me hammer, she's singing sweetly on the anvil now! Need anything else?"`;
                }
                if (hammerQuest && player.inventory.some(i => i.id === 'borins_lost_hammer')) {
                    return `"By my beard, is that... me hammer?! You found it, lad/lass!"`;
                }
                if (hammerQuest && hammerQuest.currentStageIndex === 0) {
                    return `"Blast and botheration! Can't find me favorite hammer anywhere! Without it, me work suffers. Say, you look like you can handle yerself. Interested in a small job?"`;
                }
                return `"Welcome to Borin's Ironworks, traveler. Need a sturdy blade, some mending, or perhaps you're looking to trade?"`;
            },
            choices: [
                { text: "What do you have for sale?", nextStage: 'shop_dialogue' },
                { text: "I'd like to sell some goods.", nextStage: 'sell_dialogue' },
                {
                    text: "A small job? Tell me more.",
                    nextStage: 'hammer_quest_intro',
                    requiredQuestStage: { questId: 'borins_lost_hammer', stage: 'not_started'}
                },
                {
                    text: "I found this hammer. Is it yours?",
                    nextStage: 'return_hammer_action',
                    requiredQuestStage: { questId: 'borins_lost_hammer', stage: 0 },
                    action: (game) => game.player.inventory.some(i => i.id === 'borins_lost_hammer') ? undefined : {message: "You don't seem to have his hammer."}
                },
                { text: "Ask about his work.", nextStage: 'work_chat' },
                { text: "Leave.", closesDialogue: true },
            ]
        },
        'shop_dialogue': {
            text: (player: Player, npc: NPCData, gameState: GameState) => {
                let saleText = "Aye, got some fine wares.\n";
                npc.sellsItemIds?.forEach(id => {
                    const item = gameState.allItems[id];
                    if (item) saleText += `- ${item.name} (${item.value} gold)\n`;
                });
                saleText += "\n(To buy, type 'buy [item name]' when not in dialogue, or use the AI command 'buy [item name] from Borin')";
                return saleText;
            },
            choices: [ { text: "Interesting. (Back to options)", nextStage: 'greet'} ]
        },
        'sell_dialogue': {
            text: (player: Player, npc: NPCData, gameState: GameState) => {
                return "Got something to part with, eh? I'm always interested in decent weapons, armor, shields, and sometimes other useful bits. (To sell, type 'sell [item name]' when not in dialogue, or use the AI command 'sell [item name] to Borin')";
            },
             choices: [ { text: "Good to know. (Back to options)", nextStage: 'greet'} ]
        },
        'work_chat': {
            text: (player: Player, npc: NPCData, gameState: GameState) => `"Keeps me busy, this forge. Always something to hammer out. Quality dwarven steel, none of that flimsy human stuff!" He chuckles.`,
            choices: [
                 { text: "Back to other options.", nextStage: 'greet'},
                 { text: "Leave.", closesDialogue: true },
            ]
        },
        'hammer_quest_intro': {
            text: (p,n,gs) => `"My best forging hammer! Vanished! Think I might've left it in the Deep Woods when I was out gathering special ironwood. If you could find it, I'd be mighty grateful. There's a good bit of coin in it for ya, and maybe a discount."`,
            choices: [
                { text: "I'll find your hammer, Borin.", nextStage: 'accept_hammer_quest_action' },
                { text: "Sorry, can't help with that now.", nextStage: 'greet'},
            ]
        },
        'accept_hammer_quest_action': {
            text: (p,n,gs) => `"Bless yer heart! It's a dwarven make, can't miss it. Probably near where the path gets tricky in the Deep Woods."`,
            action: (game: GameState): DialogueActionReturn => {
                if (!game.activeQuests['borins_lost_hammer'] && !game.completedQuests['borins_lost_hammer']) {
                  return { followUpActions: { type: 'START_QUEST', questId: 'borins_lost_hammer' } };
                }
                return { message: "You're already looking for it!" };
            },
            endsDialogue: true,
        },
        'return_hammer_action': {
            text: (p,n,gs) => "Processing hammer return...",
            action: (game: GameState): DialogueActionReturn => {
                if (game.player.inventory.some(i => i.id === 'borins_lost_hammer')) {
                    const newInventory = game.player.inventory.filter(i => i.id !== 'borins_lost_hammer');
                    return {
                        followUpActions: [
                            { type: 'SET_GAME_STATE', payload: { player: {...game.player, inventory: newInventory }}},
                            { type: 'ADVANCE_QUEST', questId: 'borins_lost_hammer', stageIndex: 1 }
                        ]
                    };
                }
                return { message: "You don't seem to have the hammer on you."};
            },
            autoAdvanceTo: 'hammer_returned_thanks',
        },
        'hammer_returned_thanks': {
            text: (p,n,gs) => {
                if (gs.completedQuests['borins_lost_hammer']) {
                    return `"She sings on the anvil once more! My eternal thanks, friend. Here's your reward, as promised!"`;
                }
                return `"You don't have my hammer!"`;
            },
            endsDialogue: true,
        }
    },
    relatedQuestIds: ['borins_lost_hammer'],
  },
  'grizelda_huntress': {
    id: 'grizelda_huntress',
    name: 'Grizelda the Huntress',
    description: 'A stern-faced woman with keen eyes, dressed in practical leathers. A longbow is slung over her shoulder.',
    initialDialogueStage: 'greet',
    dialogue: {
        'greet': {
            text: (p, n, gs) => {
                const spiderQuest = gs.activeQuests['spider_extermination'] || gs.completedQuests['spider_extermination'];
                const goblinOutpostQuest = gs.activeQuests['clear_goblin_outpost'] || gs.completedQuests['clear_goblin_outpost'];

                if (spiderQuest && spiderQuest.isCompleted) {
                    return `"The cave is quieter now, thanks to you, ${p.name}. Good hunting out there."`;
                }
                if (spiderQuest && p.inventory.some(i => i.id === 'spider_venom_gland')) {
                    return `"You smell of the cave... and spider. Did you manage to deal with that monstrous arachnid?"`;
                }
                if (goblinOutpostQuest && goblinOutpostQuest.isCompleted) {
                    return `"The eastern path is clearer since you thinned out those goblins. Well done."`;
                }
                 if (goblinOutpostQuest && goblinOutpostQuest.currentStageIndex === 0) { 
                    return `"Those goblins at the eastern outpost are still a nuisance. Have you made them reconsider their life choices yet?"`;
                }
                return `"You're new to these parts of the woods. Watch your step; it's wilder here. I'm Grizelda."`;
            },
            choices: [
                { text: "What do you hunt around here?", nextStage: 'hunt_info' },
                { text: "Any dangerous creatures I should know about?", nextStage: 'danger_info' },
                {
                    text: "I dealt with the Giant Cave Spider. Here's its venom gland.",
                    nextStage: 'return_venom_gland_action',
                    requiredQuestStage: {questId: 'spider_extermination', stage: 0},
                    action: (game) => game.player.inventory.some(i => i.id === 'spider_venom_gland') ? undefined : {message: "You don't have the venom gland."}
                },
                 {
                    text: "About that goblin outpost...",
                    nextStage: 'goblin_outpost_status',
                    requiredQuestStage: {questId: 'clear_goblin_outpost', stage: 0}
                },
                { text: "Leave.", closesDialogue: true },
            ]
        },
        'hunt_info': {
            text: (p,n,gs) => `"Mostly dire wolves and the occasional overgrown boar. Keeps the beasts from getting too bold and provides good pelts. Sometimes... bigger things need culling. And those goblins to the east are a constant headache."`,
            choices: [
                { text: "Bigger things?", nextStage: 'danger_info'},
                { text: "Goblins to the east?", nextStage: 'goblin_outpost_intro'},
                { text: "Back.", nextStage: 'greet'}
            ]
        },
        'danger_info': {
            text: (p,n,gs) => `"Aye. There's a dark cave north of here. Lately, a Giant Cave Spider has taken up residence. Vicious thing. Its venom is potent. If you're feeling brave and skilled enough to take it down, I'd pay well for its venom gland. Helps with making strong antidotes."`,
            choices: [
                { text: "I'll take care of that spider for you.", nextStage: 'accept_spider_quest_action', requiredQuestStage: {questId: 'spider_extermination', stage: 'not_started'}},
                { text: "A giant spider? No thanks.", nextStage: 'greet'},
            ]
        },
        'goblin_outpost_intro': {
            text: (p,n,gs) => `"A nasty band of them have set up a camp to the east of the main forest entrance. They're getting bolder, raiding anyone who gets too close. Someone needs to clear them out before they cause serious trouble."`,
            choices: [
                { text: "I can clear out the goblin outpost.", nextStage: 'accept_goblin_outpost_quest_action', requiredQuestStage: {questId: 'clear_goblin_outpost', stage: 'not_started'}},
                { text: "I'll keep an eye out.", nextStage: 'greet'},
            ]
        },
        'accept_spider_quest_action': {
            text: (p,n,gs) => `"Ha! Got guts, I'll give ya that. Find its lair in the Dark Cave to the north. Bring me the venom gland as proof. Don't get yourself killed."`,
            action: (game: GameState): DialogueActionReturn => {
                if (!game.activeQuests['spider_extermination'] && !game.completedQuests['spider_extermination']) {
                  return { followUpActions: { type: 'START_QUEST', questId: 'spider_extermination' } };
                }
                return { message: "You're already on the hunt!" };
            },
            endsDialogue: true,
        },
        'accept_goblin_outpost_quest_action': {
            text: (p,n,gs) => `"Good. That'll make the woods safer for everyone. Their main camp is east of the forest entrance. Taking out their leader should scatter them. Look for a crude totem too, they seem to draw power from it."`,
             action: (game: GameState): DialogueActionReturn => {
                if (!game.activeQuests['clear_goblin_outpost'] && !game.completedQuests['clear_goblin_outpost']) {
                  return { followUpActions: { type: 'START_QUEST', questId: 'clear_goblin_outpost' } };
                }
                return { message: "You've already taken on this task." };
            },
            endsDialogue: true,
        },
        'return_venom_gland_action': {
            text: (p,n,gs) => "Processing venom gland...",
            action: (game: GameState): DialogueActionReturn => {
                if (game.player.inventory.some(i => i.id === 'spider_venom_gland')) {
                    const newInventory = game.player.inventory.filter(i => i.id !== 'spider_venom_gland');
                    return {
                        followUpActions: [
                            { type: 'SET_GAME_STATE', payload: { player: {...game.player, inventory: newInventory }}},
                            { type: 'ADVANCE_QUEST', questId: 'spider_extermination', stageIndex: 1 }
                        ]
                    };
                }
                return { message: "You don't seem to have the venom gland on you."};
            },
            autoAdvanceTo: 'spider_quest_thanks',
        },
        'spider_quest_thanks': {
            text: (p,n,gs) => {
                 if (gs.completedQuests['spider_extermination']) {
                    return `"Impressive work, ${p.name}. This venom gland is perfect. Here's your payment. You've made the caves a bit safer."`;
                }
                return `"You don't have the gland!"`;
            },
            endsDialogue: true,
        },
        'goblin_outpost_status': { 
            text: (p, n, gs) => {
                const quest = gs.activeQuests['clear_goblin_outpost'];
                if (quest && quest.currentStageIndex === 1 && p.inventory.some(i => i.id === 'goblin_totem')) { 
                    return `"Ah, you have their totem! Excellent. That should disrupt them significantly. Well done."`;
                }
                 if (quest && quest.currentStageIndex === 0) {
                     return `"The outpost still stands. Their leader is likely in the largest hut. Taking them out and grabbing any focus of their power, like a totem, should do the trick."`;
                 }
                return `"How goes the goblin hunt?"`;
            },
            choices: [
                {
                    text: "I have the Goblin Totem.",
                    nextStage: 'return_goblin_totem_action',
                    requiredQuestStage: { questId: 'clear_goblin_outpost', stage: 1},
                    action: (game) => game.player.inventory.some(i => i.id === 'goblin_totem') ? undefined : {message: "You don't have the totem."}
                },
                { text: "Still working on it.", nextStage: 'greet'}
            ]
        },
        'return_goblin_totem_action': {
            text: (p,n,gs) => "Processing goblin totem...",
            action: (game: GameState): DialogueActionReturn => {
                if (game.player.inventory.some(i => i.id === 'goblin_totem')) {
                    const newInventory = game.player.inventory.filter(i => i.id !== 'goblin_totem');
                    return {
                        followUpActions: [
                            { type: 'SET_GAME_STATE', payload: { player: {...game.player, inventory: newInventory }}},
                            { type: 'ADVANCE_QUEST', questId: 'clear_goblin_outpost', stageIndex: 2 }
                        ]
                    };
                }
                return { message: "You don't seem to have the totem on you."};
            },
            autoAdvanceTo: 'goblin_outpost_thanks',
        },
        'goblin_outpost_thanks': {
             text: (p,n,gs) => {
                 if (gs.completedQuests['clear_goblin_outpost']) {
                    return `"That totem was key. Their power is broken. Good work, ${p.name}. Here's your reward."`;
                }
                return `"You don't have the totem!"`;
            },
            endsDialogue: true,
        }
    },
    relatedQuestIds: ['spider_extermination', 'clear_goblin_outpost'],
  },
  'master_eldrin': {
    id: 'master_eldrin',
    name: 'Master Eldrin',
    description: 'An elderly scholar with kind eyes and a slightly stooped posture. He is surrounded by books and scrolls.',
    initialDialogueStage: 'greet',
    dialogue: {
        'greet': {
            text: (p,n,gs) => {
                const shadowQuest = gs.activeQuests['the_spreading_shadow'];
                const tomeQuest = gs.activeQuests['lost_tome_of_eldoria'] || gs.completedQuests['lost_tome_of_eldoria'];
                const cryptQuest = gs.activeQuests['echoes_in_the_crypt'] || gs.completedQuests['echoes_in_the_crypt'];

                if (shadowQuest && shadowQuest.currentStageIndex === 2 && p.inventory.some(i => i.id === 'shadow_amulet')) {
                    return `"Welcome, traveler. You seem troubled. And what is that dark amulet you carry? It radiates a disturbing energy."`;
                }
                if (tomeQuest && tomeQuest.isCompleted && cryptQuest && cryptQuest.isCompleted) {
                     return `"Ah, ${p.name}, welcome back. Thanks to your efforts with the Tome and the Crypt, much lost knowledge is returning."`;
                }
                if (tomeQuest && tomeQuest.isCompleted) {
                    return `"Ah, ${p.name}, welcome back. Thanks to you, the Lost Tome is home. Its knowledge is slowly being deciphered."`;
                }
                if (tomeQuest && p.inventory.some(i => i.id === 'lost_tome_of_eldoria')) {
                    return `"By the First Scroll! Is that... the Lost Tome of Eldoria? I thought it was gone forever!"`;
                }
                if (cryptQuest && cryptQuest.currentStageIndex === 0) {
                     return `"I've heard unsettling whispers from the direction of the Forgotten Crypt. Strange echoes... if you're heading that way, could you investigate?"`;
                }
                return `"Greetings. Welcome to our humble library. I am Master Eldrin. Seeking knowledge, perhaps?"`;
            },
            choices: [
                { text: "Ask about local history.", nextStage: 'history_info'},
                {
                    text: "I found this strange amulet in some ruins.",
                    nextStage: 'shadow_amulet_dialogue',
                    requiredQuestStage: { questId: 'the_spreading_shadow', stage: 2},
                    action: (game) => game.player.inventory.some(i => i.id === 'shadow_amulet') ? undefined : {message: "You don't have the amulet with you."}
                },
                {
                    text: "Are you missing any important books?",
                    nextStage: 'tome_quest_intro',
                    requiredQuestStage: { questId: 'lost_tome_of_eldoria', stage: 'not_started'}
                },
                {
                    text: "I found this 'Lost Tome of Eldoria'. Is it yours?",
                    nextStage: 'return_tome_action',
                    requiredQuestStage: { questId: 'lost_tome_of_eldoria', stage: 0},
                    action: (game) => game.player.inventory.some(i => i.id === 'lost_tome_of_eldoria') ? undefined : {message: "You don't have the tome."}
                },
                 {
                    text: "Ask about the Forgotten Crypt.",
                    nextStage: 'crypt_quest_intro',
                    requiredQuestStage: { questId: 'echoes_in_the_crypt', stage: 'not_started'}
                },
                { text: "Is there anyone else here who might offer aid or wisdom?", nextStage: 'ask_about_others_in_library'},
                { text: "Leave.", closesDialogue: true },
            ]
        },
        'ask_about_others_in_library': {
            text: (p,n,gs) => {
                if (gs.allNpcs['village_healer_lyra'] && gs.allLocations['willow_creek_library'].npcIds.includes('village_healer_lyra')) {
                    return `"Ah, yes. Young Lyra tends to the village's ailments. She has a small space here. A kind soul, and skilled with herbs and poultices."`;
                }
                return `"It is usually just myself and the books, though occasionally other scholars visit."`;
            },
            choices: [{text: "Thank you. (Back to options)", nextStage: 'greet'}]
        },
        'history_info': {
            text: (p,n,gs) => `"Willow Creek has stood for generations, a small bastion of light. But these lands are ancient, and many secrets lie buried, both wondrous and terrible."`,
            choices: [ {text: "Interesting. (Back to options)", nextStage: 'greet'}]
        },
        'shadow_amulet_dialogue': {
            text: (p,n,gs) => `"This... this is an artifact of the Shadow Blight, a forgotten corruption from ages past. That it has resurfaced is dire news indeed. This amulet is a focus for its dark power. It must be understood, and its source found and sealed. The legends speak of a ritual that might contain its power, or perhaps even a way to destroy such artifacts, but the details are lost... or perhaps hidden in texts I do not possess."`,
            action: (game: GameState): DialogueActionReturn => {
                return { followUpActions: { type: 'ADVANCE_QUEST', questId: 'the_spreading_shadow', stageIndex: 3 } };
            },
            choices: [
                { text: "What can be done?", nextStage: 'shadow_amulet_next_steps'},
            ]
        },
        'shadow_amulet_next_steps': {
            text: (p,n,gs) => `"I need time to research. There might be mentions in obscure texts. Perhaps Grizelda the Huntress has heard tales from the deeper wilds, or Borin might know of ancient dwarven wards against such things. Seek out others while I study. And be wary, ${p.name}, carrying that amulet may draw unwanted attention."`,
            endsDialogue: true,
        },
        'tome_quest_intro': {
            text: (p,n,gs) => `"Indeed! The 'Lost Tome of Eldoria'. It contains crucial histories and lore, vanished years ago, believed to be somewhere in the Ancient Ruins to the west. Its recovery would be a great service to this village and to knowledge itself."`,
            choices: [
                {text: "I can search for this Lost Tome.", nextStage: 'accept_tome_quest_action'},
                {text: "The ruins sound dangerous. Maybe later.", nextStage: 'greet'},
            ]
        },
        'accept_tome_quest_action': {
            text: (p,n,gs) => `"Your bravery is commendable! The ruins are perilous, filled with remnants of the past and likely unsavory guardians. The Tome is said to be quite distinct, bound in dark leather with a silver clasp."`,
            action: (game: GameState): DialogueActionReturn => {
                if (!game.activeQuests['lost_tome_of_eldoria'] && !game.completedQuests['lost_tome_of_eldoria']) {
                  return { followUpActions: { type: 'START_QUEST', questId: 'lost_tome_of_eldoria' } };
                }
                return { message: "You are already on this task." };
            },
            endsDialogue: true,
        },
        'return_tome_action': {
             text: (p,n,gs) => "Processing tome return...",
            action: (game: GameState): DialogueActionReturn => {
                if (game.player.inventory.some(i => i.id === 'lost_tome_of_eldoria')) {
                    const newInventory = game.player.inventory.filter(i => i.id !== 'lost_tome_of_eldoria');
                    return {
                        followUpActions: [
                            { type: 'SET_GAME_STATE', payload: { player: {...game.player, inventory: newInventory }}},
                            { type: 'ADVANCE_QUEST', questId: 'lost_tome_of_eldoria', stageIndex: 1 }
                        ]
                    };
                }
                return { message: "You don't seem to have the tome on you."};
            },
            autoAdvanceTo: 'tome_returned_thanks',
        },
        'tome_returned_thanks': {
            text: (p,n,gs) => {
                if (gs.completedQuests['lost_tome_of_eldoria']) {
                    return `"Incredible! You've done an invaluable service, ${p.name}! The knowledge within... it will take time to decipher, but this is a treasure. Please, accept this for your efforts."`;
                }
                return `"You don't have the tome!"`;
            },
            endsDialogue: true,
        },
        'crypt_quest_intro': {
            text: (p,n,gs) => `"The Forgotten Crypt, east of the Ancient Grove... it has been sealed for generations. Lately, travelers have reported unsettling sounds, like echoing whispers, from its vicinity. If you are venturing that way, I would be grateful if you could investigate. Any inscriptions or artifacts you find might shed light on its history."`,
            choices: [
                { text: "I will investigate the Forgotten Crypt.", nextStage: 'accept_crypt_quest_action'},
                { text: "A crypt sounds ominous. I'll pass for now.", nextStage: 'greet'}
            ]
        },
        'accept_crypt_quest_action': {
            text: (p,n,gs) => `"Thank you, ${p.name}. Be cautious. Old crypts often have guardians, both mundane and... otherwise. Look for anything unusual – texts, symbols, or the source of these 'echoes'."`,
             action: (game: GameState): DialogueActionReturn => {
                if (!game.activeQuests['echoes_in_the_crypt'] && !game.completedQuests['echoes_in_the_crypt']) {
                  return { followUpActions: { type: 'START_QUEST', questId: 'echoes_in_the_crypt' } };
                }
                return { message: "You are already looking into this matter." };
            },
            endsDialogue: true,
        },
    },
    relatedQuestIds: ['the_spreading_shadow', 'lost_tome_of_eldoria', 'echoes_in_the_crypt'],
  },
  'merchant_silas': {
    id: 'merchant_silas',
    name: 'Silas the Trader',
    description: "Silas is a wiry man with a keen eye for a deal and a friendly, if somewhat calculating, smile. He gestures towards his modest collection of wares.",
    initialDialogueStage: 'greet',
    isVendor: true,
    sellsItemIds: ['health_potion', 'potion_of_strength', 'crude_splint', 'short_bow'],
    buysItemTypes: [ItemType.MISC, ItemType.POTION, ItemType.KEY, ItemType.WEAPON, ItemType.ARMOR, ItemType.TOOL],
    dialogue: {
        'greet': {
            text: (player, npc, gameState) => {
                const amuletQuest = gameState.activeQuests['serpents_eye_amulet'] || gameState.completedQuests['serpents_eye_amulet'];
                if (amuletQuest && amuletQuest.isCompleted) {
                    return `"Ah, ${player.name}, good to see you! Thanks again for handling that bandit business. Trade's been better since."`;
                }
                if (amuletQuest && player.inventory.some(i => i.id === 'serpents_eye_amulet_item')) {
                    return `"Well, well, look what the cat dragged in! Is that the Serpent's Eye Amulet I see?"`;
                }
                return "Welcome, traveler! Silas at your service. Looking for something special, or perhaps you have goods to trade?";
            },
            choices: [
                { text: "What do you have for sale?", nextStage: 'shop_dialogue' },
                { text: "I'd like to sell some goods.", nextStage: 'sell_dialogue' },
                {
                  text: "I have the Serpent's Eye Amulet.",
                  nextStage: 'return_amulet_action',
                  requiredQuestStage: { questId: 'serpents_eye_amulet', stage: 1 },
                  action: (game) => game.player.inventory.some(i => i.id === 'serpents_eye_amulet_item') ? undefined : {message: "You don't seem to have the amulet."}
                },
                {
                  text: "Anything interesting happening around here?",
                  nextStage: 'rumors',
                  requiredQuestStage: { questId: 'serpents_eye_amulet', stage: 'not_started' }
                },
                { text: "Leave.", closesDialogue: true },
            ]
        },
        'shop_dialogue': {
            text: (player, npc, gameState) => {
                let saleText = "Take a look at my wares:\n";
                npc.sellsItemIds?.forEach(id => {
                    const item = gameState.allItems[id];
                    if (item) saleText += `- ${item.name} (${item.value} gold)\n`;
                });
                saleText += "\n(To buy, type 'buy [item name]' when not in dialogue, or use the AI command 'buy [item name] from Silas')";
                return saleText;
            },
            choices: [ { text: "Maybe later. (Back to options)", nextStage: 'greet'} ]
        },
        'sell_dialogue': {
            text: (player, npc, gameState) => {
                return "Got something to part with, eh? I take most anything that's not outright cursed. (To sell, type 'sell [item name]' when not in dialogue, or use the AI command 'sell [item name] to Silas')";
            },
             choices: [ { text: "Good to know. (Back to options)", nextStage: 'greet'} ]
        },
        'rumors': {
            text: (player, npc, gameState) => `"Well, there's been talk of bandits waylaying travelers on the old King's Road, north of here. They say a particular family heirloom was stolen from a noble caravan. A 'Serpent's Eye Amulet', they call it. Sounds valuable... and dangerous to recover."`,
            choices: [
                { text: "Tell me more about this amulet.", nextStage: 'amulet_details' },
                { text: "Bandits, you say? Where is this King's Road?", nextStage: 'kings_road_info' },
                { text: "Interesting. (Back to other options)", nextStage: 'greet'},
            ]
        },
        'amulet_details': {
            text: (player, npc, gameState) => `"Supposedly belonged to the Baron Von Rothstein. More of a legend than anything, but if it's real, the Baron would pay handsomely for its return. The bandits are rumored to be holed up in an abandoned watchtower along the King's Road. I could... facilitate its return to the Baron, for a finder's fee, of course."`,
            choices: [
                { text: "I'll look into recovering this amulet.", nextStage: 'accept_serpent_eye_quest_action' },
                { text: "Sounds too risky for me.", nextStage: 'greet'},
            ]
        },
        'accept_serpent_eye_quest_action': {
            text: (player, npc, gameState) => `"Bold! The King's Road is north of here. Be careful, those bandits are no pushovers. Good luck!"`,
            action: (game: GameState): DialogueActionReturn => {
                if (!game.activeQuests['serpents_eye_amulet'] && !game.completedQuests['serpents_eye_amulet']) {
                  return { followUpActions: { type: 'START_QUEST', questId: 'serpents_eye_amulet' } };
                }
                return { message: "You're already on this task!" };
            },
            endsDialogue: true,
        },
        'kings_road_info': {
            text: (player, npc, gameState) => `"It's an old, overgrown road a ways north of this post. Not many use it these days, precisely because of ruffians like those bandits."`,
            endsDialogue: true,
        },
        'return_amulet_action': {
            text: (p,n,gs) => "Processing amulet return...",
            action: (game: GameState): DialogueActionReturn => {
                if (game.player.inventory.some(i => i.id === 'serpents_eye_amulet_item')) {
                    const newInventory = game.player.inventory.filter(i => i.id !== 'serpents_eye_amulet_item');
                    return {
                        followUpActions: [
                            { type: 'SET_GAME_STATE', payload: { player: {...game.player, inventory: newInventory }}},
                            { type: 'ADVANCE_QUEST', questId: 'serpents_eye_amulet', stageIndex: 2 }
                        ]
                    };
                }
                return { message: "You don't seem to have the amulet on you."};
            },
            autoAdvanceTo: 'amulet_returned_thanks',
        },
        'amulet_returned_thanks': {
            text: (p,n,gs) => {
                 if (gs.completedQuests['serpents_eye_amulet']) {
                    return `"Magnificent! The Baron will be most pleased. And as for your reward... here you are. A pleasure doing business with you, ${p.name}!"`;
                }
                return `"You don't have the amulet on you right now."`;
            },
            endsDialogue: true,
        }
    },
    relatedQuestIds: ['serpents_eye_amulet'],
  },
  'innkeeper_barley': {
    id: 'innkeeper_barley',
    name: 'Barley Buttercup',
    description: 'The innkeeper of the Sleeping Dragon Inn, a cheerful halfling with a welcoming smile.',
    initialDialogueStage: 'greet',
    dialogue: {
      'greet': {
        text: (p,n,gs) => `"Welcome to the Sleeping Dragon, friend! Best beds and ale in Willow Creek. What can I get for ya?"`,
        choices: [
          { text: "I'd like to rent a room. (10 Gold)", nextStage: 'rent_room_confirm' },
          { text: "Any news or rumors?", nextStage: 'rumors' },
          { text: "Just looking around. (Leave)", closesDialogue: true },
        ]
      },
      'rent_room_confirm': {
        text: (p,n,gs) => {
          if (gs.player.gold >= 10) {
            return `"Excellent choice! That'll be 10 gold for a good night's rest. Shall I prepare a room?"`;
          }
          return `"A room is 10 gold, friend. Looks like you're a bit short at the moment."`;
        },
        choices: [
          {
            text: "Yes, please. (Pay 10 Gold)",
            nextStage: 'rent_room_action',
            action: (gs) => gs.player.gold >= 10 ? undefined : { message: "You can't afford the room.", nextStage: 'greet' }
          },
          { text: "Maybe later.", nextStage: 'greet' },
        ]
      },
      'rent_room_action': {
        text: (p,n,gs) => `"Right this way... Zzzzz..."`, // Player "sleeps"
        action: (gs: GameState): DialogueStageActionReturn => {
          const player = gs.player;
          player.gold -= 10;
          player.health = player.maxHealth;
          let restedMessage = "You wake up feeling refreshed. Your health is fully restored, and minor wounds have healed.";
          let hasSevereInjuries = false;
          for (const partName in player.bodyParts) {
            const part = player.bodyParts[partName as BodyPart];
            if (part.condition !== BodyPartCondition.SEVERELY_INJURED) {
              part.currentHp = part.maxHp;
              part.condition = BodyPartCondition.HEALTHY;
            } else {
              hasSevereInjuries = true;
            }
          }
          if (hasSevereInjuries) {
            restedMessage += " However, your more severe injuries still ache and will need proper tending.";
          }
          return { message: restedMessage, followUpActions: { type: 'SET_GAME_STATE', payload: { player }}};
        },
        endsDialogue: true,
      },
      'rumors': {
        text: (p,n,gs) => `"Well, Silas from the Riverside Trading Post was in earlier, muttering about some valuable amulet stolen by bandits. Sounded like quite the treasure hunt!"`,
        choices: [
          { text: "Interesting. (Back to options)", nextStage: 'greet' }
        ]
      }
    }
  },
  'village_healer_lyra': {
    id: 'village_healer_lyra',
    name: 'Lyra the Healer',
    description: 'Lyra is a kind-faced woman with gentle eyes, her small alcove in the library filled with the scent of dried herbs and poultices.',
    initialDialogueStage: 'greet',
    isHealer: true,
    dialogue: {
      'greet': {
        text: (p,n,gs) => {
          const severelyInjuredParts = Object.entries(gs.player.bodyParts)
            .filter(([_, state]) => state.condition === BodyPartCondition.SEVERELY_INJURED)
            .map(([partKey]) => partKey as BodyPart);

          if (severelyInjuredParts.length > 0) {
            return `"Welcome, traveler. You look like you've seen some trouble. I can tend to those severe wounds, if you wish. It requires skill and rare herbs, so I must charge a small fee."`;
          }
          return `"Greetings. May your path be peaceful. I am Lyra. If you ever suffer grievous wounds, I can offer my aid."`;
        },
        choices: [
          // Dynamic choices for treating specific severely injured body parts will be added by the game engine at runtime.
          // Static choices:
          { text: "What do you offer?", nextStage: 'services_explained' },
          { text: "No treatment needed now. (Leave)", closesDialogue: true },
        ]
      },
      'confirm_treatment': {
        text: (p,n,gs) => {
          const partToTreat = gs.aiInteraction?.data?.partToTreat as BodyPart | undefined;
          if (!partToTreat) return "Error: No body part selected for treatment.";
          if (gs.player.gold >= 25) {
            return `Are you sure you want me to treat your ${partToTreat.replace(/([A-Z])/g, ' $1').trim()} for 25 gold?`;
          }
          return `Treating your ${partToTreat.replace(/([A-Z])/g, ' $1').trim()} costs 25 gold. You seem to be short.`;
        },
        choices: [
          {
            text: "Yes, please treat it.",
            nextStage: 'perform_treatment_action',
            action: (gs) => gs.player.gold >= 25 ? undefined : { message: "You cannot afford the treatment.", nextStage: 'greet' }
          },
          { text: "No, not right now.", nextStage: 'greet' }
        ]
      },
      'perform_treatment_action': {
        text: (p,n,gs) => "Lyra carefully tends to the wound...",
        action: (gs: GameState): DialogueStageActionReturn => {
          const partToTreat = gs.aiInteraction?.data?.partToTreat as BodyPart | undefined;
          if (!partToTreat || !gs.player.bodyParts[partToTreat] || gs.player.bodyParts[partToTreat].condition !== BodyPartCondition.SEVERELY_INJURED) {
            return { message: "There was an issue selecting the part for treatment, or it's no longer severely injured." };
          }
          gs.player.gold -= 25;
          const bodyPartState = gs.player.bodyParts[partToTreat];
          bodyPartState.condition = BodyPartCondition.INJURED;
          bodyPartState.currentHp = Math.max(1, Math.floor(bodyPartState.maxHp * 0.3));

          const newAiInteraction = {...gs.aiInteraction, data: null};

          return {
            message: `Lyra skillfully tends to your ${partToTreat.replace(/([A-Z])/g, ' $1').trim()}. It feels much better, though still tender. Its condition is now ${BodyPartCondition.INJURED}.`,
            followUpActions: { type: 'SET_GAME_STATE', payload: { player: gs.player, aiInteraction: newAiInteraction } }
          };
        },
        autoAdvanceTo: 'greet' 
      },
      'services_explained': {
        text: (p,n,gs) => `"I can mend bones, stitch deep gashes, and draw out the worst of infections. If a part of you is severely injured, I can usually improve its condition so it can heal naturally with rest, or with potions. Each such treatment costs 25 gold for the herbs and supplies."`,
        choices: [
          { text: "Understood. (Back to options)", nextStage: 'greet' }
        ]
      }
    },
    greetChoicesGenerator: (p: Player, n: NPCData, gs: GameState): DialogueChoice[] => {
      if (!gs) return []; 
      const choices: DialogueChoice[] = [];
      const severelyInjuredParts = Object.entries(gs.player.bodyParts)
        .filter(([_, state]) => state.condition === BodyPartCondition.SEVERELY_INJURED)
        .map(([partKey]) => partKey as BodyPart);

      severelyInjuredParts.forEach(part => {
        choices.push({
          text: `Treat my ${part.replace(/([A-Z])/g, ' $1').trim()} (25 Gold)`,
          nextStage: 'confirm_treatment',
          action: (gameState: GameState): DialogueActionReturn => {
            return { followUpActions: { type: 'SET_GAME_STATE', payload: { aiInteraction: {...gameState.aiInteraction, data: { partToTreat: part } } } } };
          }
        });
      });
      return choices;
    },
  }
};
