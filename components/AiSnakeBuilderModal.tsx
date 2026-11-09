'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import {
  X,
  Sparkles,
  Wand2,
  Check,
  RotateCw,
  Cpu,
  Flame,
  Zap,
  Shield,
  Timer,
  Compass,
} from 'lucide-react';
import { SkinDefinition, SkinModelType, SkinRarity } from '@/lib/gameTypes';
import { buildSnakeProceduralHead, buildSnakeSegmentMesh } from '@/lib/snakeModelBuilder';
import { soundManager } from '@/lib/audio';
import { addressableManager } from '@/lib/addressables';

interface AiSnakeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndEquip: (skin: SkinDefinition) => void;
}

const FORGE_STAGES = [
  { sec: 5, label: 'Initializing Gemini 3.8 Neural Matrix...', icon: Cpu, color: 'text-purple-400' },
  { sec: 4, label: 'Synthesizing Chromatic Pigments & Scales...', icon: Sparkles, color: 'text-pink-400' },
  { sec: 3, label: 'Sculpting Procedural 3D Head Geometry...', icon: Wand2, color: 'text-cyan-400' },
  { sec: 2, label: 'Infusing Mythical Aura & Radiance...', icon: Flame, color: 'text-amber-400' },
  { sec: 1, label: 'Enchanting Passive Combat Perk & Stats...', icon: Zap, color: 'text-emerald-400' },
  { sec: 0, label: 'Custom AI Serpent Assembled!', icon: Check, color: 'text-green-400' },
];

const PRESET_PROMPTS = [
  { name: 'Tiki Tiki Goddess', prompt: 'Tiki Tiki queen with emerald gown, long flowing ponytail and golden tiara' },
  { name: 'Cyberpunk Mecha', prompt: 'Cyberpunk mecha robot serpent with glowing neon cyan visor and titanium armor' },
  { name: 'Inferno Dragon', prompt: 'Inferno magma dragon snake with razor fangs, glowing lava horns and flame aura' },
  { name: 'Neon Electric Eel', prompt: 'High-voltage electric eel with vibrant lightning arcs and deep ocean blue scales' },
  { name: 'Celestial Sun Pharaoh', prompt: 'Celestial solar pharaoh snake with floating gold crown and radiating starlight' },
  { name: 'Apex Abyssal Shark', prompt: 'Ferocious deep sea apex shark serpent with iconic dorsal fin and midnight scales' },
  { name: 'Glazed Candy Viper', prompt: 'Sweet glazed strawberry pastry snake with golden sprinkles and cherry topping' },
  { name: 'Frostbite Yeti Titan', prompt: 'Abominable frost yeti ice serpent with colossal ivory horns and blizzard fur' },
];

function generateClientFallbackSkin(prompt: string): SkinDefinition {
  const p = prompt.toLowerCase();
  let modelType: SkinModelType = 'dragon';
  let primaryColor = '#8b5cf6';
  let secondaryColor = '#ec4899';
  let glowColor = '#38bdf8';
  let rarity: SkinRarity = 'legendary';
  let statBonus = '+30% Speed & Energy Trail';

  if (p.includes('tiki') || p.includes('queen') || p.includes('gown') || p.includes('ponytail') || p.includes('emerald') || p.includes('goddess')) {
    modelType = 'tiki_tiki';
    primaryColor = '#059669';
    secondaryColor = '#10b981';
    glowColor = '#34d399';
    statBonus = '+30% Speed & Ponytail Wrap';
  } else if (p.includes('robot') || p.includes('cyber') || p.includes('mecha') || p.includes('tech') || p.includes('laser') || p.includes('neon')) {
    modelType = 'robot';
    primaryColor = '#06b6d4';
    secondaryColor = '#3b82f6';
    glowColor = '#22d3ee';
    statBonus = '+35% Drop Cash & Pulse Armor';
  } else if (p.includes('shark') || p.includes('ocean') || p.includes('aqua') || p.includes('water') || p.includes('abyss')) {
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
  } else if (p.includes('cat') || p.includes('kitty') || p.includes('cute') || p.includes('feline')) {
    modelType = 'cat';
    primaryColor = '#fb7185';
    secondaryColor = '#fda4af';
    glowColor = '#f43f5e';
    statBonus = '+25% Agility & Whisker Radar';
  } else if (p.includes('food') || p.includes('candy') || p.includes('donut') || p.includes('sweet') || p.includes('sugar') || p.includes('fruit')) {
    modelType = 'food';
    primaryColor = '#f43f5e';
    secondaryColor = '#fbbf24';
    glowColor = '#a855f7';
    statBonus = '+40% Pellet Growth';
  } else if (p.includes('snow') || p.includes('frost') || p.includes('winter') || p.includes('ice')) {
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
  } else if (p.includes('coaster') || p.includes('car') || p.includes('speed') || p.includes('turbo')) {
    modelType = 'roller_coaster';
    primaryColor = '#ef4444';
    secondaryColor = '#f59e0b';
    glowColor = '#fbbf24';
    statBonus = '+45% Sprint Acceleration';
  } else if (p.includes('gold') || p.includes('sun') || p.includes('star') || p.includes('celestial') || p.includes('halo') || p.includes('crown') || p.includes('pharaoh')) {
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
    category: 'mythical',
    rarity,
    modelType,
    primaryColor,
    secondaryColor,
    glowColor,
    description: `Custom AI-forged serpent based on "${prompt.slice(0, 48)}".`,
    statBonus,
    unlockType: 'default',
    unlocked: true,
  };
}

export default function AiSnakeBuilderModal({
  isOpen,
  onClose,
  onSaveAndEquip,
}: AiSnakeBuilderModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [forgeProgress, setForgeProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const [generatedSkin, setGeneratedSkin] = useState<SkinDefinition | null>({
    id: 'ai_preview_default',
    name: 'Cosmic Nebula Viper',
    category: 'mythical',
    rarity: 'legendary',
    modelType: 'dragon',
    primaryColor: '#8b5cf6',
    secondaryColor: '#ec4899',
    glowColor: '#38bdf8',
    description: 'An AI-crafted celestial serpent radiating stellar power.',
    statBonus: '+30% Speed & Magnet Range',
    unlockType: 'default',
  });

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const pendingSkinRef = useRef<SkinDefinition | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // 3D Preview Canvas for Generated Snake
  useEffect(() => {
    if (!isOpen || !generatedSkin || !previewContainerRef.current) return;
    const container = previewContainerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 5.2);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.replaceChildren(renderer.domElement);

    const ambLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(4, 8, 6);
    scene.add(dirLight);

    const glowLight = new THREE.PointLight(generatedSkin.glowColor, 3.5, 8);
    glowLight.position.set(0, 1.8, 1.5);
    scene.add(glowLight);

    const snakeGroup = new THREE.Group();
    const { headGroup } = buildSnakeProceduralHead(
      generatedSkin.primaryColor,
      generatedSkin.secondaryColor,
      generatedSkin.glowColor,
      generatedSkin.modelType,
      false,
      1.15
    );
    headGroup.position.set(0, 0, 1.0);
    headGroup.rotation.y = Math.PI;
    snakeGroup.add(headGroup);

    const segmentOffsets = [
      { x: 0.1, z: 0.0, rotY: 0.15 },
      { x: 0.45, z: -0.9, rotY: 0.4 },
      { x: 0.35, z: -1.8, rotY: -0.2 },
      { x: -0.15, z: -2.7, rotY: -0.4 },
    ];

    segmentOffsets.forEach((off, idx) => {
      const segMesh = buildSnakeSegmentMesh(
        generatedSkin.primaryColor,
        generatedSkin.secondaryColor,
        generatedSkin.glowColor,
        idx,
        generatedSkin.modelType,
        false,
        1.05
      );
      segMesh.position.set(off.x, 0.1, off.z);
      segMesh.rotation.y = off.rotY;
      snakeGroup.add(segMesh);
    });

    snakeGroup.position.set(0, -0.15, 0.4);
    scene.add(snakeGroup);

    let animId = 0;
    let clock = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.016;
      snakeGroup.rotation.y += 0.01;
      snakeGroup.position.y = -0.15 + Math.sin(clock * 2.2) * 0.05;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      addressableManager.unloadAssetGroup(snakeGroup);
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, generatedSkin]);

  // Exact 5-Second AI Snake Forging Routine
  const startFiveSecondForge = useCallback(
    async (targetPrompt: string) => {
      const trimmed = targetPrompt.trim();
      if (!trimmed || isGenerating) return;

      setIsGenerating(true);
      setErrorMessage(null);
      setShowCelebration(false);
      setCountdownSeconds(5);
      setForgeProgress(0);
      pendingSkinRef.current = null;

      soundManager.playDailySpinTick();

      // Launch Gemini generation in parallel
      fetch('/api/gemini/snake-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data && data.name) {
              pendingSkinRef.current = data;
              return;
            }
          }
          // Server returned non-ok or empty, use client-side intelligent fallback
          pendingSkinRef.current = generateClientFallbackSkin(trimmed);
        })
        .catch((err) => {
          console.warn('Network issue during AI snake generation, using client fallback:', err);
          pendingSkinRef.current = generateClientFallbackSkin(trimmed);
        });

      // Exact 5,000ms countdown timer
      const TOTAL_MS = 5000;
      const startTime = Date.now();
      let lastReportedSec = 5;

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressPct = Math.min(100, (elapsed / TOTAL_MS) * 100);
        setForgeProgress(progressPct);

        const remainingMs = Math.max(0, TOTAL_MS - elapsed);
        const curSec = Math.max(0, Math.ceil(remainingMs / 1000));

        if (curSec !== lastReportedSec) {
          lastReportedSec = curSec;
          setCountdownSeconds(curSec);
          if (curSec > 0) {
            soundManager.playDailySpinTick();
          }
        }

        if (elapsed >= TOTAL_MS) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          const finalSkin =
            pendingSkinRef.current || generateClientFallbackSkin(trimmed);

          setGeneratedSkin(finalSkin);
          setIsGenerating(false);
          setCountdownSeconds(0);
          setForgeProgress(100);
          setShowCelebration(true);
          soundManager.playGachaLegendary();
        }
      }, 50);
    },
    [isGenerating]
  );

  const handleGenerate = () => {
    startFiveSecondForge(prompt);
  };

  const handleSelectPreset = (presetPrompt: string) => {
    setPrompt(presetPrompt);
    startFiveSecondForge(presetPrompt);
  };

  if (!isOpen) return null;

  const currentStageInfo =
    FORGE_STAGES.find((s) => s.sec === countdownSeconds) || FORGE_STAGES[0];
  const StageIcon = currentStageInfo.icon;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-purple-500/40 bg-slate-900 shadow-2xl p-5 sm:p-6 flex flex-col cursor-default max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20">
              <Wand2 className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-100 tracking-tight">
                  AI Snake Builder
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-black text-purple-300">
                  5-SEC FORGE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Type any prompt to forge a custom 3D legendary snake in exactly 5 seconds!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Prompt Input Section */}
        <div className="py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Describe Your Custom Snake:</span>
              <span className="text-[10px] text-purple-400 font-mono">
                ⚡ Powered by Gemini 3.8-Flash
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="e.g. Cyberpunk mecha dragon with neon pink lasers and golden spikes..."
                value={prompt}
                disabled={isGenerating}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition disabled:opacity-60"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:brightness-110 disabled:opacity-50 text-slate-100 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 transition active:scale-98 shrink-0"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin text-cyan-300" />
                    <span>Forging ({countdownSeconds}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    <span>Forge Snake (5s)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preset Prompts Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-semibold">
              Instant 1-Click Inspirations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((item) => (
                <button
                  key={item.name}
                  disabled={isGenerating}
                  onClick={() => handleSelectPreset(item.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-bold text-purple-300 hover:text-purple-200 transition disabled:opacity-50 active:scale-95"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-300 font-bold flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-200 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Active 5-Second Forging Banner */}
        {isGenerating && (
          <div className="mb-4 rounded-2xl border-2 border-purple-500/60 bg-gradient-to-r from-purple-950/90 via-slate-900 to-cyan-950/90 p-4 shadow-xl shadow-purple-500/20 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-purple-900/80 border border-purple-400/50 text-purple-300">
                  <StageIcon className="h-4 w-4 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                    <span>Forging Custom Snake</span>
                    <span className="text-cyan-400 font-mono">· {countdownSeconds}s Left</span>
                  </div>
                  <div className="text-[11px] text-purple-300 font-semibold">
                    {currentStageInfo.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-purple-500/40 text-xs font-mono font-black text-purple-300">
                <Timer className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                <span>{countdownSeconds}s</span>
              </div>
            </div>

            {/* Glowing 5-Second Progress Bar */}
            <div className="relative h-2.5 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-75 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                style={{ width: `${forgeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 3D Preview & Custom Stats Card */}
        {generatedSkin && (
          <div
            className={`rounded-2xl border ${
              showCelebration
                ? 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]'
                : 'border-slate-800'
            } bg-slate-950/70 p-4 flex flex-col sm:flex-row gap-4 items-center transition-all duration-300`}
          >
            {/* 3D Canvas Preview */}
            <div className="relative w-full sm:w-1/2 h-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-900/90 flex items-center justify-center">
              <div ref={previewContainerRef} className="absolute inset-0 w-full h-full" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-black text-purple-300 border border-purple-500/40 backdrop-blur-sm">
                3D AI PREVIEW
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-black text-cyan-400 border border-slate-700/80 backdrop-blur-sm flex items-center gap-1">
                <span>{generatedSkin.rarity.toUpperCase()}</span>
                <span>·</span>
                <span className="capitalize">{generatedSkin.modelType}</span>
              </div>
            </div>

            {/* Snake Stats & Metadata */}
            <div className="w-full sm:w-1/2 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">
                    Custom AI Serpent
                  </span>
                  <h3 className="text-base font-black text-slate-100 leading-tight">
                    {generatedSkin.name}
                  </h3>
                </div>
                {/* Color Swatches */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800">
                  <div
                    className="h-4 w-4 rounded-full border border-slate-700 shadow-sm"
                    style={{ backgroundColor: generatedSkin.primaryColor }}
                    title={`Primary: ${generatedSkin.primaryColor}`}
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-slate-700 shadow-sm"
                    style={{ backgroundColor: generatedSkin.secondaryColor }}
                    title={`Secondary: ${generatedSkin.secondaryColor}`}
                  />
                  <div
                    className="h-4 w-4 rounded-full border border-slate-700 shadow-sm"
                    style={{ backgroundColor: generatedSkin.glowColor }}
                    title={`Glow: ${generatedSkin.glowColor}`}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                {generatedSkin.description}
              </p>

              <div className="p-2.5 rounded-xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200 font-bold flex items-center gap-2 shadow-sm">
                <Cpu className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Combat Perk: {generatedSkin.statBonus}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Saves automatically to your skin collection and equips to your snake.
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (generatedSkin && !isGenerating) {
                  onSaveAndEquip(generatedSkin);
                  soundManager.playEquip();
                  onClose();
                }
              }}
              disabled={!generatedSkin || isGenerating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/25 transition active:scale-98 flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Save & Equip Custom AI Snake</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
