
import { Location, GameState, LocationOnEnterReturn } from '../types';

export const LOCATIONS_DATA: Record<string, Location> = {
  'starter_room': {
    id: 'starter_room',
    name: 'Old Shack',
    description: (gameState: GameState) => `You awaken in a dusty, dilapidated shack. Sunlight streams through cracks in the wooden walls.
There's a rickety table in the corner and a single wooden door leading outside.
${gameState.allLocations['starter_room'].itemIds.includes('rusty_sword') ? 'A Rusty Sword leans against the wall.' : ''}`,
    exits: [
      { direction: 'east', locationId: 'village_outskirts' },
    ],
    itemIds: ['rusty_sword', 'health_potion'],
    npcIds: [],
    visited: false,
    mapCoordinates: { x: 50, y: 300 },
  },
  'village_outskirts': {
    id: 'village_outskirts',
    name: 'Village Outskirts',
    description: (gameState: GameState) => `You stand on a worn path at the edge of Willow Creek. To the east, you see the village proper.
The ominous Whispering Wood looms to the north. A path heads northwest towards a small trading post by the river. The path back west leads to the old shack.
${gameState.allLocations['village_outskirts'].npcIds.includes('old_hermit') ? 'An Old Hermit sits by the path, observing you.' : ''}`,
    exits: [
      { direction: 'east', locationId: 'village_square' },
      { direction: 'north', locationId: 'forest_entrance' },
      { direction: 'west', locationId: 'starter_room' },
      { direction: 'northwest', locationId: 'riverside_trading_post' },
    ],
    itemIds: [],
    npcIds: ['old_hermit'],
    visited: false,
    mapCoordinates: { x: 150, y: 300 },
  },
  'village_square': {
    id: 'village_square',
    name: 'Willow Creek Square',
    description: (gameState: GameState) => `The village square is modest but lively. A central well provides water, and a few stalls are set up.
Paths lead west to the outskirts, north to a small library, and south towards Borin's Ironworks.
A welcoming sign for the 'Sleeping Dragon Inn' hangs on a building to the east.
${gameState.allLocations['village_square'].npcIds.includes('worried_villager') ? 'Elara, a Worried Villager, paces near the well.' : ''}`,
    exits: [
      { direction: 'north', locationId: 'willow_creek_library'},
      { direction: 'east', locationId: 'sleeping_dragon_inn'}, 
      { direction: 'west', locationId: 'village_outskirts' },
      { direction: 'south', locationId: 'blacksmith_shop' },
    ],
    itemIds: [],
    npcIds: ['worried_villager'],
    enemyIds: [],
    visited: false,
    mapCoordinates: { x: 250, y: 300 },
  },
   'willow_creek_library': {
    id: 'willow_creek_library',
    name: 'Willow Creek Library',
    description: (gameState: GameState) => `This small, dusty building houses a collection of old books and scrolls.
Shelves line the walls, filled with aging tomes. The air smells of old paper and quiet contemplation.
${gameState.allLocations['willow_creek_library'].npcIds.includes('master_eldrin') ? 'Master Eldrin, the village scholar, is here, poring over a manuscript.' : ''}
${gameState.allLocations['willow_creek_library'].npcIds.includes('village_healer_lyra') ? 'Lyra the Healer has a small alcove here, tending to her herbs.' : ''}
The only exit is south, back to the village square.`,
    exits: [
        { direction: 'south', locationId: 'village_square' },
    ],
    itemIds: [],
    npcIds: ['master_eldrin', 'village_healer_lyra'], 
    visited: false,
    mapCoordinates: { x: 250, y: 200 },
  },
  'sleeping_dragon_inn': {
    id: 'sleeping_dragon_inn',
    name: 'Sleeping Dragon Inn',
    description: (gameState: GameState) => `The common room of the Sleeping Dragon Inn is warm and filled with the smell of stew and ale.
A few patrons are scattered about, and a crackling fire burns in the hearth.
${gameState.allLocations['sleeping_dragon_inn'].npcIds.includes('innkeeper_barley') ? 'Barley, the cheerful innkeeper, polishes a mug behind the counter.' : ''}
The exit west leads back to the village square.`,
    exits: [
        { direction: 'west', locationId: 'village_square'}
    ],
    itemIds: [],
    npcIds: ['innkeeper_barley'],
    visited: false,
    isInn: true,
    mapCoordinates: {x: 350, y: 300}, 
  },
  'forest_entrance': {
    id: 'forest_entrance',
    name: 'Whispering Wood Entrance',
    description: (gameState: GameState) => `The air grows colder as you step onto the path leading into the Whispering Wood.
The trees are tall and dense, blocking out much of the sunlight. A narrow trail winds deeper north.
Another faint path leads west, deeper into a less traveled part of the woods where Grizelda often hunts.
To the east, a crude path seems to lead towards a goblin encampment.
You hear faint rustling sounds from within the woods. The path south leads back to the village outskirts.`,
    exits: [
      { direction: 'north', locationId: 'deep_woods' },
      { direction: 'west', locationId: 'forest_west_edge' },
      { direction: 'east', locationId: 'goblin_outpost_approach' },
      { direction: 'south', locationId: 'village_outskirts' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id: 'goblin_scout', count: 1}],
    visited: false,
    mapCoordinates: { x: 150, y: 200 },
  },
   'deep_woods': {
    id: 'deep_woods',
    name: 'Deep Woods',
    description: (gameState: GameState) => `You are deep within the Whispering Wood. The path is barely visible.
Strange shadows dance at the edge of your vision. It feels like you're being watched.
There's a small, moss-covered clearing to the east. The path south leads back to the forest entrance.
A roughly hewn path leads west, perhaps towards some old ruins. North leads to an ancient, eerie grove.
${gameState.allLocations['deep_woods'].itemIds.includes('mystic_orb') ? 'A faint glow emanates from a pedestal in the clearing.' : ''}
${gameState.allLocations['deep_woods'].itemIds.includes('borins_lost_hammer') ? 'You spot something metallic glinting under a bush - it looks like a hammer!' : ''}`,
    exits: [
      { direction: 'north', locationId: 'ancient_grove'},
      { direction: 'east', locationId: 'mossy_clearing' },
      { direction: 'west', locationId: 'ruined_path' },
      { direction: 'south', locationId: 'forest_entrance' },
    ],
    itemIds: ['mystic_orb', 'borins_lost_hammer'],
    npcIds: [],
    enemyIds: [{id:'goblin_warrior', count:1}, {id:'forest_spider', count:1}, {id:'dire_wolf', count:1}],
    visited: false,
    mapCoordinates: { x: 150, y: 100 },
  },
  'mossy_clearing': {
    id: 'mossy_clearing',
    name: 'Mossy Clearing',
    description: (gameState: GameState) => `This small clearing is eerily quiet. Ancient stones are half-buried in the moss.
A sense of old magic hangs in the air. The only exit is west, back into the deep woods.
${gameState.activeQuests['find_mystic_orb']?.currentStageIndex === 2 ? 'The Mystic Orb you placed here earlier hums gently on its pedestal.' : ''}`,
    exits: [
      { direction: 'west', locationId: 'deep_woods' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [],
    visited: false,
    mapCoordinates: { x: 220, y: 80 },
    onEnter: (gameState: GameState): LocationOnEnterReturn | string | void => {
      const quest = gameState.activeQuests['find_mystic_orb'];
      if (quest && quest.currentStageIndex === 1 && gameState.player.inventory.some(item => item.id === 'mystic_orb')) {
        return {
            message: "As you hold the Mystic Orb in the clearing, it resonates with the ancient stones. You place it on a small, moss-covered pedestal. It seems to belong here.",
            followUpActions: [
                { type: 'ADVANCE_QUEST', questId: 'find_mystic_orb', stageIndex: 2 },
            ]
        };
      }
    }
  },
  'blacksmith_shop': {
    id: 'blacksmith_shop',
    name: "Borin's Ironworks",
    description: (gameState: GameState) => `The air is hot and filled with the clang of hammer on anvil. This is Borin's Ironworks.
Sparks fly as Borin, the stout dwarf blacksmith, works at his forge. Tools and weapons line the walls.
The exit north leads back to the village square.
${gameState.allLocations['blacksmith_shop'].npcIds.includes('borin_blacksmith') ? 'Borin the Blacksmith nods at you, wiping sweat from his brow.' : ''}`,
    exits: [
        { direction: 'north', locationId: 'village_square' },
    ],
    itemIds: [],
    npcIds: ['borin_blacksmith'],
    visited: false,
    isShop: true,
    mapCoordinates: { x: 250, y: 400 },
  },
  'forest_west_edge': {
    id: 'forest_west_edge',
    name: 'Forest West Edge',
    description: (gameState: GameState) => `This part of the Whispering Wood is wilder and less traveled.
Dense undergrowth makes passage difficult. You can head east back to the main Forest Entrance.
A narrow opening in some rocks to the north suggests a cave. South leads into a murky fen.
${gameState.allLocations['forest_west_edge'].npcIds.includes('grizelda_huntress') ? 'Grizelda the Huntress, a rugged woman in leathers, is tracking something nearby.' : ''}`,
    exits: [
      { direction: 'east', locationId: 'forest_entrance' },
      { direction: 'north', locationId: 'dark_cave_entrance' },
      { direction: 'south', locationId: 'murky_fen'},
    ],
    itemIds: [],
    npcIds: ['grizelda_huntress'],
    enemyIds: [{id:'dire_wolf', count:1}, 'goblin_scout'], 
    visited: false,
    mapCoordinates: { x: 50, y: 200 },
  },
  'dark_cave_entrance': {
    id: 'dark_cave_entrance',
    name: 'Dark Cave Entrance',
    description: (gameState: GameState) => `A chilling draft emanates from the mouth of this dark cave.
The air is damp, and you hear faint skittering sounds from within.
You can go south to leave the cave and return to the Forest West Edge, or venture deeper into the darkness to the north.`,
    exits: [
      { direction: 'north', locationId: 'spiders_lair' },
      { direction: 'south', locationId: 'forest_west_edge' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id:'cave_bat', count: 2}],
    visited: false,
    mapCoordinates: { x: 50, y: 100 },
  },
  'spiders_lair': {
    id: 'spiders_lair',
    name: "Spider's Lair",
    description: (gameState: GameState) => `The cave opens into a large, web-filled chamber. Thick, sticky strands cover every surface.
The air is heavy with the scent of decay. Bones litter the floor.
${gameState.allEnemies['giant_cave_spider'] && !gameState.combatState && !gameState.allLocations['spiders_lair'].enemyIds?.some(e => typeof e === 'string' && e === 'giant_cave_spider_defeated_marker') ? 'A monstrous Giant Cave Spider descends from the ceiling, its many eyes fixed on you!' : 'The lair is eerily quiet now, the great spider defeated. Webs still cling to everything.'}
The only way out seems to be south, back towards the cave entrance.`,
    exits: [
      { direction: 'south', locationId: 'dark_cave_entrance' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id:'giant_cave_spider', count:1}], 
    visited: false,
    mapCoordinates: { x: 50, y: 20 },
    onEnter: (gameState: GameState): LocationOnEnterReturn | string | void => {
        const spiderDefeatedMarker = gameState.allLocations['spiders_lair'].enemyIds?.some(e => typeof e === 'string' && e === 'giant_cave_spider_defeated_marker');
        const spiderTemplate = gameState.allEnemies['giant_cave_spider'];
        if (!gameState.combatState && !spiderDefeatedMarker && spiderTemplate) {
            const isSpiderAlreadyActiveInCombat = gameState.combatState?.activeEnemies.some(ae => ae.id === 'giant_cave_spider');
            if (!isSpiderAlreadyActiveInCombat) {
                return {
                    followUpActions: { type: 'START_COMBAT', enemyIds: ['giant_cave_spider'] }
                };
            }
        }
    }
  },
  'ruined_path': {
    id: 'ruined_path',
    name: 'Ruined Path',
    description: (gameState: GameState) => `An ancient, crumbling path winds its way through overgrown terrain.
Broken flagstones and fallen pillars hint at a forgotten civilization. The air is heavy with a sense of desolation.
To the east lies the Deep Woods. The path continues west towards some imposing ruins.`,
    exits: [
      { direction: 'west', locationId: 'ancient_ruins_exterior' },
      { direction: 'east', locationId: 'deep_woods' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: ['skeleton_warrior', 'cultist_acolyte'], 
    visited: false,
    mapCoordinates: { x: 80, y: 50 },
  },
  'ancient_ruins_exterior': {
    id: 'ancient_ruins_exterior',
    name: 'Ancient Ruins Exterior',
    description: (gameState: GameState) => `You stand before the imposing facade of ancient, crumbling ruins.
Tall, broken walls loom over you, and a gaping, dark entrance leads further in.
Strange symbols are carved into the stone, some glowing faintly with an malevolent light.
${gameState.allLocations['ancient_ruins_exterior'].itemIds.includes('lost_tome_of_eldoria') ? 'A weathered Lost Tome of Eldoria lies half-buried in rubble near the entrance.' : ''}
The path east leads back along the Ruined Path. A path also leads south to a Forgotten Crypt entrance.`,
    exits: [
      { direction: 'east', locationId: 'ruined_path' },
      { direction: 'south', locationId: 'forgotten_crypt_entrance' }, // Changed from "enter ruins" to be more explicit
    ],
    itemIds: ['lost_tome_of_eldoria'],
    npcIds: [],
    enemyIds: [{id:'cultist_acolyte', count: 2}, {id:'skeleton_warrior', count:1}],
    visited: false,
    mapCoordinates: { x: 20, y: 50 },
  },
  'ancient_grove': {
    id: 'ancient_grove',
    name: 'Ancient Grove',
    description: (gameState: GameState) => `Sunlight filters feebly through the canopy of enormous, gnarled trees that seem as old as time itself.
A palpable sense of ancient magic permeates the air. Strange carvings adorn the largest tree trunks.
A narrow path leads south back to the Deep Woods. Another path winds east to a forgotten crypt.`,
    exits: [
        { direction: 'south', locationId: 'deep_woods' },
        { direction: 'east', locationId: 'forgotten_crypt_entrance' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id:'dire_wolf', count:1}],
    visited: false,
    isDungeon: false,
    mapCoordinates: { x: 150, y: 20 },
  },
  'murky_fen': {
    id: 'murky_fen',
    name: 'Murky Fen',
    description: (gameState: GameState) => `The ground here is boggy and treacherous, with stagnant pools of dark water.
Twisted, leafless trees rise from the mire, and the air is thick with the buzz of insects.
A barely discernible path leads north back to the Forest West Edge.`,
    exits: [
        { direction: 'north', locationId: 'forest_west_edge' },
    ],
    itemIds: ['health_potion'],
    npcIds: [],
    enemyIds: [{id:'forest_spider', count:2}, 'cave_bat'], 
    visited: false,
    mapCoordinates: { x: 50, y: 400 },
  },
  'goblin_outpost_approach': {
    id: 'goblin_outpost_approach',
    name: 'Goblin Outpost Approach',
    description: (gameState: GameState) => `The path here is littered with crude goblin refuse and poorly-made warning signs.
You can hear guttural shouts and the clang of metal ahead to the east, where their outpost lies.
The main forest entrance is to the west.`,
    exits: [
        { direction: 'east', locationId: 'goblin_outpost' },
        { direction: 'west', locationId: 'forest_entrance' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id:'goblin_scout', count:2}],
    visited: false,
    mapCoordinates: { x: 250, y: 150 },
  },
  'goblin_outpost': {
    id: 'goblin_outpost',
    name: 'Goblin Outpost',
    description: (gameState: GameState) => `This crude encampment is a mess of poorly constructed huts and a crackling bonfire.
Goblins mill about, some sharpening weapons, others arguing over scraps of food.
A larger hut to the north seems to be their leader's dwelling. The exit west leads back towards the forest.
${gameState.allLocations['goblin_outpost'].itemIds.includes('goblin_totem') ? 'A strange Goblin Totem stands near the fire.' : ''}`,
    exits: [
        { direction: 'north', locationId: 'goblin_chieftain_hut' },
        { direction: 'west', locationId: 'goblin_outpost_approach' },
    ],
    itemIds: ['goblin_totem'],
    npcIds: [],
    enemyIds: [{id:'goblin_warrior', count:2}, {id:'goblin_archer', count:1}],
    visited: false,
    isDungeon: false,
    mapCoordinates: { x: 350, y: 150 },
    onEnter: (gameState: GameState): LocationOnEnterReturn | void => {
        const quest = gameState.activeQuests['clear_goblin_outpost'];
        if (quest && quest.currentStageIndex === 0) {
        }
    }
  },
   'goblin_chieftain_hut': {
    id: 'goblin_chieftain_hut',
    name: "Goblin Chieftain's Hut",
    description: (gameState: GameState) => `This larger, filthier hut is clearly the domain of the goblin leader. Piles of stolen goods and bones are strewn about.`,
    exits: [ { direction: 'south', locationId: 'goblin_outpost'} ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id: 'hobgoblin_bruiser', count: 1}], 
    visited: false,
    mapCoordinates: { x: 350, y: 80 },
  },
  'forgotten_crypt_entrance': {
    id: 'forgotten_crypt_entrance',
    name: 'Forgotten Crypt Entrance',
    description: (gameState: GameState) => `A weathered stone archway, half-swallowed by thorny vines, marks the entrance to an ancient crypt.
A chill emanates from the dark opening leading down. The air is heavy with the scent of dust and decay.
Paths lead west to the Ancient Grove and north to the Ancient Ruins Exterior.`, // Adjusted description slightly for clarity
    exits: [
        { direction: 'down', locationId: 'forgotten_crypt_level1', isLocked: false, keyId: 'old_key' }, // Key might be used for a deeper level, not this one
        { direction: 'west', locationId: 'ancient_grove' },
        { direction: 'north', locationId: 'ancient_ruins_exterior' }, // Connects to ancient_ruins_exterior.
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id:'skeleton_warrior', count:1}],
    visited: false,
    isDungeon: true,
    mapCoordinates: { x: 100, y: 20 }, // Adjusted to fit new layout logic
  },
  'forgotten_crypt_level1': {
    id: 'forgotten_crypt_level1',
    name: 'Forgotten Crypt - Level 1',
    description: (gameState: GameState) => `You descend into a dark, stone-lined corridor. Cobwebs hang thick, and the silence is unnerving.
Sarcophagi line the walls, some broken open. The crypt continues deeper.
The only way out is up, back to the entrance.`,
    exits: [
        { direction: 'up', locationId: 'forgotten_crypt_entrance' },
    ],
    itemIds: ['health_potion', 'old_key'], // Added old_key here as an example find
    npcIds: [],
    enemyIds: [{id:'animated_bones', count:2}, {id:'crypt_rat', count:3}, {id:'skeleton_warrior', count:1}],
    visited: false,
    isDungeon: true,
    mapCoordinates: { x: 100, y: -50 }, // Below crypt entrance
  },
  'riverside_trading_post': {
    id: 'riverside_trading_post',
    name: 'Riverside Trading Post',
    description: (gameState: GameState) => `A small, sturdy trading post stands near the riverbank, a common stop for travelers and merchants.
A few barrels and crates are stacked outside. Smoke curls from its chimney.
${gameState.allLocations['riverside_trading_post'].npcIds.includes('merchant_silas') ? 'Silas the Trader waves from the doorway.' : ''}
Paths lead southeast back towards the village outskirts and north along an old, overgrown road.`,
    exits: [
      { direction: 'southeast', locationId: 'village_outskirts' },
      { direction: 'north', locationId: 'old_kings_road' },
    ],
    itemIds: [],
    npcIds: ['merchant_silas'],
    visited: false,
    isShop: true,
    mapCoordinates: { x: 50, y: 400 }, // Adjusted from original
  },
  'old_kings_road': {
    id: 'old_kings_road',
    name: "Old King's Road",
    description: (gameState: GameState) => `This once grand road is now overgrown and cracked, barely more than a trail.
To the south lies the Riverside Trading Post. Further north, through the tangled woods, you spot a dilapidated watchtower.
The air is still, and you feel watched.`,
    exits: [
      { direction: 'south', locationId: 'riverside_trading_post' },
      { direction: 'north', locationId: 'bandit_watchtower_exterior' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id: 'bandit_thug', count: 1, respawnTime: 300}],
    visited: false,
    mapCoordinates: { x: 50, y: 500 }, // North of trading post
  },
  'bandit_watchtower_exterior': {
    id: 'bandit_watchtower_exterior',
    name: 'Abandoned Watchtower Exterior',
    description: (gameState: GameState) => `A crumbling stone watchtower stands here, its stones mossy and dislodged.
It has clearly been taken over by bandits. A rough wooden door, reinforced with scrap metal, bars entry.
The path south leads back to the Old King's Road.`,
    exits: [
      { direction: 'south', locationId: 'old_kings_road' },
      { direction: 'enter tower', locationId: 'bandit_watchtower_interior' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id: 'bandit_thug', count: 2}],
    visited: false,
    mapCoordinates: { x: 50, y: 580 }, // Further north
  },
  'bandit_watchtower_interior': {
    id: 'bandit_watchtower_interior',
    name: 'Watchtower Interior',
    description: (gameState: GameState) => `The inside of the watchtower is cramped and smells of unwashed bodies and stale ale.
Rough bedrolls are scattered about, along with discarded food scraps and cheap wine skins.
A burly, scarred bandit leader glares at you from across the room, an ugly axe in hand.
${gameState.allEnemies['bandit_leader'] && !gameState.combatState && !gameState.allLocations['bandit_watchtower_interior'].enemyIds?.some(e => typeof e === 'string' && e === 'bandit_leader_defeated_marker') ? 'The Bandit Leader hefts their axe!' : 'The watchtower is quiet now, the bandits dealt with.'}
The only way out is back through the door.`,
    exits: [
      { direction: 'leave tower', locationId: 'bandit_watchtower_exterior' },
    ],
    itemIds: [],
    npcIds: [],
    enemyIds: [{id: 'bandit_leader', count: 1}], 
    visited: false,
    isDungeon: true,
    mapCoordinates: { x: 50, y: 650 }, // Visually distinct from exterior, maybe slightly offset or conceptual
    onEnter: (gameState: GameState): LocationOnEnterReturn | string | void => {
        const leaderDefeatedMarker = gameState.allLocations['bandit_watchtower_interior'].enemyIds?.some(e => typeof e === 'string' && e === 'bandit_leader_defeated_marker');
        const leaderTemplate = gameState.allEnemies['bandit_leader'];
        if (!gameState.combatState && !leaderDefeatedMarker && leaderTemplate) {
            const isLeaderAlreadyActiveInCombat = gameState.combatState?.activeEnemies.some(ae => ae.id === 'bandit_leader');
            if (!isLeaderAlreadyActiveInCombat) {
                return {
                    followUpActions: { type: 'START_COMBAT', enemyIds: ['bandit_leader'] }
                };
            }
        }
    }
  },
};
