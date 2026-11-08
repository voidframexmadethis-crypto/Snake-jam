// Comprehensive Modding System for Snake Tycoon Arena
// Supports custom modifiers, community mods, import/export, and in-game mod editor

export type ModCategory = 'gameplay' | 'physics' | 'weapons' | 'visuals' | 'economy';

export type SpecialAbilityType = 'none' | 'laser_venom' | 'poop_bombs' | 'shield_barrier' | 'stealth_cloak';

export interface ModConfig {
  speedMultiplier: number;          // 0.5 to 5.0
  boostSpeedMultiplier: number;     // 1.0 to 4.0
  boostCostMultiplier: number;      // 0.0 (infinite) to 2.0
  turnRateMultiplier: number;       // 0.5 to 3.0
  tailScaleMultiplier: number;      // 0.5 to 4.0
  tailGrowthPerPellet: number;      // 1 to 20
  pelletValueMultiplier: number;    // 1 to 50
  pelletDensityMultiplier: number;  // 0.5 to 3.0
  magnetRangeMultiplier: number;    // 1.0 to 10.0
  specialAbility: SpecialAbilityType;
  rainbowChromaTrail: boolean;
  lowGravityPhysics: boolean;
  retroWireframe: boolean;
  bossMultiSpawn: boolean;
  infiniteBoost: boolean;
  explosivePoopMines: boolean;
}

export interface GameMod {
  id: string;
  name: string;
  author: string;
  version: string;
  description: string;
  category: ModCategory;
  iconName: string;
  enabled: boolean;
  isBuiltIn: boolean;
  config: ModConfig;
}

export const DEFAULT_MOD_CONFIG: ModConfig = {
  speedMultiplier: 1.0,
  boostSpeedMultiplier: 1.0,
  boostCostMultiplier: 1.0,
  turnRateMultiplier: 1.0,
  tailScaleMultiplier: 1.0,
  tailGrowthPerPellet: 1,
  pelletValueMultiplier: 1.0,
  pelletDensityMultiplier: 1.0,
  magnetRangeMultiplier: 1.0,
  specialAbility: 'none',
  rainbowChromaTrail: false,
  lowGravityPhysics: false,
  retroWireframe: false,
  bossMultiSpawn: false,
  infiniteBoost: false,
  explosivePoopMines: false,
};

export const BUILT_IN_MODS: GameMod[] = [
  {
    id: 'mod_hyperspeed',
    name: 'Hyperspeed Blitz',
    author: 'SerpentLabs',
    version: '1.2.0',
    description: 'Cranks base slither speed by 2.2x and triples boost acceleration with neon afterburners.',
    category: 'physics',
    iconName: 'Zap',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      speedMultiplier: 2.2,
      boostSpeedMultiplier: 2.8,
      turnRateMultiplier: 1.4,
    },
  },
  {
    id: 'mod_nuclear_poop',
    name: 'Nuclear Poop Mines',
    author: 'ViperWeaponsCo',
    version: '2.0.1',
    description: 'Poop pellets dropped on death or digestion turn into volatile proximity landmines that detonate when enemies touch them!',
    category: 'weapons',
    iconName: 'Bomb',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      explosivePoopMines: true,
      specialAbility: 'poop_bombs',
    },
  },
  {
    id: 'mod_laser_venom',
    name: 'Venom Plasma Cannon',
    author: 'ApexTech',
    version: '1.5.0',
    description: 'Grants an active weapon! Press [F] or click the plasma button to launch piercing venom orbs that vaporize AI snakes into pellets.',
    category: 'weapons',
    iconName: 'Flame',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      specialAbility: 'laser_venom',
    },
  },
  {
    id: 'mod_vortex_magnet',
    name: 'Vortex Magnetron',
    author: 'QuantumSlither',
    version: '1.0.4',
    description: 'Expands the suction field 6x, vacuuming pellets, diamonds, and dropped loot from across hundreds of meters.',
    category: 'gameplay',
    iconName: 'Magnet',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      magnetRangeMultiplier: 6.0,
    },
  },
  {
    id: 'mod_rainbow_chroma',
    name: 'Cosmic Rainbow Aura',
    author: 'ChromaCore',
    version: '3.1.0',
    description: 'Infuses your snake body with an undulating dynamic RGB rainbow prism and glittering cosmic starfield particles.',
    category: 'visuals',
    iconName: 'Sparkles',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      rainbowChromaTrail: true,
    },
  },
  {
    id: 'mod_colossus_titan',
    name: 'Mega Colossus Serpents',
    author: 'TitanForge',
    version: '1.1.2',
    description: 'Increases segment girth by 2.5x and super-sizes snake heads for an intimidating titan presence across the arena.',
    category: 'physics',
    iconName: 'Crown',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      tailScaleMultiplier: 2.5,
      tailGrowthPerPellet: 3,
    },
  },
  {
    id: 'mod_diamond_rain',
    name: 'Diamond Rain Extravaganza',
    author: 'GoldTycoon',
    version: '1.0.0',
    description: '10x pellet value! Every bite showers your wallet with bonus diamonds, EXP, and millions of permanent coins.',
    category: 'economy',
    iconName: 'Coins',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      pelletValueMultiplier: 10.0,
    },
  },
  {
    id: 'mod_zero_g',
    name: 'Zero-G Moon Drift',
    author: 'AstroSnake',
    version: '1.0.2',
    description: 'Disables arena friction, allowing graceful serpentine gliding with smooth inertia and low-gravity momentum.',
    category: 'physics',
    iconName: 'Compass',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      lowGravityPhysics: true,
      turnRateMultiplier: 1.3,
    },
  },
  {
    id: 'mod_infinite_boost',
    name: 'Infinite Nitro Booster',
    author: 'TurboGod',
    version: '1.0.0',
    description: 'Sprint at top speed indefinitely without losing tail segments or expending stamina.',
    category: 'gameplay',
    iconName: 'Rocket',
    enabled: false,
    isBuiltIn: true,
    config: {
      ...DEFAULT_MOD_CONFIG,
      infiniteBoost: true,
      boostCostMultiplier: 0.0,
      boostSpeedMultiplier: 2.2,
    },
  },
];

const MODS_STORAGE_KEY = 'SnakeTycoon_ActiveMods_v1';
const CUSTOM_MODS_STORAGE_KEY = 'SnakeTycoon_CustomMods_v1';

// Load all mods (combines built-in with custom mods and persisted active state)
export function getStoredMods(): GameMod[] {
  if (typeof window === 'undefined') return BUILT_IN_MODS;

  try {
    let customMods: GameMod[] = [];
    const customJson = localStorage.getItem(CUSTOM_MODS_STORAGE_KEY);
    if (customJson) {
      customMods = JSON.parse(customJson);
    }

    const allMods = [...BUILT_IN_MODS, ...customMods];
    const activeIdsJson = localStorage.getItem(MODS_STORAGE_KEY);
    if (activeIdsJson) {
      const activeIds: string[] = JSON.parse(activeIdsJson);
      return allMods.map((mod) => ({
        ...mod,
        enabled: activeIds.includes(mod.id),
      }));
    }

    return allMods;
  } catch (e) {
    console.warn('Failed to load mods from localStorage:', e);
    return BUILT_IN_MODS;
  }
}

// Save active enabled state of mods
export function saveActiveMods(mods: GameMod[]): void {
  if (typeof window === 'undefined') return;
  try {
    const activeIds = mods.filter((m) => m.enabled).map((m) => m.id);
    localStorage.setItem(MODS_STORAGE_KEY, JSON.stringify(activeIds));
  } catch (e) {
    console.warn('Failed to save active mods:', e);
  }
}

// Save custom user-created mods
export function saveCustomMods(customMods: GameMod[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_MODS_STORAGE_KEY, JSON.stringify(customMods));
  } catch (e) {
    console.warn('Failed to save custom mods:', e);
  }
}

// Compute aggregate modifiers from all currently enabled mods
export function computeActiveModModifiers(mods: GameMod[]): ModConfig {
  const active = mods.filter((m) => m.enabled);
  if (active.length === 0) return { ...DEFAULT_MOD_CONFIG };

  const aggregate: ModConfig = { ...DEFAULT_MOD_CONFIG };

  for (const mod of active) {
    const c = mod.config;
    aggregate.speedMultiplier *= c.speedMultiplier;
    aggregate.boostSpeedMultiplier *= c.boostSpeedMultiplier;
    aggregate.boostCostMultiplier *= c.boostCostMultiplier;
    aggregate.turnRateMultiplier *= c.turnRateMultiplier;
    aggregate.tailScaleMultiplier *= c.tailScaleMultiplier;
    aggregate.tailGrowthPerPellet += (c.tailGrowthPerPellet - 1);
    aggregate.pelletValueMultiplier *= c.pelletValueMultiplier;
    aggregate.pelletDensityMultiplier *= c.pelletDensityMultiplier;
    aggregate.magnetRangeMultiplier *= c.magnetRangeMultiplier;

    if (c.specialAbility !== 'none') {
      aggregate.specialAbility = c.specialAbility;
    }
    if (c.rainbowChromaTrail) aggregate.rainbowChromaTrail = true;
    if (c.lowGravityPhysics) aggregate.lowGravityPhysics = true;
    if (c.retroWireframe) aggregate.retroWireframe = true;
    if (c.bossMultiSpawn) aggregate.bossMultiSpawn = true;
    if (c.infiniteBoost) aggregate.infiniteBoost = true;
    if (c.explosivePoopMines) aggregate.explosivePoopMines = true;
  }

  // Cap modifiers to sensible game limits
  aggregate.speedMultiplier = Math.min(6.0, Math.max(0.4, aggregate.speedMultiplier));
  aggregate.boostSpeedMultiplier = Math.min(5.0, Math.max(1.0, aggregate.boostSpeedMultiplier));
  aggregate.tailScaleMultiplier = Math.min(4.0, Math.max(0.5, aggregate.tailScaleMultiplier));
  aggregate.magnetRangeMultiplier = Math.min(15.0, Math.max(1.0, aggregate.magnetRangeMultiplier));

  return aggregate;
}

// Export all mods as a formatted JSON string
export function exportModsToJson(mods: GameMod[]): string {
  return JSON.stringify(mods, null, 2);
}

// Import mods from JSON string
export function importModsFromJson(jsonStr: string): { success: boolean; message: string; mods?: GameMod[] } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) && typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON structure. Expected array or mod object.' };
    }

    const candidateMods: GameMod[] = Array.isArray(parsed) ? parsed : [parsed];
    const validMods: GameMod[] = [];

    for (const item of candidateMods) {
      if (!item.id || !item.name || !item.config) {
        continue;
      }
      validMods.push({
        id: item.id.startsWith('custom_') ? item.id : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: String(item.name).slice(0, 36),
        author: String(item.author || 'Community').slice(0, 24),
        version: String(item.version || '1.0.0').slice(0, 10),
        description: String(item.description || 'Community Mod').slice(0, 120),
        category: (['gameplay', 'physics', 'weapons', 'visuals', 'economy'].includes(item.category)
          ? item.category
          : 'gameplay') as ModCategory,
        iconName: item.iconName || 'Zap',
        enabled: Boolean(item.enabled),
        isBuiltIn: false,
        config: {
          ...DEFAULT_MOD_CONFIG,
          ...item.config,
        },
      });
    }

    if (validMods.length === 0) {
      return { success: false, message: 'No valid mod configurations found in the provided code.' };
    }

    return {
      success: true,
      message: `Successfully loaded ${validMods.length} mod(s)!`,
      mods: validMods,
    };
  } catch (e: any) {
    return { success: false, message: `Syntax error in JSON: ${e?.message || 'Invalid format'}` };
  }
}
