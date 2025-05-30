
import { Enemy, BodyPart, BodyPartCondition, BodyPartState, AttackType } from '../types';

// Helper to create default body part states
const createBodyParts = (totalMaxHp: number, constitution: number = 5): Record<BodyPart, BodyPartState> => {
  const headHp = Math.max(10, Math.floor(totalMaxHp * 0.2) + constitution);
  const torsoHp = Math.max(15, Math.floor(totalMaxHp * 0.35) + constitution * 2);
  const armHp = Math.max(8, Math.floor(totalMaxHp * 0.15) + constitution);
  const legHp = Math.max(8, Math.floor(totalMaxHp * 0.15) + constitution);
  return {
    [BodyPart.HEAD]: { condition: BodyPartCondition.HEALTHY, currentHp: headHp, maxHp: headHp },
    [BodyPart.TORSO]: { condition: BodyPartCondition.HEALTHY, currentHp: torsoHp, maxHp: torsoHp },
    [BodyPart.LEFT_ARM]: { condition: BodyPartCondition.HEALTHY, currentHp: armHp, maxHp: armHp },
    [BodyPart.RIGHT_ARM]: { condition: BodyPartCondition.HEALTHY, currentHp: armHp, maxHp: armHp },
    [BodyPart.LEFT_LEG]: { condition: BodyPartCondition.HEALTHY, currentHp: legHp, maxHp: legHp },
    [BodyPart.RIGHT_LEG]: { condition: BodyPartCondition.HEALTHY, currentHp: legHp, maxHp: legHp },
  };
};

export const ENEMIES_DATA: Record<string, Enemy> = {
  'goblin_scout': {
    id: 'goblin_scout',
    name: 'Goblin Scout',
    description: 'A small, wiry goblin with beady eyes and a crude dagger. It looks shifty.',
    maxHealth: 30, health: 30, // Reduced from 35
    Strength: 5, Dexterity: 8, Constitution: 5, Intelligence: 4, Agility: 7, // Str reduced from 6
    bodyParts: createBodyParts(30, 5),
    weakSpots: [BodyPart.HEAD],
    evasionChance: 0.15, fleeChance: 0.3,
    lootTable: [
        { itemId: 'goblin_ear', dropChance: 0.8 },
        { itemId: 'health_potion', dropChance: 0.1 },
        { itemId: 'leather_cap', dropChance: 0.05 },
        { itemId: 'worn_leather_boots', dropChance: 0.05 }
    ],
    goldDrop: { min: 1, max: 5 },
    xp: 20, 
    damageModifiers: {
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.5, [AttackType.POWER]: 1.2 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.5, [AttackType.POWER]: 1.3 },
        [BodyPart.LEFT_ARM]: { [AttackType.SLASH]: 1.4 },
        [BodyPart.RIGHT_ARM]: { [AttackType.SLASH]: 1.4 },
        [BodyPart.LEFT_LEG]: { [AttackType.SLASH]: 1.4 },
        [BodyPart.RIGHT_LEG]: { [AttackType.SLASH]: 1.4 },
    }
  },
  'goblin_warrior': {
    id: 'goblin_warrior',
    name: 'Goblin Warrior',
    description: 'A tougher-looking goblin wielding a rusty scimitar and wearing scraps of leather armor.',
    maxHealth: 45, health: 45, // Reduced from 50
    Strength: 7, Dexterity: 7, Constitution: 7, Intelligence: 4, Agility: 6, // Str reduced from 8
    bodyParts: createBodyParts(45, 7),
    evasionChance: 0.1, fleeChance: 0.15,
    lootTable: [
        { itemId: 'goblin_ear', dropChance: 0.9 },
        { itemId: 'rusty_sword', dropChance: 0.10 },
        { itemId: 'leather_armor', dropChance: 0.05 },
        { itemId: 'leather_cap', dropChance: 0.08 },
    ],
    goldDrop: { min: 3, max: 10 },
    xp: 30, 
    damageModifiers: {
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.4, [AttackType.POWER]: 1.2 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.4, [AttackType.POWER]: 1.3 },
        [BodyPart.LEFT_ARM]: { [AttackType.SLASH]: 1.3 },
        [BodyPart.RIGHT_ARM]: { [AttackType.SLASH]: 1.3 },
        [BodyPart.LEFT_LEG]: { [AttackType.SLASH]: 1.3 },
        [BodyPart.RIGHT_LEG]: { [AttackType.SLASH]: 1.3 },
    }
  },
  'forest_spider': {
    id: 'forest_spider',
    name: 'Giant Forest Spider',
    description: 'A horrifyingly large spider with hairy legs and multiple glowing eyes. It hisses menacingly.',
    maxHealth: 60, health: 60,
    Strength: 7, Dexterity: 9, Constitution: 6, Intelligence: 3, Agility: 8,
    bodyParts: createBodyParts(60, 6),
    weakSpots: [BodyPart.HEAD, BodyPart.TORSO],
    evasionChance: 0.2,
    lootTable: [ ],
    goldDrop: {min: 0, max: 0},
    xp: 35, 
    damageModifiers: {
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.5, [AttackType.SLASH]: 0.7, [AttackType.POWER]: 1.2 },
        [BodyPart.HEAD]: { [AttackType.THRUST]: 1.3, [AttackType.SLASH]: 0.8, [AttackType.POWER]: 1.4 },
        [BodyPart.LEFT_LEG]: { [AttackType.SLASH]: 1.2 }, 
        [BodyPart.RIGHT_LEG]: { [AttackType.SLASH]: 1.2 },
    }
  },
  'dire_wolf': {
    id: 'dire_wolf',
    name: 'Dire Wolf',
    description: 'A large, ferocious wolf with mangy fur and burning red eyes.',
    maxHealth: 70, health: 70,
    Strength: 9, Dexterity: 8, Constitution: 8, Intelligence: 3, Agility: 7,
    bodyParts: createBodyParts(70, 8),
    evasionChance: 0.15, fleeChance: 0.2,
    lootTable: [ ],
    goldDrop: { min: 0, max: 3 },
    xp: 45, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.SLASH]: 1.2, [AttackType.THRUST]: 1.2, [AttackType.POWER]: 1.3 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.3, [AttackType.THRUST]: 1.3, [AttackType.POWER]: 1.5 },
    }
  },
  'cave_bat': {
    id: 'cave_bat',
    name: 'Cave Bat',
    description: 'A large, screeching bat that flits erratically through the darkness.',
    maxHealth: 30, health: 30,
    Strength: 5, Dexterity: 10, Constitution: 4, Intelligence: 2, Agility: 9,
    bodyParts: createBodyParts(30, 4),
    evasionChance: 0.3, fleeChance: 0.4,
    lootTable: [],
    goldDrop: { min: 0, max: 1 },
    xp: 12,
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.SLASH]: 1.5, [AttackType.THRUST]: 1.4 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.6, [AttackType.THRUST]: 1.5 },
    }
  },
  'skeleton_warrior': {
    id: 'skeleton_warrior',
    name: 'Skeleton Warrior',
    description: 'The animated bones of a long-dead warrior, clutching a rusty weapon and shield. It rattles menacingly.',
    maxHealth: 80, health: 80,
    Strength: 10, Dexterity: 6, Constitution: 0, Intelligence: 0, Agility: 5,
    bodyParts: createBodyParts(80, 0),
    weakSpots: [BodyPart.HEAD],
    evasionChance: 0.05,
    lootTable: [
        { itemId: 'rusty_sword', dropChance: 0.2 },
        { itemId: 'wooden_buckler', dropChance: 0.1 },
    ],
    goldDrop: { min: 5, max: 15 },
    xp: 55, 
    damageModifiers: {
        [BodyPart.HEAD]:    { [AttackType.THRUST]: 0.3, [AttackType.SLASH]: 0.8, [AttackType.POWER]: 2.0 },
        [BodyPart.TORSO]:   { [AttackType.THRUST]: 0.5, [AttackType.SLASH]: 0.7, [AttackType.POWER]: 1.8 },
        [BodyPart.LEFT_ARM]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
        [BodyPart.RIGHT_ARM]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
        [BodyPart.LEFT_LEG]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
        [BodyPart.RIGHT_LEG]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
    }
  },
  'cultist_acolyte': {
    id: 'cultist_acolyte',
    name: 'Cultist Acolyte',
    description: 'A shadowy figure in dark robes, muttering incantations and wielding a sacrificial dagger.',
    maxHealth: 65, health: 65,
    Strength: 6, Dexterity: 7, Constitution: 6, Intelligence: 8, Agility: 7,
    bodyParts: createBodyParts(65, 6),
    evasionChance: 0.1,
    lootTable: [ { itemId: 'cultist_robes', dropChance: 0.3 }, { itemId: 'silver_dagger', dropChance: 0.05 }, { itemId: 'health_potion', dropChance: 0.15 }, ],
    goldDrop: { min: 10, max: 25 },
    xp: 50, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.3, [AttackType.SLASH]: 1.3, [AttackType.POWER]: 1.2 },
        [BodyPart.HEAD]: { [AttackType.THRUST]: 1.4, [AttackType.SLASH]: 1.4, [AttackType.POWER]: 1.3 },
    }
  },
  'giant_cave_spider': {
    id: 'giant_cave_spider',
    name: 'Giant Cave Spider (Boss)',
    description: 'An enormous, ancient spider, its carapace like armor, its fangs dripping with venom. Its many eyes gleam with malevolent intelligence.',
    maxHealth: 200, health: 200,
    Strength: 12, Dexterity: 10, Constitution: 10, Intelligence: 4, Agility: 8,
    bodyParts: createBodyParts(200, 10),
    weakSpots: [BodyPart.HEAD],
    evasionChance: 0.1,
    lootTable: [ { itemId: 'spider_venom_gland', dropChance: 1.0 }, { itemId: 'spider_silk_tunic', dropChance: 0.5 }, { itemId: 'potion_of_dexterity', dropChance: 0.3 }, ],
    goldDrop: { min: 50, max: 100 },
    xp: 175, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.5, [AttackType.SLASH]: 0.6, [AttackType.POWER]: 1.3 }, 
        [BodyPart.HEAD]: { [AttackType.THRUST]: 1.2, [AttackType.SLASH]: 0.7, [AttackType.POWER]: 1.5 }, 
        [BodyPart.LEFT_LEG]: { [AttackType.SLASH]: 1.3, [AttackType.POWER]: 1.1 }, 
        [BodyPart.RIGHT_LEG]: { [AttackType.SLASH]: 1.3, [AttackType.POWER]: 1.1 },
    }
  },
  'goblin_archer': {
    id: 'goblin_archer',
    name: 'Goblin Archer',
    description: 'A scrawny goblin with a poorly-made short bow, nocking an arrow with surprising speed.',
    maxHealth: 40, health: 40,
    Strength: 5, Dexterity: 9, Constitution: 5, Intelligence: 4, Agility: 8,
    bodyParts: createBodyParts(40, 5),
    weakSpots: [BodyPart.HEAD, BodyPart.RIGHT_ARM],
    evasionChance: 0.2, fleeChance: 0.25,
    attackPattern: [ { type: 'target_specific_part', part: BodyPart.TORSO, chance: 0.4}, { type: 'target_specific_part', part: BodyPart.HEAD, chance: 0.2}, { type: 'basic', chance: 0.4} ],
    lootTable: [
        { itemId: 'goblin_ear', dropChance: 0.8 },
        { itemId: 'short_bow', dropChance: 0.1 },
        { itemId: 'worn_leather_boots', dropChance: 0.07 }
    ],
    goldDrop: { min: 2, max: 8 },
    xp: 25, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.5, [AttackType.POWER]: 1.2 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.5, [AttackType.POWER]: 1.3 },
        [BodyPart.LEFT_ARM]: { [AttackType.SLASH]: 1.4 },
        [BodyPart.RIGHT_ARM]: { [AttackType.SLASH]: 1.4 },
        [BodyPart.LEFT_LEG]: { [AttackType.SLASH]: 1.4 },
        [BodyPart.RIGHT_LEG]: { [AttackType.SLASH]: 1.4 },
    }
  },
  'hobgoblin_bruiser': {
    id: 'hobgoblin_bruiser',
    name: 'Hobgoblin Bruiser',
    description: 'Larger and meaner than its goblin cousins, this hobgoblin carries a hefty club and a cruel sneer.',
    maxHealth: 100, health: 100,
    Strength: 11, Dexterity: 6, Constitution: 9, Intelligence: 5, Agility: 5,
    bodyParts: createBodyParts(100, 9),
    evasionChance: 0.05,
    lootTable: [
        { itemId: 'goblin_ear', dropChance: 0.5 },
        { itemId: 'iron_sword', dropChance: 0.05 },
        {itemId: 'goblin_totem', dropChance: 0.2},
        {itemId: 'studded_leather_armor', dropChance: 0.03},
        {itemId: 'wooden_buckler', dropChance: 0.1}
    ],
    goldDrop: { min: 15, max: 30 },
    xp: 70, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.2, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.4 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.2, [AttackType.THRUST]: 1.1, [AttackType.POWER]: 1.5 },
    }
  },
  'crypt_rat': {
    id: 'crypt_rat',
    name: 'Crypt Rat',
    description: 'An unnaturally large and aggressive rat, its eyes glowing faintly in the dark.',
    maxHealth: 25, health: 25,
    Strength: 4, Dexterity: 8, Constitution: 4, Intelligence: 1, Agility: 7,
    bodyParts: createBodyParts(25, 4),
    evasionChance: 0.25, fleeChance: 0.5,
    lootTable: [],
    goldDrop: { min: 0, max: 2 },
    xp: 10,
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.SLASH]: 1.3, [AttackType.THRUST]: 1.3 },
        [BodyPart.HEAD]: { [AttackType.SLASH]: 1.4, [AttackType.THRUST]: 1.4 },
    }
  },
  'animated_bones': {
    id: 'animated_bones',
    name: 'Animated Bones',
    description: 'A pile of bones that clatters together, animated by some dark force. It lunges with surprising speed.',
    maxHealth: 45, health: 45,
    Strength: 7, Dexterity: 7, Constitution: 0, Intelligence: 0, Agility: 6,
    bodyParts: createBodyParts(45, 0),
    weakSpots: [BodyPart.TORSO], 
    evasionChance: 0.1,
    lootTable: [],
    goldDrop: { min: 1, max: 5 },
    xp: 22, 
    damageModifiers: { 
        [BodyPart.HEAD]:    { [AttackType.THRUST]: 0.3, [AttackType.SLASH]: 0.8, [AttackType.POWER]: 2.0 },
        [BodyPart.TORSO]:   { [AttackType.THRUST]: 0.5, [AttackType.SLASH]: 0.7, [AttackType.POWER]: 1.8 },
        [BodyPart.LEFT_ARM]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
        [BodyPart.RIGHT_ARM]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
        [BodyPart.LEFT_LEG]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
        [BodyPart.RIGHT_LEG]:{ [AttackType.THRUST]: 0.4, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.5 },
    }
  },
  'bandit_thug': {
    id: 'bandit_thug',
    name: 'Bandit Thug',
    description: 'A rough-looking individual with a rusty sword and a mean scowl.',
    maxHealth: 60, health: 60,
    Strength: 9, Dexterity: 6, Constitution: 8, Intelligence: 4, Agility: 5,
    bodyParts: createBodyParts(60, 8),
    evasionChance: 0.1,
    lootTable: [
        { itemId: 'rusty_sword', dropChance: 0.15 },
        { itemId: 'health_potion', dropChance: 0.1 },
        { itemId: 'leather_armor', dropChance: 0.05 }
    ],
    goldDrop: { min: 5, max: 15 },
    xp: 35, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.2, [AttackType.SLASH]: 1.0, [AttackType.POWER]: 1.1 }, 
        [BodyPart.HEAD]: { [AttackType.THRUST]: 1.3, [AttackType.SLASH]: 1.3, [AttackType.POWER]: 1.2 },
    }
  },
  'bandit_leader': {
    id: 'bandit_leader',
    name: 'Bandit Leader',
    description: 'A burly, scarred individual wielding a notched axe. They look like they\'ve seen many fights.',
    maxHealth: 120, health: 120,
    Strength: 12, Dexterity: 7, Constitution: 10, Intelligence: 6, Agility: 6,
    bodyParts: createBodyParts(120, 10),
    weakSpots: [BodyPart.HEAD],
    evasionChance: 0.08,
    lootTable: [
        { itemId: 'serpents_eye_amulet_item', dropChance: 1.0 },
        { itemId: 'iron_sword', dropChance: 0.2 },
        { itemId: 'studded_leather_armor', dropChance: 0.1 }
    ],
    goldDrop: { min: 30, max: 60 },
    xp: 85, 
    damageModifiers: { 
        [BodyPart.TORSO]: { [AttackType.THRUST]: 1.1, [AttackType.SLASH]: 0.9, [AttackType.POWER]: 1.2 },
        [BodyPart.HEAD]: { [AttackType.THRUST]: 1.2, [AttackType.SLASH]: 1.1, [AttackType.POWER]: 1.3 },
    }
  },
};
