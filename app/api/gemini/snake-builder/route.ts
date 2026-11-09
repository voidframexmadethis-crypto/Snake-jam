import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { SkinModelType, SkinRarity } from '@/lib/gameTypes';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const VALID_MODEL_TYPES: SkinModelType[] = [
  'classic',
  'cat',
  'dragon',
  'robot',
  'food',
  'celestial',
  'roller_coaster',
  'snowman',
  'yeti',
  'electric_eel',
  'shark',
  'tiki_tiki',
];

const VALID_RARITIES: SkinRarity[] = ['common', 'rare', 'epic', 'legendary'];

function sanitizeHex(color: unknown, fallback: string): string {
  if (typeof color !== 'string') return fallback;
  let c = color.trim();
  if (!c.startsWith('#')) c = `#${c}`;
  if (/^#[0-9a-fA-F]{6}$/.test(c) || /^#[0-9a-fA-F]{3}$/.test(c)) return c;
  return fallback;
}

function generateSmartFallback(prompt: string) {
  const p = prompt.toLowerCase();
  let modelType: SkinModelType = 'dragon';
  let primaryColor = '#8b5cf6';
  let secondaryColor = '#ec4899';
  let glowColor = '#38bdf8';
  let rarity: SkinRarity = 'legendary';
  let statBonus = '+30% Speed & Energy Trail';

  if (p.includes('cat') || p.includes('kitty') || p.includes('dog') || p.includes('puppy') || p.includes('pet')) {
    modelType = 'cat';
    primaryColor = '#fb7185';
    secondaryColor = '#fda4af';
    glowColor = '#f43f5e';
    statBonus = '+25% Agility & Whisker Radar';
  } else if (p.includes('robot') || p.includes('cyber') || p.includes('mecha') || p.includes('tech') || p.includes('laser') || p.includes('neon')) {
    modelType = 'robot';
    primaryColor = '#06b6d4';
    secondaryColor = '#3b82f6';
    glowColor = '#22d3ee';
    statBonus = '+35% Drop Cash & Pulse Armor';
  } else if (p.includes('shark') || p.includes('ocean') || p.includes('aqua') || p.includes('sea') || p.includes('water')) {
    modelType = 'shark';
    primaryColor = '#0284c7';
    secondaryColor = '#0f172a';
    glowColor = '#38bdf8';
    statBonus = '+28% Chomp & Speed';
  } else if (p.includes('eel') || p.includes('electric') || p.includes('volt') || p.includes('lightning') || p.includes('shock')) {
    modelType = 'electric_eel';
    primaryColor = '#3b82f6';
    secondaryColor = '#1d4ed8';
    glowColor = '#fbbf24';
    statBonus = '+35% Magnet & Voltage Arc';
  } else if (p.includes('food') || p.includes('candy') || p.includes('donut') || p.includes('sweet') || p.includes('fruit') || p.includes('cake')) {
    modelType = 'food';
    primaryColor = '#f43f5e';
    secondaryColor = '#fbbf24';
    glowColor = '#a855f7';
    statBonus = '+40% Pellet Growth';
  } else if (p.includes('snow') || p.includes('frost') || p.includes('winter') || p.includes('ice') || p.includes('cold')) {
    modelType = 'snowman';
    primaryColor = '#ffffff';
    secondaryColor = '#f97316';
    glowColor = '#bae6fd';
    statBonus = '+25% Ice Drift & Top Hat Shield';
  } else if (p.includes('yeti') || p.includes('beast') || p.includes('monster') || p.includes('fur')) {
    modelType = 'yeti';
    primaryColor = '#f1f5f9';
    secondaryColor = '#38bdf8';
    glowColor = '#ffffff';
    statBonus = '+30% HP & Crushing Tusks';
  } else if (p.includes('coaster') || p.includes('car') || p.includes('speed') || p.includes('race') || p.includes('turbo') || p.includes('vehicle')) {
    modelType = 'roller_coaster';
    primaryColor = '#ef4444';
    secondaryColor = '#f59e0b';
    glowColor = '#fbbf24';
    statBonus = '+45% Sprint Acceleration';
  } else if (p.includes('tiki') || p.includes('queen') || p.includes('dress') || p.includes('gown') || p.includes('ponytail') || p.includes('emerald') || p.includes('green')) {
    modelType = 'tiki_tiki';
    primaryColor = '#059669';
    secondaryColor = '#10b981';
    glowColor = '#34d399';
    statBonus = '+30% Speed & Ponytail Wrap';
  } else if (p.includes('gold') || p.includes('sun') || p.includes('star') || p.includes('celestial') || p.includes('god') || p.includes('royal') || p.includes('crown') || p.includes('halo')) {
    modelType = 'celestial';
    primaryColor = '#fbbf24';
    secondaryColor = '#f59e0b';
    glowColor = '#ffffff';
    statBonus = '+35% Celestial Aura & All Stats';
  } else if (p.includes('fire') || p.includes('flame') || p.includes('magma') || p.includes('lava') || p.includes('dragon')) {
    modelType = 'dragon';
    primaryColor = '#dc2626';
    secondaryColor = '#ea580c';
    glowColor = '#fbbf24';
    statBonus = '+35% Inferno Blast & Horn Spikes';
  }

  const cleanPrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleanPrompt.split(/\s+/).slice(0, 3);
  const titleName = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Titan Viper';
  const name = titleName.length > 20 ? titleName.slice(0, 20) : titleName;

  return {
    id: `ai_snake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    category: 'mythical' as const,
    rarity,
    modelType,
    primaryColor,
    secondaryColor,
    glowColor,
    description: `Custom AI-forged serpent based on: "${prompt.slice(0, 50)}". Radiating legendary arena power.`,
    statBonus,
    unlockType: 'default' as const,
    unlocked: true,
  };
}

export async function POST(req: NextRequest) {
  let promptText = 'Mythic Serpent';
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    promptText = prompt.trim();
    const trimmedPrompt = promptText;

    if (!process.env.GEMINI_API_KEY) {
      // Fallback procedural generation if API key is not configured
      return NextResponse.json(generateSmartFallback(trimmedPrompt));
    }

    const systemInstruction = `You are an expert 3D character designer for a real-time Snake Tycoon Arena game.
When given a user prompt, create a striking, cohesive, and imaginative snake skin definition.
Valid modelType options:
- classic (blocky voxel Minecraft snake)
- cat (cute feline with pointy ears and whiskers)
- dragon (fierce horned dragon skull with fangs)
- robot (cybernetic sci-fi mech with neon optic bar and antennas)
- food (glazed sweet snack serpent with cherry on top)
- celestial (faceted gem skull with floating golden royal crown)
- roller_coaster (arcade coaster cart with windshield and headlights)
- snowman (white snow with top hat and carrot nose)
- yeti (fluffy abominable ice beast with horns)
- electric_eel (sleek aquatic predator with glow streaks)
- shark (apex marine predator with iconic dorsal fin)
- tiki_tiki (emerald gown queen with flowing ponytail and golden tiara)

Colors must be valid 6-character hex strings starting with # (e.g. #3b82f6).
Name must be max 20 characters.
Description must be under 80 characters.
Rarity must be one of: common, rare, epic, legendary.`;

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Design a unique custom 3D snake skin for this player description: "${trimmedPrompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Creative catchy name (max 20 chars)',
            },
            modelType: {
              type: Type.STRING,
              description: 'One of: classic, cat, dragon, robot, food, celestial, roller_coaster, snowman, yeti, electric_eel, shark, tiki_tiki',
            },
            primaryColor: {
              type: Type.STRING,
              description: 'Hex color code starting with # e.g. #3b82f6',
            },
            secondaryColor: {
              type: Type.STRING,
              description: 'Hex color code starting with # e.g. #1d4ed8',
            },
            glowColor: {
              type: Type.STRING,
              description: 'Hex color code starting with # e.g. #60a5fa',
            },
            description: {
              type: Type.STRING,
              description: 'Vivid lore description under 80 characters',
            },
            statBonus: {
              type: Type.STRING,
              description: 'Perk description e.g. +30% Speed',
            },
            rarity: {
              type: Type.STRING,
              description: 'One of: common, rare, epic, legendary',
            },
          },
          required: [
            'name',
            'modelType',
            'primaryColor',
            'secondaryColor',
            'glowColor',
            'description',
            'statBonus',
            'rarity',
          ],
        },
      },
    });

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 4200);
    });

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const fallback = generateSmartFallback(trimmedPrompt);

    if (!response || !response.text) {
      return NextResponse.json(fallback);
    }

    const text = response.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const modelType: SkinModelType = VALID_MODEL_TYPES.includes(parsed.modelType)
      ? parsed.modelType
      : fallback.modelType;

    const rarity: SkinRarity = VALID_RARITIES.includes(parsed.rarity)
      ? parsed.rarity
      : 'legendary';

    const skinDefinition = {
      id: `ai_snake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(parsed.name || fallback.name).slice(0, 20),
      category: 'mythical' as const,
      rarity,
      modelType,
      primaryColor: sanitizeHex(parsed.primaryColor, fallback.primaryColor),
      secondaryColor: sanitizeHex(parsed.secondaryColor, fallback.secondaryColor),
      glowColor: sanitizeHex(parsed.glowColor, fallback.glowColor),
      description: String(parsed.description || fallback.description).slice(0, 80),
      statBonus: String(parsed.statBonus || fallback.statBonus).slice(0, 36),
      unlockType: 'default' as const,
      unlocked: true,
    };

    return NextResponse.json(skinDefinition);
  } catch (error: any) {
    console.error('AI Snake Builder Error:', error);
    // Return smart keyword fallback if API encounters any problem so user is never stuck
    return NextResponse.json(generateSmartFallback(promptText || 'Mythic Serpent'));
  }
}
