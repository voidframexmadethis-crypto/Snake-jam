'use client';

import React, { useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Zap,
  Shield,
  Magnet,
  Coins,
  Crown,
  Sparkles,
  HelpCircle,
  Skull,
} from 'lucide-react';
import { GameStats, EVOLUTION_TIERS } from '@/lib/gameTypes';
import { soundManager } from '@/lib/audio';

interface HUDProps {
  stats: GameStats;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenTycoon: () => void;
  onOpenSkins: () => void;
  onOpenSpin: () => void;
  floatingTexts: { id: string; text: string; color: string; x: number; y: number; opacity: number }[];
  radarData?: {
    playerPos: { x: number; z: number };
    botPositions: { x: number; z: number }[];
    bossPos: { x: number; z: number } | null;
    currentRadius: number;
    maxRadius: number;
  };
}

export default function HUD({
  stats,
  isPaused,
  onTogglePause,
  onOpenTycoon,
  onOpenSkins,
  onOpenSpin,
  floatingTexts,
  radarData,
}: HUDProps) {
  const [muted, setMuted] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    soundManager.setSoundEnabled(!next);
    soundManager.setMusicEnabled(!next);
  };

  // Evolution Tier calculation
  const currentTier =
    [...EVOLUTION_TIERS].reverse().find((t) => stats.level >= t.minLevel) ||
    EVOLUTION_TIERS[0];

  const expPercent = Math.min(100, Math.round((stats.exp / stats.expForNextLevel) * 100));

  // Render Mini-Radar
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas || !radarData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 110;
    const center = size / 2;
    const scale = (size * 0.42) / (radarData.maxRadius || 90);

    ctx.clearRect(0, 0, size, size);

    // Radar background disc
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shrinking Battle Royale Safe Zone
    const currentSafeR = (radarData.currentRadius || 90) * scale;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, currentSafeR, 0, Math.PI * 2);
    ctx.stroke();

    // Center Drop-off base zone
    ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
    ctx.beginPath();
    ctx.arc(center, center, 7.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Bots
    ctx.fillStyle = '#f97316';
    radarData.botPositions.forEach((b) => {
      const bx = center + b.x * scale;
      const by = center + b.z * scale;
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Boss
    if (radarData.bossPos) {
      const bossX = center + radarData.bossPos.x * scale;
      const bossY = center + radarData.bossPos.z * scale;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bossX, bossY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Player (Green)
    const px = center + radarData.playerPos.x * scale;
    const py = center + radarData.playerPos.z * scale;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [radarData]);

  // Format Match Timer
  const timeSecs = Math.ceil(stats.currentMatchTime);
  const minutes = Math.floor(timeSecs / 60);
  const seconds = timeSecs % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const isUrgent = timeSecs <= 20;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="pointer-events-auto flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent">
        {/* Left: Player Level & Evolution */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-slate-900/90 shadow-lg shadow-cyan-500/10">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wider text-cyan-400">
                LVL {stats.level}
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-200">
                {currentTier.title}
              </span>
            </div>
            {/* EXP Bar */}
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-2 w-24 sm:w-36 rounded-full bg-slate-800/80 p-0.5 border border-slate-700/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">{expPercent}%</span>
            </div>
          </div>
        </div>

        {/* Center: Match Countdown & Stage Name */}
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-lg ${
              isUrgent
                ? 'border-red-500 bg-red-950/90 text-red-300 animate-bounce'
                : 'border-slate-700 bg-slate-900/90 text-slate-100'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              ARENA
            </span>
            <span className="text-base sm:text-lg font-black tracking-widest font-mono">
              {timeFormatted}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-slate-400 mt-0.5">
            Zone Shrinking: {Math.round(radarData?.currentRadius || 90)}m
          </span>
        </div>

        {/* Right: Currency & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Permanent Coins */}
          <button
            onClick={onOpenTycoon}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-amber-500/40 bg-slate-900/90 text-amber-300 hover:border-amber-400 transition-colors shadow-sm"
            title="Open Tycoon Upgrades"
          >
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-extrabold">{stats.totalPermanentCoins}</span>
          </button>

          {/* Sound Mute */}
          <button
            onClick={toggleSound}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Toggle Audio"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Pause */}
          <button
            onClick={onTogglePause}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Pause Match"
          >
            {isPaused ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4" />}
          </button>

          {/* Help Tooltip */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 transition-colors"
            title="Controls & Mechanics"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stage Boss Health Bar (when alive) */}
      {stats.bossAlive && (
        <div className="pointer-events-auto mx-auto max-w-md px-4 mt-1">
          <div className="rounded-xl border border-red-500/50 bg-slate-950/90 p-2.5 shadow-xl shadow-red-500/20 backdrop-blur-md">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Skull className="h-4 w-4 text-red-500 animate-pulse" />
                <span className="text-xs font-black tracking-wider text-red-400 uppercase">
                  STAGE BOSS: GIGA TITAN VIPER
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-red-300">
                {Math.max(0, stats.bossHp)} / {stats.bossMaxHp} HP
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-900 p-0.5 border border-red-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-200"
                style={{
                  width: `${Math.max(0, Math.min(100, (stats.bossHp / stats.bossMaxHp) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* In-Match Stats Ribbon (Tail Length, Score, Banked Cash) */}
      <div className="pointer-events-auto absolute top-16 left-3 sm:left-6 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 shadow">
          <span className="text-slate-400 font-semibold">Length:</span>
          <span className="font-bold text-emerald-400">{stats.currentLength}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 shadow">
          <span className="text-slate-400 font-semibold">Match Score:</span>
          <span className="font-bold text-cyan-400">{stats.score}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 shadow">
          <span className="text-slate-400 font-semibold">Banked:</span>
          <span className="font-bold text-amber-400">+${stats.cashEarnedThisMatch}</span>
        </div>
      </div>

      {/* Active Power-up Badges */}
      <div className="pointer-events-auto absolute top-16 right-3 sm:right-6 flex flex-col items-end gap-2">
        {/* Radar Mini-Map */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-1 shadow-md">
          <canvas
            ref={radarCanvasRef}
            width={110}
            height={110}
            className="rounded-lg block"
          />
        </div>

        {/* Magnet Badge */}
        {stats.activePowerUps.magnet > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-950/80 px-2.5 py-1 text-xs font-bold text-blue-300 shadow">
            <Magnet className="h-3.5 w-3.5 text-blue-400 animate-spin" />
            <span>MAGNET {Math.ceil(stats.activePowerUps.magnet)}s</span>
          </div>
        )}

        {/* Speed Badge */}
        {stats.activePowerUps.speed > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/80 px-2.5 py-1 text-xs font-bold text-cyan-300 shadow">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>SPEED {Math.ceil(stats.activePowerUps.speed)}s</span>
          </div>
        )}

        {/* Shield Badge */}
        {stats.activePowerUps.shield > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/80 px-2.5 py-1 text-xs font-bold text-amber-300 shadow">
            <Shield className="h-3.5 w-3.5 text-amber-400" />
            <span>SHIELD {Math.ceil(stats.activePowerUps.shield)}s</span>
          </div>
        )}
      </div>

      {/* Floating Combat Feedback Texts */}
      {floatingTexts.map((f) => (
        <div
          key={f.id}
          className="pointer-events-none absolute transform -translate-x-1/2 -translate-y-1/2 font-black text-sm sm:text-base transition-opacity duration-300 drop-shadow-md"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            opacity: f.opacity,
          }}
        >
          {f.text}
        </div>
      ))}

      {/* Controls & Mechanics Help Overlay */}
      {showHelp && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-200">
            <h3 className="text-lg font-black text-cyan-400 mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5" /> How to Play & Win
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <p>
                🎮 <strong>Movement:</strong> Use <strong>WASD / Arrow Keys</strong> or the on-screen Joystick. Hold <strong>Spacebar</strong> to boost speed.
              </p>
              <p>
                🟡 <strong>Collection:</strong> Eat pellets to gain length and EXP to level up your snake tier dynamically!
              </p>
              <p>
                🚪 <strong>Evolution Gates:</strong> Pass through gates (+10, x2) to rapidly multiply your tail size.
              </p>
              <p>
                💰 <strong>Drop-Off Base:</strong> Drive to the center circle to cash in your tail for permanent coins!
              </p>
              <p>
                ⚔️ <strong>Combat:</strong> Smash your head into smaller snakes to destroy them. Avoid hitting opponent bodies unless you have an invincibility shield!
              </p>
              <p>
                👑 <strong>Boss & Stages:</strong> A giant Boss snake arrives at 0:40. Slay it to clear the stage and unlock the next arena!
              </p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition"
            >
              Got It, Let&apos;s Battle!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
