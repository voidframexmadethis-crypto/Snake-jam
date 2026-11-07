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
}

export type SkinCategory = 'animals' | 'monsters' | 'cyberpunk' | 'foods' | 'celestial';
export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SkinModelType = 'classic' | 'cat' | 'dragon' | 'robot' | 'food' | 'celestial';
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
    name: 'Monsters & Mythics',
    emoji: '🐉',
    description: 'Ancient subterranean beasts with dragon horns and jagged spines.',
    perkTitle: '+5 Starting Length',
    perkDescription: 'Spawn into every arena with +5 extra body segments.',
    perkType: 'startLength',
    perkValue: 5,
    color: '#f97316',
  },
  {
    id: 'cyberpunk',
    name: 'Sci-Fi Cyberpunk',
    emoji: '🤖',
    description: 'High-tech synthetic wireframes with sensor visors and neon cores.',
    perkTitle: '+25% Drop-off Cash',
    perkDescription: 'Quantum processors earn +25% permanent coins when banking tail segments.',
    perkType: 'income',
    perkValue: 0.25,
    color: '#06b6d4',
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
    name: 'Celestial & Void',
    emoji: '✨',
    description: 'Transcendent royalty draped in solar halos and starlight facets.',
    perkTitle: '+10% All Passives & Sparkle Trail',
    perkDescription: 'Universal stat amplification plus glorious glowing starlight particle trail.',
    perkType: 'allStats',
    perkValue: 0.10,
    color: '#eab308',
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
    const setSkins = INITIAL_SKINS.filter((s) => s.category === set.id);
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

export const INITIAL_SKINS: SkinDefinition[] = [
  // --- Cute Animals ---
  {
    id: 'cat_feline',
    name: 'Neko Kitty',
    category: 'animals',
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
    category: 'animals',
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
    category: 'animals',
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

  // --- Monsters & Mythics ---
  {
    id: 'emerald',
    name: 'Toxic Emerald',
    category: 'monsters',
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
    id: 'lava_wyrm',
    name: 'Magma Wyrm',
    category: 'monsters',
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
    category: 'monsters',
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
    category: 'monsters',
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

  // --- Sci-Fi / Cyberpunk ---
  {
    id: 'cyber_neon',
    name: 'Cyberpunk V-1',
    category: 'cyberpunk',
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
    category: 'cyberpunk',
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
    category: 'cyberpunk',
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

  // --- Tasty Foods ---
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
