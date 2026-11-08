// Game types, upgrade progressions, skins catalog, collection sets, and stage definitions

export interface PlayerUpgrades {
  speedLevel: number;        // increases movement velocity
  startLengthLevel: number;  // begin matches with extra tail length
  incomeLevel: number;       // increases cash earned per delivered segment / item
  magnetLevel: number;       // expands automatic pickup vacuum radius
}

export interface PowerUpActive {
  magnet: number;     // seconds remaining
  speed: number;      // seconds remaining
  shield: number;     // seconds remaining
  doubleCash: number; // seconds remaining
  fire: number;       // seconds remaining
}

export type SkinCategory =
  | 'mythical'
  | 'creatures'
  | 'vehicles'
  | 'neon'
  | 'minimalist'
  | 'foods'
  | 'celestial'
  | 'animals'
  | 'monsters'
  | 'cyberpunk';

export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SkinModelType =
  | 'classic'
  | 'cat'
  | 'dragon'
  | 'robot'
  | 'food'
  | 'celestial'
  | 'roller_coaster'
  | 'snowman'
  | 'yeti'
  | 'electric_eel'
  | 'shark';
export type SkinUnlockMethod = 'default' | 'coins' | 'milestone' | 'boss' | 'ad_watch' | 'gacha';

export interface SkinDefinition {
  id: string;
  name: string;
  category: SkinCategory;
  rarity: SkinRarity;
  modelType: SkinModelType;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  coinPrice?: number;
  gemPrice?: number;
  requiredLevel?: number;
  requiredBossStage?: number;
  unlockType: SkinUnlockMethod;
  unlocked?: boolean;
  statBonus?: string;
}

export interface CollectionSet {
  id: SkinCategory;
  name: string;
  emoji: string;
  description: string;
  perkTitle: string;
  perkDescription: string;
  perkType: 'speed' | 'startLength' | 'income' | 'magnet' | 'allStats';
  perkValue: number;
  color: string;
}

export const COLLECTION_SETS: CollectionSet[] = [
  {
    id: 'mythical',
    name: 'Mythical Dragons',
    emoji: '🐉',
    description: 'Ancient subterranean wyrms and fire-breathing drakes with razor horns.',
    perkTitle: '+6 Starting Length',
    perkDescription: 'Spawn into every arena with +6 extra body segments.',
    perkType: 'startLength',
    perkValue: 6,
    color: '#f97316',
  },
  {
    id: 'creatures',
    name: 'Apex Creatures',
    emoji: '🦈',
    description: 'Ferocious apex predators: Sharks, Volt Eels, Abominable Yetis, and Frost Snowmen.',
    perkTitle: '+10% Movement Speed',
    perkDescription: 'Primal instincts grant a permanent +10% base cruising velocity.',
    perkType: 'speed',
    perkValue: 0.10,
    color: '#06b6d4',
  },
  {
    id: 'vehicles',
    name: 'Arcade Vehicles',
    emoji: '🎢',
    description: 'High-speed roller coaster carts, rocket pods, and turbo arcade racers.',
    perkTitle: '+15% Sprint Acceleration',
    perkDescription: 'Heavy mechanical torque ramps sprint top-speed by +15%.',
    perkType: 'speed',
    perkValue: 0.15,
    color: '#ef4444',
  },
  {
    id: 'neon',
    name: 'Cyberpunk Neon',
    emoji: '🤖',
    description: 'High-tech synthetic wireframes with sensor visors and glowing neon conduits.',
    perkTitle: '+25% Drop-off Cash',
    perkDescription: 'Quantum processors earn +25% permanent coins when banking tail segments.',
    perkType: 'income',
    perkValue: 0.25,
    color: '#3b82f6',
  },
  {
    id: 'minimalist',
    name: 'Zen Minimalist',
    emoji: '🐍',
    description: 'Pure geometric forms, clean lines, and toxic monochrome aesthetics.',
    perkTitle: '+4.0m Magnet Aura',
    perkDescription: 'Harmonic resonance expands automatic food suction radius by +4.0 meters.',
    perkType: 'magnet',
    perkValue: 4.0,
    color: '#10b981',
  },
  {
    id: 'foods',
    name: 'Tasty Foods',
    emoji: '🍉',
    description: 'Delicious snack snakes with sprinkles, fruit rinds, and dessert glazes.',
    perkTitle: '+3.5m Magnet Aura',
    perkDescription: 'Sweet attraction expands automatic food suction radius by +3.5 meters.',
    perkType: 'magnet',
    perkValue: 3.5,
    color: '#10b981',
  },
  {
    id: 'celestial',
    name: 'Celestial Royalty',
    emoji: '✨',
    description: 'Transcendent royalty draped in solar halos and starlight facets.',
    perkTitle: '+10% All Passives & Sparkle Trail',
    perkDescription: 'Universal stat amplification plus glorious glowing starlight particle trail.',
    perkType: 'allStats',
    perkValue: 0.10,
    color: '#eab308',
  },
  {
    id: 'animals',
    name: 'Cute Animals',
    emoji: '🐾',
    description: 'Playful pets with ears, whiskers, and fluffy tail styling.',
    perkTitle: '+8% Movement Speed',
    perkDescription: 'Swift paws grant a permanent +8% base cruising velocity.',
    perkType: 'speed',
    perkValue: 0.08,
    color: '#f43f5e',
  },
  {
    id: 'monsters',
    name: 'Monsters & Beasts',
    emoji: '🐲',
    description: 'Jagged spines and ancient bio-mechanical horrors.',
    perkTitle: '+5 Starting Length',
    perkDescription: 'Spawn into arena with +5 body segments.',
    perkType: 'startLength',
    perkValue: 5,
    color: '#f97316',
  },
  {
    id: 'cyberpunk',
    name: 'Cybernetic Wireframe',
    emoji: '⚡',
    description: 'Pulse lasers and hyper-alloy plating.',
    perkTitle: '+25% Drop-off Cash',
    perkDescription: '+25% permanent coins when banking segments.',
    perkType: 'income',
    perkValue: 0.25,
    color: '#06b6d4',
  },
];

export function computeCollectionPerks(unlockedSkinIds: string[]) {
  const perks = {
    speedBonus: 0,
    startLengthBonus: 0,
    incomeBonus: 0,
    magnetBonus: 0,
    allStatsBonus: 0,
  };

  COLLECTION_SETS.forEach((set) => {
    const setSkins = HANDCRAFTED_SKINS.filter((s) => s.category === set.id);
    const complete =
      setSkins.length > 0 && setSkins.every((s) => unlockedSkinIds.includes(s.id));
    if (complete) {
      if (set.perkType === 'speed') perks.speedBonus += 8;
      else if (set.perkType === 'startLength') perks.startLengthBonus += 5;
      else if (set.perkType === 'income') perks.incomeBonus += 25;
      else if (set.perkType === 'magnet') perks.magnetBonus += 25;
      else if (set.perkType === 'allStats') perks.allStatsBonus += 10;
    }
  });

  return perks;
}

// ---------------------------------------------------------------------------
// HANDCRAFTED FEATURED SKINS
// ---------------------------------------------------------------------------
export const HANDCRAFTED_SKINS: SkinDefinition[] = [
  // --- Minimalist ---
  {
    id: 'emerald',
    name: 'Toxic Emerald',
    category: 'minimalist',
    rarity: 'common',
    modelType: 'classic',
    description: 'Classic venomous serpent with bright green bio-luminescent scales.',
    primaryColor: '#10b981',
    secondaryColor: '#047857',
    glowColor: '#34d399',
    unlockType: 'default',
    unlocked: true,
    statBonus: 'Standard Issue',
  },
  {
    id: 'pure_mono',
    name: 'Mono White',
    category: 'minimalist',
    rarity: 'rare',
    modelType: 'classic',
    description: 'Ultra-clean pristine white matte scales with sleek minimal styling.',
    primaryColor: '#f8fafc',
    secondaryColor: '#94a3b8',
    glowColor: '#ffffff',
    coinPrice: 350,
    unlockType: 'coins',
    statBonus: '+3% Score Multiplier',
  },
  {
    id: 'pure_stealth',
    name: 'Midnight Obsidian',
    category: 'minimalist',
    rarity: 'epic',
    modelType: 'classic',
    description: 'Deep matte dark carbon finish designed for total arena stealth.',
    primaryColor: '#090d16',
    secondaryColor: '#1e293b',
    glowColor: '#38bdf8',
    coinPrice: 750,
    unlockType: 'coins',
    statBonus: '+6% Score Multiplier',
  },

  // --- Creatures (Shark, Electric Eel, Yeti, Snowman, Cat, Doge) ---
  {
    id: 'megalodon_shark',
    name: 'Apex Megalodon',
    category: 'creatures',
    rarity: 'legendary',
    modelType: 'shark',
    description: 'Ferocious prehistoric deep-sea predator with prominent dorsal fin and razor-sharp munching teeth.',
    primaryColor: '#0284c7',
    secondaryColor: '#0f172a',
    glowColor: '#38bdf8',
    coinPrice: 2200,
    unlockType: 'coins',
    statBonus: '+10% Speed & Shark Chomp',
  },
  {
    id: 'electric_eel_volt',
    name: 'Volt Eel',
    category: 'creatures',
    rarity: 'epic',
    modelType: 'electric_eel',
    description: 'Highly charged aquatic predator with glowing bio-luminescent voltage streaks.',
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    glowColor: '#fbbf24',
    coinPrice: 1800,
    unlockType: 'coins',
    statBonus: '+8% Magnet & Spark Effect',
  },
  {
    id: 'yeti_abominable',
    name: 'Ancient Yeti',
    category: 'creatures',
    rarity: 'legendary',
    modelType: 'yeti',
    description: 'The legendary abominable snow-serpent with thick white fur and massive tusks.',
    primaryColor: '#f1f5f9',
    secondaryColor: '#38bdf8',
    glowColor: '#ffffff',
    coinPrice: 3000,
    unlockType: 'coins',
    statBonus: '+15% Max HP & Ice Spikes',
  },
  {
    id: 'frosty_snowman',
    name: 'Frosty Snowman',
    category: 'creatures',
    rarity: 'epic',
    modelType: 'snowman',
    description: 'Chilly winter friend with coal eyes, a carrot nose, and a fancy black top hat.',
    primaryColor: '#ffffff',
    secondaryColor: '#f97316',
    glowColor: '#bae6fd',
    coinPrice: 1200,
    unlockType: 'coins',
    statBonus: '+6% Score & Snow Trail',
  },
  {
    id: 'cat_feline',
    name: 'Neko Kitty',
    category: 'creatures',
    rarity: 'common',
    modelType: 'cat',
    description: 'Adorable cat serpent featuring playful ears, whiskers, and a fluffy bell collar.',
    primaryColor: '#fb7185',
    secondaryColor: '#f43f5e',
    glowColor: '#fecdd3',
    coinPrice: 400,
    unlockType: 'coins',
    statBonus: '+2% Score Multiplier',
  },
  {
    id: 'shiba_doge',
    name: 'Shiba Inu',
    category: 'creatures',
    rarity: 'rare',
    modelType: 'cat',
    description: 'Energetic loyal pup with perked triangular ears and honey coat.',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    glowColor: '#fef3c7',
    coinPrice: 850,
    unlockType: 'coins',
    statBonus: '+3% Score Multiplier',
  },
  {
    id: 'panda_bamboo',
    name: 'Zen Panda',
    category: 'creatures',
    rarity: 'epic',
    modelType: 'cat',
    description: 'Calm black-and-white bear serpent fueled by pure bamboo tranquility.',
    primaryColor: '#1e293b',
    secondaryColor: '#f8fafc',
    glowColor: '#10b981',
    requiredLevel: 8,
    unlockType: 'milestone',
    statBonus: '+5% Score Multiplier',
  },

  // --- Vehicles (Roller Coaster Cart, Speedsters) ---
  {
    id: 'roller_coaster_vroom',
    name: 'Coaster Car',
    category: 'vehicles',
    rarity: 'legendary',
    modelType: 'roller_coaster',
    description: 'High-speed arcade roller coaster car with chrome bumpers and aerodynamic windshield.',
    primaryColor: '#ef4444',
    secondaryColor: '#334155',
    glowColor: '#ffffff',
    coinPrice: 2500,
    unlockType: 'coins',
    statBonus: '+12% Speed & Car Horn',
  },
  {
    id: 'turbo_hypercar',
    name: 'Turbo Racer',
    category: 'vehicles',
    rarity: 'legendary',
    modelType: 'roller_coaster',
    description: 'Nitro-injected hypercar chassis with track spoilers and radiant underglow.',
    primaryColor: '#0ea5e9',
    secondaryColor: '#1e1b4b',
    glowColor: '#38bdf8',
    coinPrice: 3200,
    unlockType: 'coins',
    statBonus: '+15% Sprint Acceleration',
  },
  {
    id: 'rocket_pod',
    name: 'Orbital Cart',
    category: 'vehicles',
    rarity: 'epic',
    modelType: 'roller_coaster',
    description: 'Space coaster capsule propelled by mini-thrusters and thermal heat shields.',
    primaryColor: '#f97316',
    secondaryColor: '#451a03',
    glowColor: '#fdba74',
    gemPrice: 8,
    unlockType: 'milestone',
    statBonus: '+8% Velocity Boost',
  },

  // --- Mythical (Dragon, Wyrm, Drake) ---
  {
    id: 'lava_wyrm',
    name: 'Magma Wyrm',
    category: 'mythical',
    rarity: 'epic',
    modelType: 'dragon',
    description: 'Forged in subterranean volcanoes with sweeping dragon horns and molten armor plates.',
    primaryColor: '#f97316',
    secondaryColor: '#dc2626',
    glowColor: '#fbbf24',
    requiredBossStage: 1,
    unlockType: 'boss',
    statBonus: '+5% Score Multiplier',
  },
  {
    id: 'void_phantom',
    name: 'Void Shadow',
    category: 'mythical',
    rarity: 'epic',
    modelType: 'dragon',
    description: 'Dimensional anomaly trailing dark matter spikes and violet lightning arcs.',
    primaryColor: '#a855f7',
    secondaryColor: '#6366f1',
    glowColor: '#c084fc',
    requiredBossStage: 2,
    unlockType: 'boss',
    statBonus: '+5% Score Multiplier',
  },
  {
    id: 'frost_wyrm',
    name: 'Glacial Drake',
    category: 'mythical',
    rarity: 'legendary',
    modelType: 'dragon',
    description: 'Mythical frost leviathan with sharp ice crystal antlers that freeze the arena floor.',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    glowColor: '#bae6fd',
    coinPrice: 1500,
    unlockType: 'coins',
    statBonus: '+8% Score & Frost Aura',
  },
  {
    id: 'abyssal_leviathan',
    name: 'Abyssal Dragon',
    category: 'mythical',
    rarity: 'legendary',
    modelType: 'dragon',
    description: 'Ancient sea dragon slumbering under oceanic trenches, crowned with bioluminescent jade spines.',
    primaryColor: '#059669',
    secondaryColor: '#064e3b',
    glowColor: '#6ee7b7',
    gemPrice: 15,
    unlockType: 'milestone',
    statBonus: '+12% Score & Acid Trail',
  },

  // --- Neon & Cyberpunk ---
  {
    id: 'cyber_neon',
    name: 'Cyberpunk V-1',
    category: 'neon',
    rarity: 'rare',
    modelType: 'robot',
    description: 'Synthetic wireframe chassis with scanning laser visor and cyber antennae.',
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    glowColor: '#22d3ee',
    unlockType: 'ad_watch',
    statBonus: '+3% Score Multiplier',
  },
  {
    id: 'quantum_android',
    name: 'Quantum Mech',
    category: 'neon',
    rarity: 'epic',
    modelType: 'robot',
    description: 'Heavy assault bipedal serpent head with neon exhaust manifolds and hexagonal plates.',
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    glowColor: '#f43f5e',
    coinPrice: 1000,
    unlockType: 'coins',
    statBonus: '+5% Score Multiplier',
  },
  {
    id: 'mecha_hydra',
    name: 'Mecha Hydra Prime',
    category: 'neon',
    rarity: 'legendary',
    modelType: 'robot',
    description: 'Autonomous super-dreadnought serpent with dual laser arrays and hyper-alloy plating.',
    primaryColor: '#10b981',
    secondaryColor: '#06b6d4',
    glowColor: '#6ee7b7',
    requiredLevel: 15,
    unlockType: 'milestone',
    statBonus: '+8% Score & Laser Trail',
  },
  {
    id: 'synth_overdrive',
    name: 'Synth Overdrive',
    category: 'neon',
    rarity: 'legendary',
    modelType: 'robot',
    description: 'Pulsing synthwave equalizer serpent flashing with 80s arcade rhythm bars.',
    primaryColor: '#f43f5e',
    secondaryColor: '#8b5cf6',
    glowColor: '#06b6d4',
    gemPrice: 12,
    unlockType: 'milestone',
    statBonus: '+10% Drop-off Cash & Neon Trail',
  },

  // --- Foods ---
  {
    id: 'watermelon_slither',
    name: 'Melon Crunch',
    category: 'foods',
    rarity: 'common',
    modelType: 'food',
    description: 'Refreshing summer watermelon serpent with emerald rind and ruby red seed segments.',
    primaryColor: '#ef4444',
    secondaryColor: '#15803d',
    glowColor: '#86efac',
    coinPrice: 500,
    unlockType: 'coins',
    statBonus: '+2% Score Multiplier',
  },
  {
    id: 'donut_swirl',
    name: 'Glazed Donut',
    category: 'foods',
    rarity: 'rare',
    modelType: 'food',
    description: 'Golden pastry snake drizzled in strawberry frosting and candy rainbow sprinkles.',
    primaryColor: '#f472b6',
    secondaryColor: '#d97706',
    glowColor: '#fbcfe8',
    unlockType: 'ad_watch',
    statBonus: '+3% Score Multiplier',
  },
  {
    id: 'pizza_viper',
    name: 'Pepperoni Slice',
    category: 'foods',
    rarity: 'epic',
    modelType: 'food',
    description: 'Mouthwatering melted cheese serpent topped with savory pepperoni discs and crispy crust.',
    primaryColor: '#f59e0b',
    secondaryColor: '#dc2626',
    glowColor: '#fef08a',
    unlockType: 'gacha',
    statBonus: '+5% Score Multiplier',
  },

  // --- Celestial & Void ---
  {
    id: 'golden_emperor',
    name: 'Imperial Gold',
    category: 'celestial',
    rarity: 'legendary',
    modelType: 'celestial',
    description: 'Polished pure gold royalty draped in luxury dragon horns and an imperial crown.',
    primaryColor: '#fbbf24',
    secondaryColor: '#d97706',
    glowColor: '#fef08a',
    gemPrice: 20,
    unlockType: 'gacha',
    statBonus: '+8% Score & Gold Gleam',
  },
  {
    id: 'solar_eclipse',
    name: 'Solar Eclipse',
    category: 'celestial',
    rarity: 'legendary',
    modelType: 'celestial',
    description: 'Cosmic deity crowned with glowing solar corona rings and black-hole obsidian scales.',
    primaryColor: '#18181b',
    secondaryColor: '#f59e0b',
    glowColor: '#fbbf24',
    requiredBossStage: 3,
    unlockType: 'boss',
    statBonus: '+8% Score & Solar Flairs',
  },
  {
    id: 'spectrum_prism',
    name: 'Spectrum Prism',
    category: 'celestial',
    rarity: 'epic',
    modelType: 'celestial',
    description: 'Hypnotic iridescent scales shifting across chromatic crystal frequencies.',
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    glowColor: '#38bdf8',
    unlockType: 'ad_watch',
    statBonus: '+5% Score Multiplier',
  },
];

// ---------------------------------------------------------------------------
// 100,000 SKINS PROCEDURAL GENERATION & VIRTUALIZATION ENGINE
// ---------------------------------------------------------------------------
export const TOTAL_SKINS_COUNT = 100000;
export const PAGE_SIZE = 50;

export const TOP_CATEGORIES = [
  { id: 'all' as const, name: 'All Skins', emoji: '🌐', totalCount: 100000 },
  { id: 'mythical' as const, name: 'Mythical', emoji: '🐉', totalCount: 18000, desc: 'Dragon & Wyrm Class' },
  { id: 'creatures' as const, name: 'Creatures', emoji: '🦈', totalCount: 22000, desc: 'Shark, Eel, Yeti, Snowman' },
  { id: 'vehicles' as const, name: 'Vehicles', emoji: '🎢', totalCount: 15000, desc: 'Roller Coaster Cars & Racers' },
  { id: 'neon' as const, name: 'Neon', emoji: '🤖', totalCount: 20000, desc: 'Cyberpunk Mechas & Synths' },
  { id: 'minimalist' as const, name: 'Minimalist', emoji: '🐍', totalCount: 12000, desc: 'Clean Monochrome & Classics' },
  { id: 'foods' as const, name: 'Foods', emoji: '🍉', totalCount: 7000, desc: 'Melon, Donuts, Snack Snakes' },
  { id: 'celestial' as const, name: 'Celestial', emoji: '✨', totalCount: 6000, desc: 'Imperial Gold & Solar Halos' },
];

const ADJECTIVES = [
  'Mega', 'Ultra', 'Super', 'Hyper', 'Turbo', 'Giga', 'Nano', 'Cyber', 'Neon', 'Dark',
  'Light', 'Void', 'Solar', 'Lunar', 'Frost', 'Magma', 'Toxic', 'Cosmic', 'Ancient', 'Prime',
  'Shadow', 'Crystal', 'Phantom', 'Ghost', 'Infernal', 'Glacial', 'Plasma', 'Nuclear', 'Golden', 'Silver',
  'Astral', 'Chrono', 'Titan', 'Vortex', 'Apex', 'Prismatic', 'Velvet', 'Quantum', 'Obsidian', 'Radiant'
];

const NAMES = [
  'Viper', 'Cobra', 'Drake', 'Basilisk', 'Hydra', 'Serpent', 'Worm', 'Slither', 'Wraith', 'Phantom',
  'Titan', 'Leviathan', 'Colossus', 'Dragon', 'Rex', 'Behemoth', 'Naga', 'Python', 'Anaconda', 'Boa',
  'Shark', 'Eel', 'Coaster', 'Racer', 'Yeti', 'Snowman', 'Droid', 'Sentinel', 'Predator', 'Striker'
];

const PALETTES = [
  { p: '#ef4444', s: '#991b1b', g: '#fca5a5' },
  { p: '#f97316', s: '#9a3412', g: '#fdba74' },
  { p: '#f59e0b', s: '#b45309', g: '#fde68a' },
  { p: '#eab308', s: '#854d0e', g: '#fef08a' },
  { p: '#84cc16', s: '#3f6212', g: '#bef264' },
  { p: '#22c55e', s: '#15803d', g: '#86efac' },
  { p: '#10b981', s: '#047857', g: '#6ee7b7' },
  { p: '#06b6d4', s: '#0e7490', g: '#67e8f9' },
  { p: '#0ea5e9', s: '#0369a1', g: '#7dd3fc' },
  { p: '#3b82f6', s: '#1d4ed8', g: '#93c5fd' },
  { p: '#6366f1', s: '#4338ca', g: '#a5b4fc' },
  { p: '#8b5cf6', s: '#6d28d9', g: '#c4b5fd' },
  { p: '#a855f7', s: '#7e22ce', g: '#d8b4fe' },
  { p: '#d946ef', s: '#a21caf', g: '#f0abfc' },
  { p: '#ec4899', s: '#be185d', g: '#f472b6' },
  { p: '#f43f5e', s: '#9f1239', g: '#fda4af' },
  { p: '#f8fafc', s: '#334155', g: '#ffffff' },
  { p: '#0f172a', s: '#334155', g: '#38bdf8' },
  { p: '#fbbf24', s: '#d97706', g: '#fef3c7' },
  { p: '#14b8a6', s: '#0f766e', g: '#5eead4' },
];

const CATEGORY_KEYS: SkinCategory[] = [
  'mythical',
  'creatures',
  'vehicles',
  'neon',
  'minimalist',
  'foods',
  'celestial',
];

/**
 * Deterministically constructs skin data for any integer index in [1, 100000]
 * without consuming memory or heap allocations.
 */
export function getProceduralSkin(index: number): SkinDefinition {
  const clamped = Math.max(1, Math.min(TOTAL_SKINS_COUNT, Math.floor(index)));
  const h1 = Math.abs((clamped * 15485863) ^ (clamped << 5));
  const h2 = Math.abs((clamped * 32452843) ^ (clamped >> 3));
  const h3 = Math.abs(clamped * 49979687);

  const adj = ADJECTIVES[h1 % ADJECTIVES.length];
  const noun = NAMES[h2 % NAMES.length];
  const cat = CATEGORY_KEYS[(clamped - 1) % CATEGORY_KEYS.length];

  // Pick model suitable for category
  let model: SkinModelType = 'classic';
  if (cat === 'mythical') {
    model = (h3 % 4 === 0) ? 'celestial' : 'dragon';
  } else if (cat === 'creatures') {
    const creatureModels: SkinModelType[] = ['shark', 'electric_eel', 'yeti', 'snowman', 'cat'];
    model = creatureModels[h3 % creatureModels.length];
  } else if (cat === 'vehicles') {
    model = 'roller_coaster';
  } else if (cat === 'neon') {
    model = 'robot';
  } else if (cat === 'minimalist') {
    model = 'classic';
  } else if (cat === 'foods') {
    model = 'food';
  } else {
    model = 'celestial';
  }

  const rarityRand = h1 % 100;
  const rarity: SkinRarity =
    rarityRand < 8 ? 'legendary' :
    rarityRand < 25 ? 'epic' :
    rarityRand < 55 ? 'rare' : 'common';

  const pal = PALETTES[h1 % PALETTES.length];

  // Currency & unlock criteria
  const isGemSkin = clamped % 7 === 0; // ~14% cost diamonds (gems)
  const isAdSkin = !isGemSkin && (clamped % 19 === 0);
  const isMilestone = !isGemSkin && !isAdSkin && (clamped % 23 === 0);

  let coinPrice: number | undefined;
  let gemPrice: number | undefined;
  let unlockType: SkinUnlockMethod = 'coins';
  let requiredLevel: number | undefined;

  if (isGemSkin) {
    unlockType = 'milestone'; // Purchased via gems
    gemPrice = 3 + (h2 % 22); // 3 to 24 diamonds
  } else if (isAdSkin) {
    unlockType = 'ad_watch';
  } else if (isMilestone) {
    unlockType = 'milestone';
    requiredLevel = 2 + (h2 % 19);
  } else {
    unlockType = 'coins';
    coinPrice = 250 + (h2 % 3200) + (rarity === 'legendary' ? 1200 : rarity === 'epic' ? 600 : 0);
  }

  const statBonus =
    rarity === 'legendary'
      ? `+12% ${['Speed Velocity', 'Magnet Radius', 'Drop-off Cash', 'Max HP'][h3 % 4]}`
      : rarity === 'epic'
      ? `+8% ${['Speed Velocity', 'Magnet Radius', 'Drop-off Cash', 'Score'][h3 % 4]}`
      : rarity === 'rare'
      ? `+5% ${['Score Multiplier', 'Magnet Aura', 'Speed Velocity'][h3 % 3]}`
      : '+2% Score Multiplier';

  return {
    id: `proc_${clamped}`,
    name: `${adj} ${noun} #${clamped}`,
    category: cat,
    rarity,
    modelType: model,
    description: `Catalog Skin #${clamped} of 100,000. Optimized lightweight ${rarity} grade ${cat} serpent.`,
    primaryColor: pal.p,
    secondaryColor: pal.s,
    glowColor: pal.g,
    coinPrice,
    gemPrice,
    requiredLevel,
    unlockType,
    statBonus,
  };
}

/**
 * High-performance O(1) skin resolver by ID.
 * Accurately finds handcrafted skins or generates procedural skin by numeric ID.
 */
export function getSkinById(id: string): SkinDefinition {
  const found = HANDCRAFTED_SKINS.find((s) => s.id === id);
  if (found) return found;
  if (id && id.startsWith('proc_')) {
    const idx = parseInt(id.slice(5), 10);
    if (!isNaN(idx) && idx >= 1 && idx <= TOTAL_SKINS_COUNT) {
      return getProceduralSkin(idx);
    }
  }
  return HANDCRAFTED_SKINS[0];
}

export interface SkinsQueryOptions {
  category?: SkinCategory | 'all';
  rarity?: SkinRarity | 'all';
  searchQuery?: string;
  minLevel?: number;
  currencyFilter?: 'all' | 'coins' | 'gems' | 'ads';
  page?: number;
  pageSize?: number;
}

export interface SkinsQueryResult {
  skins: SkinDefinition[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Deterministic pagination & search query provider.
 * Instantly provides a 50-item page for any of the 100,000 skins without
 * loading 100,000 items into memory.
 */
export function querySkinsPage(options: SkinsQueryOptions = {}): SkinsQueryResult {
  const {
    category = 'all',
    rarity = 'all',
    searchQuery = '',
    currencyFilter = 'all',
    page = 1,
    pageSize = PAGE_SIZE,
  } = options;

  const searchTrim = searchQuery.trim().toLowerCase();

  // If user searched for a specific procedural number e.g. "429" or "proc_429"
  if (searchTrim) {
    const directMatch = searchTrim.replace('proc_', '').replace('#', '');
    const directNum = parseInt(directMatch, 10);
    if (!isNaN(directNum) && directNum >= 1 && directNum <= TOTAL_SKINS_COUNT) {
      const skin = getProceduralSkin(directNum);
      return {
        skins: [skin],
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
      };
    }
  }

  // Filter handcrafted skins matching filters
  const filteredHandcrafted = HANDCRAFTED_SKINS.filter((s) => {
    if (category !== 'all' && s.category !== category) return false;
    if (rarity !== 'all' && s.rarity !== rarity) return false;
    if (currencyFilter === 'coins' && !s.coinPrice) return false;
    if (currencyFilter === 'gems' && !s.gemPrice) return false;
    if (currencyFilter === 'ads' && s.unlockType !== 'ad_watch') return false;
    if (searchTrim && !s.name.toLowerCase().includes(searchTrim) && !s.description.toLowerCase().includes(searchTrim)) {
      return false;
    }
    return true;
  });

  // Calculate total procedural count matching this category
  let proceduralTotal = TOTAL_SKINS_COUNT;
  if (category !== 'all') {
    const catIdx = CATEGORY_KEYS.indexOf(category);
    if (catIdx !== -1) {
      proceduralTotal = Math.floor(TOTAL_SKINS_COUNT / CATEGORY_KEYS.length);
    }
  }

  // Estimate total items based on filters
  let effectiveTotal = filteredHandcrafted.length + proceduralTotal;
  if (rarity !== 'all') effectiveTotal = Math.floor(effectiveTotal * 0.25);
  if (currencyFilter !== 'all') effectiveTotal = Math.floor(effectiveTotal * 0.3);
  if (searchTrim) effectiveTotal = Math.min(effectiveTotal, 100);

  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;

  const resultSkins: SkinDefinition[] = [];

  // Include handcrafted skins on early pages
  if (startIndex < filteredHandcrafted.length) {
    const end = Math.min(filteredHandcrafted.length, startIndex + pageSize);
    for (let i = startIndex; i < end; i++) {
      resultSkins.push(filteredHandcrafted[i]);
    }
  }

  // Fill remainder of the 50 slots with deterministically computed procedural skins
  let procSlot = Math.max(0, startIndex - filteredHandcrafted.length);
  while (resultSkins.length < pageSize && procSlot < proceduralTotal) {
    let procIndex = 1;
    if (category === 'all') {
      procIndex = procSlot + 1;
    } else {
      const catIdx = Math.max(0, CATEGORY_KEYS.indexOf(category));
      procIndex = 1 + catIdx + procSlot * CATEGORY_KEYS.length;
    }

    if (procIndex <= TOTAL_SKINS_COUNT) {
      const skin = getProceduralSkin(procIndex);
      let match = true;
      if (rarity !== 'all' && skin.rarity !== rarity) match = false;
      if (currencyFilter === 'coins' && !skin.coinPrice) match = false;
      if (currencyFilter === 'gems' && !skin.gemPrice) match = false;
      if (currencyFilter === 'ads' && skin.unlockType !== 'ad_watch') match = false;
      if (searchTrim && !skin.name.toLowerCase().includes(searchTrim)) match = false;

      if (match) {
        resultSkins.push(skin);
      }
    } else {
      break;
    }
    procSlot++;
    // Safety break to prevent long loops if strict filters are applied
    if (procSlot > startIndex - filteredHandcrafted.length + 300) break;
  }

  return {
    skins: resultSkins,
    totalCount: effectiveTotal,
    totalPages,
    currentPage,
  };
}

// Backward compatibility export with featured handcrafted skins + sample procedural skins
export const INITIAL_SKINS: SkinDefinition[] = [
  ...HANDCRAFTED_SKINS,
  ...Array.from({ length: 60 }, (_, i) => getProceduralSkin(i + 1)),
];



export interface StageDefinition {
  id: number;
  name: string;
  subtitle: string;
  terrainColor: string;
  gridColor: string;
  fogColor: string;
  skyTint: string;
  bossName: string;
  bossColor: string;
  bossHp: number;
  bossLength: number;
  cleared: boolean;
  unlocked: boolean;
}

export interface DailySpinReward {
  id: string;
  label: string;
  type: 'coins' | 'gems' | 'skin' | 'powerup' | 'start_buff';
  amount?: number;
  skinId?: string;
  icon: string;
  color: string;
}

export interface GameStats {
  score: number;
  pelletsEaten: number;
  botsKilled: number;
  cashEarnedThisMatch: number;
  totalPermanentCoins: number;
  totalGems: number;
  currentMatchTime: number; // 80 seconds max
  level: number;
  exp: number;
  expForNextLevel: number;
  currentLength: number;
  currentStageId: number;
  equippedSkinId: string;
  upgrades: PlayerUpgrades;
  lastDailySpinDate?: string;
  hasFreeDailySpin: boolean;
  activePowerUps: PowerUpActive;
  bossAlive: boolean;
  bossHp: number;
  bossMaxHp: number;
  stageProgress: number; // 0 to 100%
  bossPhase: number; // 1 or 2
}

export interface EvolutionTier {
  minLevel: number;
  title: string;
  scaleMultiplier: number;
  headHorns: number;
  colorName: string;
}

export const EVOLUTION_TIERS: EvolutionTier[] = [
  { minLevel: 1, title: 'Bronze Serpent', scaleMultiplier: 1.0, headHorns: 0, colorName: 'Warm Bronze' },
  { minLevel: 4, title: 'Emerald Viper', scaleMultiplier: 1.15, headHorns: 1, colorName: 'Toxic Emerald' },
  { minLevel: 8, title: 'Cobalt Basilisk', scaleMultiplier: 1.3, headHorns: 2, colorName: 'Cobalt Pulse' },
  { minLevel: 13, title: 'Neon Hydra', scaleMultiplier: 1.5, headHorns: 2, colorName: 'Neon Ultraviolet' },
  { minLevel: 18, title: 'Solar Leviathan', scaleMultiplier: 1.7, headHorns: 3, colorName: 'Solar Flare' },
  { minLevel: 25, title: 'Apex Cosmic Titan', scaleMultiplier: 2.0, headHorns: 4, colorName: 'Celestial Void' },
];

export const STAGES: StageDefinition[] = [
  {
    id: 1,
    name: 'Stage 1: Neon Grid',
    subtitle: 'High-speed synthwave arena',
    terrainColor: '#0b1120',
    gridColor: '#1e293b',
    fogColor: '#090d16',
    skyTint: '#0284c7',
    bossName: 'GIGA CYBER VIPER',
    bossColor: '#ef4444',
    bossHp: 600,
    bossLength: 45,
    cleared: false,
    unlocked: true,
  },
  {
    id: 2,
    name: 'Stage 2: Magma Cavern',
    subtitle: 'Molten volcanic arena with lava geysers',
    terrainColor: '#1c0e0e',
    gridColor: '#381616',
    fogColor: '#140808',
    skyTint: '#ea580c',
    bossName: 'INFERNAL WYRM LORD',
    bossColor: '#f97316',
    bossHp: 1200,
    bossLength: 60,
    cleared: false,
    unlocked: false,
  },
  {
    id: 3,
    name: 'Stage 3: Quantum Void',
    subtitle: 'Zero-gravity cosmic crystalline arena',
    terrainColor: '#0d0c1d',
    gridColor: '#241f4a',
    fogColor: '#080714',
    skyTint: '#9333ea',
    bossName: 'VOID BEHEMOTH PRIME',
    bossColor: '#c084fc',
    bossHp: 2000,
    bossLength: 80,
    cleared: false,
    unlocked: false,
  },
  {
    id: 4,
    name: 'Stage 4: Toxic Bio-Dome',
    subtitle: 'Acid swamp with radioactive spores',
    terrainColor: '#052e16',
    gridColor: '#14532d',
    fogColor: '#022c22',
    skyTint: '#10b981',
    bossName: 'CHITIN BROOD QUEEN',
    bossColor: '#22c55e',
    bossHp: 2800,
    bossLength: 95,
    cleared: false,
    unlocked: false,
  },
  {
    id: 5,
    name: 'Stage 5: Solar Wasteland',
    subtitle: 'High-heat desert with ancient sun monuments',
    terrainColor: '#291804',
    gridColor: '#451a03',
    fogColor: '#1c0a00',
    skyTint: '#f59e0b',
    bossName: 'SOLAR FLAME TITAN',
    bossColor: '#fbbf24',
    bossHp: 3800,
    bossLength: 110,
    cleared: false,
    unlocked: false,
  },
];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  length: number;
  score: number;
  level: number;
  isPlayer: boolean;
  isBoss: boolean;
  color: string;
}

export interface ObstacleData {
  id: number;
  x: number;
  z: number;
  radius: number;
  height: number;
  type: 'pillar' | 'crystal' | 'boulder';
  color: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  target: number;
  current: number;
  rewardType: 'coins' | 'gems' | 'exp';
  rewardAmount: number;
  completed: boolean;
  claimed: boolean;
  icon: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  target: number;
  current: number;
  rewardCoins: number;
  rewardGems: number;
  unlocked: boolean;
  claimed: boolean;
  icon: string;
}

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: 'daily_kills',
    title: 'Serpent Hunter',
    description: 'Eliminate 5 opponent snakes in match combat.',
    type: 'daily',
    target: 5,
    current: 0,
    rewardType: 'coins',
    rewardAmount: 300,
    completed: false,
    claimed: false,
    icon: 'Skull',
  },
  {
    id: 'daily_pellets',
    title: 'Pellet Feeder',
    description: 'Consume 300 food pellets across your rounds.',
    type: 'daily',
    target: 300,
    current: 0,
    rewardType: 'exp',
    rewardAmount: 120,
    completed: false,
    claimed: false,
    icon: 'Sparkles',
  },
  {
    id: 'daily_bank',
    title: 'Tycoon Deposit',
    description: 'Bank $1,000 cash at the central drop-off zone.',
    type: 'daily',
    target: 1000,
    current: 0,
    rewardType: 'coins',
    rewardAmount: 400,
    completed: false,
    claimed: false,
    icon: 'Coins',
  },
  {
    id: 'weekly_length',
    title: 'Mega Colossus',
    description: 'Reach a length of 50 body segments in any match.',
    type: 'weekly',
    target: 50,
    current: 0,
    rewardType: 'gems',
    rewardAmount: 15,
    completed: false,
    claimed: false,
    icon: 'Crown',
  },
  {
    id: 'weekly_boss',
    title: 'Titan Slayer',
    description: 'Defeat a Stage Boss in the 80-second arena.',
    type: 'weekly',
    target: 1,
    current: 0,
    rewardType: 'coins',
    rewardAmount: 1000,
    completed: false,
    claimed: false,
    icon: 'Award',
  },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first_kill',
    title: 'First Blood',
    description: 'Eliminate your first rival snake in arena combat.',
    tier: 'bronze',
    target: 1,
    current: 0,
    rewardCoins: 200,
    rewardGems: 5,
    unlocked: false,
    claimed: false,
    icon: 'Zap',
  },
  {
    id: 'ach_hunter_master',
    title: 'Apex Predator',
    description: 'Destroy 25 total opponents across all arenas.',
    tier: 'silver',
    target: 25,
    current: 0,
    rewardCoins: 800,
    rewardGems: 15,
    unlocked: false,
    claimed: false,
    icon: 'Skull',
  },
  {
    id: 'ach_bank_tycoon',
    title: 'Tycoon Mogul',
    description: 'Accumulate $5,000 total banked cash in drop-off zones.',
    tier: 'gold',
    target: 5000,
    current: 0,
    rewardCoins: 1200,
    rewardGems: 25,
    unlocked: false,
    claimed: false,
    icon: 'Coins',
  },
  {
    id: 'ach_pellet_master',
    title: 'Gluttonous Serpent',
    description: 'Eat 1,500 total glowing food pellets.',
    tier: 'silver',
    target: 1500,
    current: 0,
    rewardCoins: 600,
    rewardGems: 10,
    unlocked: false,
    claimed: false,
    icon: 'Sparkles',
  },
  {
    id: 'ach_colossus_80',
    title: 'Leviathan Form',
    description: 'Reach a staggering length of 80 body segments.',
    tier: 'diamond',
    target: 80,
    current: 0,
    rewardCoins: 2000,
    rewardGems: 50,
    unlocked: false,
    claimed: false,
    icon: 'Crown',
  },
  {
    id: 'ach_stage_3',
    title: 'Cosmic Ascendant',
    description: 'Clear Stage 3 and enter the quantum void mastery.',
    tier: 'gold',
    target: 3,
    current: 1,
    rewardCoins: 1500,
    rewardGems: 30,
    unlocked: false,
    claimed: false,
    icon: 'Compass',
  },
];

export const DAILY_SPIN_REWARDS: DailySpinReward[] = [
  { id: '1', label: '250 Coins', type: 'coins', amount: 250, icon: 'Coins', color: '#f59e0b' },
  { id: '2', label: 'Magnet Boost', type: 'powerup', icon: 'Magnet', color: '#3b82f6' },
  { id: '3', label: '600 Coins', type: 'coins', amount: 600, icon: 'Coins', color: '#eab308' },
  { id: '4', label: 'Speed Surge', type: 'powerup', icon: 'Zap', color: '#06b6d4' },
  { id: '5', label: '1200 Coins', type: 'coins', amount: 1200, icon: 'Coins', color: '#fbbf24' },
  { id: '6', label: 'Imperial Gold', type: 'skin', skinId: 'golden_emperor', icon: 'Crown', color: '#f59e0b' },
  { id: '7', label: '10 Gems', type: 'gems', amount: 10, icon: 'Sparkles', color: '#ec4899' },
  { id: '8', label: '+5 Start Length', type: 'start_buff', amount: 5, icon: 'Flame', color: '#10b981' },
];

export const UPGRADE_CONFIG = {
  speed: {
    name: 'Speed Velocity',
    description: 'Increases base cruising speed and sprint acceleration.',
    baseCost: 100,
    costMultiplier: 1.6,
    valuePerLevel: 0.12, // +12% speed
    maxLevel: 10,
    icon: 'Zap',
    color: '#06b6d4',
  },
  startLength: {
    name: 'Starting Length',
    description: 'Spawn with bonus trailing body segments right at match start.',
    baseCost: 150,
    costMultiplier: 1.7,
    valuePerLevel: 3, // +3 segments
    maxLevel: 10,
    icon: 'Flame',
    color: '#10b981',
  },
  income: {
    name: 'Drop-off Cash Multiplier',
    description: 'Earn more permanent cash when banking tail segments at the base zone.',
    baseCost: 200,
    costMultiplier: 1.8,
    valuePerLevel: 0.25, // +25% cash value
    maxLevel: 10,
    icon: 'DollarSign',
    color: '#fbbf24',
  },
  magnet: {
    name: 'Magnet Pickup Radius',
    description: 'Expands the suction field to vacuum pellets and loot piles automatically.',
    baseCost: 120,
    costMultiplier: 1.65,
    valuePerLevel: 2.5, // +2.5 units radius
    maxLevel: 10,
    icon: 'Magnet',
    color: '#a855f7',
  },
};

export type UpgradeType = keyof typeof UPGRADE_CONFIG;

export function getUpgradeCost(type: UpgradeType, currentLevel: number): number {
  const conf = UPGRADE_CONFIG[type];
  return Math.round(conf.baseCost * Math.pow(conf.costMultiplier, currentLevel));
}

export const MATCH_DURATION_SECONDS = 80; // 1 minute 20 seconds
export const BOSS_SPAWN_TIME_REMAINING = 40; // Boss arrives halfway
export const GACHA_BOX_COST = 300; // 300 coins to roll a mystery box
