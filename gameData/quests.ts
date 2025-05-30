
import { Quest, GameState } from '../types';

export const QUESTS_DATA: Record<string, Quest> = {
  'find_mystic_orb': {
    id: 'find_mystic_orb',
    title: 'The Mystic Orb',
    description: 'The Old Hermit asked you to find a Mystic Orb in the Whispering Wood and take it to the Mossy Clearing.',
    giverNpcId: 'old_hermit',
    stages: [
      { 
        description: 'Find the Mystic Orb in the Whispering Wood.', 
        isCompleted: (gameState: GameState) => gameState.player.inventory.some(item => item.id === 'mystic_orb')
      },
      { 
        description: 'Take the Mystic Orb to the Mossy Clearing and place it on the pedestal.', 
        isCompleted: (gameState: GameState) => {
            const quest = gameState.activeQuests['find_mystic_orb'];
            return !!quest && quest.currentStageIndex === 2;
        }
      },
      { 
        description: 'Return to the Old Hermit to inform him of your success.',
        isCompleted: (gameState: GameState) => {
            const quest = gameState.activeQuests['find_mystic_orb'] || gameState.completedQuests['find_mystic_orb'];
            return !!quest && quest.currentStageIndex === 3;
        }
      },
      { description: 'Quest completed.'} 
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
      gold:60,
      items: ['health_potion'], 
      xp: 150, 
      attributePoints: 1,
    },
  },
  'goblin_menace': {
    id: 'goblin_menace',
    title: 'Goblin Menace',
    description: 'Elara, a worried villager, has asked you to deal with goblins harassing people near the forest entrance.',
    giverNpcId: 'worried_villager',
    stages: [
      { description: 'Accepted Quest: Speak to Elara in Willow Creek Square about the goblin problem.' }, 
      { 
        description: 'Defeat 3 Goblins near the forest entrance and collect their ears as proof.',
        target: 'goblin_scout', 
        targetCount: 3,
        isCompleted: (gameState: GameState) => {
            const quest = gameState.activeQuests['goblin_menace'];
            return !!quest && quest.currentStageIndex === 2;
        }
      },
      { description: 'Return to Elara with proof. Quest Completed.' }, 
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
      gold: 40, 
      items: ['health_potion', 'leather_cap'], 
      xp: 120, 
    },
  },
  'the_spreading_shadow': {
    id: 'the_spreading_shadow',
    title: 'The Spreading Shadow',
    description: 'The Old Hermit senses a growing darkness and has asked you to investigate its source, starting with the ancient ruins west of the Deep Woods.',
    giverNpcId: 'old_hermit',
    stages: [
        { description: 'The Old Hermit has tasked you with investigating a growing darkness. Start by examining the ancient ruins west of the Deep Woods.' },
        { 
            description: 'Explore the Ancient Ruins Exterior and search for clues or signs of the shadow.',
            isCompleted: (gameState: GameState) => gameState.player.inventory.some(i => i.id === 'shadow_amulet'), 
        },
        {
            description: "You found a strange Shadow Amulet. Take it to someone knowledgeable. The Old Hermit suggested Master Eldrin in Willow Creek's Library might be able to help.",
            isCompleted: (gameState: GameState) => gameState.currentDialogueNpcId === 'master_eldrin' && gameState.activeQuests['the_spreading_shadow']?.currentStageIndex === 3, 
        },
        {
            description: "Master Eldrin is studying the Shadow Amulet. He suggested seeking insights from Grizelda or Borin while he researches. The path ahead is uncertain.",
        }
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: { 
      xp: 250, 
      attributePoints: 1,
    } 
  },
  'borins_lost_hammer': {
    id: 'borins_lost_hammer',
    title: "Borin's Lost Hammer",
    description: "Borin Ironbeard, the blacksmith, has lost his favorite forging hammer, possibly in the Deep Woods. Find it and return it to him.",
    giverNpcId: 'borin_blacksmith',
    stages: [
        { 
            description: "Find Borin's prized forging hammer, which he believes he lost in the Deep Woods.",
            isCompleted: (gameState: GameState) => gameState.player.inventory.some(i => i.id === 'borins_lost_hammer'),
        },
        { description: "Return the hammer to Borin at his Ironworks. Quest Completed."}
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
        gold: 75,
        items: ['iron_sword'], 
        xp: 150,
        attributePoints: 1,
    }
  },
  'spider_extermination': {
    id: 'spider_extermination',
    title: 'Spider Extermination',
    description: "Grizelda the Huntress has asked you to kill a Giant Cave Spider that has taken residence in the Dark Cave (north of Forest West Edge) and bring back its venom gland as proof.",
    giverNpcId: 'grizelda_huntress',
    stages: [
        {
            description: "Slay the Giant Cave Spider in its lair within the Dark Cave and retrieve its venom gland.",
            isCompleted: (gameState: GameState) => gameState.player.inventory.some(i => i.id === 'spider_venom_gland'),
        },
        { description: "Return the Spider Venom Gland to Grizelda. Quest Completed."}
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
        gold: 150,
        items: ['potion_of_dexterity', 'short_bow'],
        xp: 200,
        attributePoints: 1,
    }
  },
  'lost_tome_of_eldoria': {
    id: 'lost_tome_of_eldoria',
    title: 'The Lost Tome of Eldoria',
    description: "Master Eldrin, the scholar in Willow Creek's Library, seeks the recovery of the 'Lost Tome of Eldoria', an ancient book of lore believed to be in the Ancient Ruins.",
    giverNpcId: 'master_eldrin',
    stages: [
        {
            description: "Search the Ancient Ruins for the 'Lost Tome of Eldoria'.",
            isCompleted: (gameState: GameState) => gameState.player.inventory.some(i => i.id === 'lost_tome_of_eldoria'),
        },
        { description: "Return the Lost Tome to Master Eldrin. Quest Completed."}
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
        gold: 100,
        xp: 180,
        attributePoints: 1,
    }
  },
  'clear_goblin_outpost': {
    id: 'clear_goblin_outpost',
    title: 'Clear the Goblin Outpost',
    description: "Grizelda has tasked you with clearing out a goblin outpost located east of the Whispering Wood entrance. Defeat their leader and retrieve any goblin totem you find.",
    giverNpcId: 'grizelda_huntress',
    stages: [
      { description: "Travel to the goblin outpost east of the forest entrance." },
      { 
        description: "Defeat the goblin leader (likely a Hobgoblin) and retrieve their totem.",
        isCompleted: (gameState: GameState) => gameState.player.inventory.some(i => i.id === 'goblin_totem') 
      },
      { description: "Return to Grizelda with the Goblin Totem. Quest Completed."}
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
      gold: 200,
      xp: 250,
      attributePoints: 2,
      items: ['iron_kite_shield'] 
    }
  },
  'echoes_in_the_crypt': {
    id: 'echoes_in_the_crypt',
    title: 'Echoes in the Crypt',
    description: "Master Eldrin is concerned about strange echoes from the Forgotten Crypt (east of the Ancient Grove). Investigate the crypt and report your findings.",
    giverNpcId: 'master_eldrin',
    stages: [
      { description: "Enter the Forgotten Crypt, located east of the Ancient Grove or south of the Ancient Ruins Exterior." },
      { 
        description: "Explore the first level of the Forgotten Crypt and find the source of the echoes or any significant findings.",
        isCompleted: (gameState: GameState) => { 
            return gameState.player.inventory.some(i => i.id === 'crypt_lore_fragment'); 
        }
      },
      { description: "Return to Master Eldrin with your findings. Quest Completed." }
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
      gold: 120,
      xp: 180,
      attributePoints: 1,
      items: ['iron_helmet'] 
    }
  },
  'serpents_eye_amulet': {
    id: 'serpents_eye_amulet',
    title: "The Serpent's Eye",
    description: "Silas the Trader at the Riverside Trading Post mentioned a valuable 'Serpent's Eye Amulet' stolen by bandits. He believes they are holed up in an abandoned watchtower along the Old King's Road, north of his post. Recover the amulet and return it to Silas.",
    giverNpcId: 'merchant_silas',
    stages: [
      { 
        description: "Travel to the Old King's Road north of the Riverside Trading Post and find the abandoned watchtower where the bandits are hiding.",
        // Completion condition could be reaching 'bandit_watchtower_interior' or defeating leader
        isCompleted: (gameState: GameState) => gameState.player.inventory.some(item => item.id === 'serpents_eye_amulet_item')
      },
      { 
        description: "You have recovered the Serpent's Eye Amulet from the bandit leader. Return it to Silas at the Riverside Trading Post.",
        isCompleted: (gameState: GameState) => {
            const quest = gameState.activeQuests['serpents_eye_amulet'] || gameState.completedQuests['serpents_eye_amulet'];
            return !!quest && quest.currentStageIndex === 2; // Quest advances to stage 2 upon talking to Silas with item
        }
      },
      { description: 'Quest completed. Silas has rewarded you for returning the amulet.'}
    ],
    currentStageIndex: 0,
    isCompleted: false,
    isFailed: false,
    rewards: {
      gold: 300,
      items: ['iron_kite_shield'], // Example reward, can be changed
      xp: 250,
      attributePoints: 1,
    },
  }
};
