'use client';

import React from 'react';
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
  Award,
  Trophy,
  Flame,
  PlayCircle,
  Gift,
  Compass,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Users,
  Wrench,
} from 'lucide-react';
import { 
  GameStats, 
  EVOLUTION_TIERS, 
  LeaderboardEntry, 
  STAGES,
  ARENA_TIERS,
  getRankByLifetimeCoins,
  TOTAL_ARENA_SNAKES
} from '@/lib/gameTypes';
import { KillFeedEntry } from '@/lib/threeGameEngine';
import { soundManager } from '@/lib/audio';

interface HUDProps {
  stats: GameStats;
  gameState: 'menu' | 'countdown' | 'playing' | 'gameover';
  countdownSec: number;
  onStartMatch: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenTycoon: () => void;
  onOpenSkins: () => void;
  onOpenSpin: () => void;
  onOpenMissions: () => void;
  onOpenStages: () => void;
  floatingTexts: { id: string; text: string; color: string; x: number; y: number; opacity: number }[];
  radarData?: {
    playerPos: { x: number; z: number };
    botPositions: { x: number; z: number }[];
    bossPos: { x: number; z: number } | null;
    powerups?: { x: number; z: number; type: 'magnet' | 'speed' | 'shield' | 'fire' }[];
    currentRadius: number;
    maxRadius: number;
  };
  leaderboardData?: LeaderboardEntry[];
  killFeedData?: KillFeedEntry[];
  hasClaimableMissions?: boolean;
  onTeleportBossHunter?: () => void;
  lastMatchResults?: { coins: number; gems: number; score: number } | null;
  onExitToMenu?: () => void;
}

export default function HUD({
  stats,
  gameState,
  countdownSec,
  onStartMatch,
  isPaused,
  onTogglePause,
  onOpenTycoon,
  onOpenSkins,
  onOpenSpin,
  onOpenMissions,
  onOpenStages,
  floatingTexts,
  radarData,
  leaderboardData = [],
  killFeedData = [],
  hasClaimableMissions = false,
  onTeleportBossHunter,
  lastMatchResults,
  onExitToMenu,
}: HUDProps) {
  const [muted, setMuted] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [leaderboardMinimized, setLeaderboardMinimized] = React.useState(false);

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

  // Format Match Timer
  const timeSecs = Math.ceil(stats.currentMatchTime);
  const minutes = Math.floor(timeSecs / 60);
  const seconds = timeSecs % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const isUrgent = timeSecs <= 20;

  const currentRank = getRankByLifetimeCoins(stats.totalPermanentCoins);

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* 1. MAIN MENU / START OVERLAY */}
      {gameState === 'menu' && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-between p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          {/* Header Bar */}
          <div className="flex w-full max-w-2xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col rounded-2xl border-2 border-amber-400 bg-slate-900 px-4 py-1 text-amber-300 shadow-lg">
                <span className="text-[8px] font-black uppercase text-amber-500/80 -mb-1">Lifetime Coins</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="text-base font-black">{stats.totalPermanentCoins.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-col rounded-2xl border-2 border-cyan-400 bg-slate-900 px-4 py-1 text-cyan-300 shadow-lg">
                <span className="text-[8px] font-black uppercase text-cyan-500/80 -mb-1">Total Diamonds</span>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span className="text-base font-black">{stats.totalGems.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-col rounded-2xl border-2 border-slate-700 bg-slate-900 px-4 py-1 text-slate-300 shadow-lg">
                <span className="text-[8px] font-black uppercase text-slate-500/80 -mb-1">Arena Tier</span>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" style={{ color: currentRank.color }} />
                  <span className="text-base font-black" style={{ color: currentRank.color }}>{currentRank.name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                className="p-2.5 rounded-2xl border-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition"
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Title Banner & Action */}
          <div className="flex flex-col items-center text-center max-w-md my-auto">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-4 py-1 text-xs font-black text-cyan-300">
              <Crown className="h-4 w-4 text-amber-400" />
              <span>12,000,000 AI SNAKE PLAYERS ARENA</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 drop-shadow-lg tracking-wide uppercase">
              SNAKE TYCOON
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-sm font-medium">
              Battle across a massive 12,000,000 AI snake player realm! Compete with rivals wearing custom mythical skins, vacuum pellets & venture outside the arena walls to defeat the Giant Boss!
            </p>

            {/* Last Match Results Recap */}
            {lastMatchResults && (
              <div className="mt-4 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/20 backdrop-blur-sm animate-in zoom-in duration-300">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" /> LAST MATCH RESULTS
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-amber-300 font-black">
                      <Coins className="h-4 w-4" /> +{lastMatchResults.coins}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">COINS</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-700/50" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-black">
                      <Sparkles className="h-4 w-4" /> +{lastMatchResults.gems}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">GEMS</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chunky Green Play Button */}
            <button
              onClick={onStartMatch}
              className="mt-6 flex items-center justify-center gap-3 w-full rounded-3xl bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 py-4 text-lg font-black text-slate-950 shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all border-2 border-emerald-300 animate-pulse"
            >
              <PlayCircle className="h-7 w-7 text-slate-950" />
              <span>SLITHER INTO ARENA</span>
            </button>
          </div>

          {/* Quick Hub Buttons */}
          <div className="flex items-center justify-start gap-2.5 max-w-xl w-full overflow-x-auto pb-4 px-2">
            <button
              onClick={onOpenSkins}
              className="group relative flex items-center gap-2 rounded-2xl border-2 border-cyan-400 bg-slate-900/95 px-5 py-3 text-sm font-black text-cyan-300 hover:bg-cyan-900/40 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95"
            >
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-30 blur group-hover:opacity-60 transition duration-300" />
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
              <span className="relative">100,000+ SKIN SHOP</span>
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full border border-slate-950 font-bold">NEW</div>
            </button>

            <button
              onClick={onOpenMissions}
              className="relative flex items-center gap-2 rounded-2xl border-2 border-amber-400/80 bg-slate-900/95 px-4 py-2.5 text-xs font-black text-amber-300 hover:bg-slate-800 transition shadow-lg"
            >
              <Award className="h-4 w-4 text-amber-400" />
              <span>Quests & Badges</span>
              {hasClaimableMissions && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-slate-950 animate-ping" />
              )}
            </button>

            <button
              onClick={onOpenTycoon}
              className="flex items-center gap-2 rounded-2xl border-2 border-emerald-400/80 bg-slate-900/95 px-4 py-2.5 text-xs font-black text-emerald-300 hover:bg-slate-800 transition shadow-lg"
            >
              <Coins className="h-4 w-4 text-emerald-400" />
              <span>Tycoon Shop</span>
            </button>

            <button
              onClick={onOpenStages}
              className="flex items-center gap-2 rounded-2xl border-2 border-purple-400/80 bg-slate-900/95 px-4 py-2.5 text-xs font-black text-purple-300 hover:bg-slate-800 transition shadow-lg"
            >
              <Compass className="h-4 w-4 text-purple-400" />
              <span>Stages</span>
            </button>

            <button
              onClick={onOpenSpin}
              className="flex items-center gap-2 rounded-2xl border-2 border-pink-400/80 bg-gradient-to-r from-pink-950/80 to-purple-950/80 px-4 py-2.5 text-xs font-black text-pink-300 hover:bg-slate-800 transition shadow-lg"
            >
              <Gift className="h-4 w-4 text-pink-400" />
              <span>Free Spin</span>
            </button>

            <button
              onClick={() => (window as any)._openMultiplayerModal?.()}
              className="flex items-center gap-2 rounded-2xl border-2 border-blue-400/90 bg-gradient-to-r from-blue-950/90 to-indigo-950/90 px-4 py-2.5 text-xs font-black text-blue-300 hover:scale-105 transition shadow-lg animate-pulse"
            >
              <Users className="h-4 w-4 text-blue-400" />
              <span>Multiplayer</span>
            </button>

            <button
              onClick={() => (window as any)._openModsModal?.()}
              className="flex items-center gap-2 rounded-2xl border-2 border-purple-400/90 bg-gradient-to-r from-purple-950/90 to-fuchsia-950/90 px-4 py-2.5 text-xs font-black text-purple-300 hover:scale-105 transition shadow-lg"
            >
              <Wrench className="h-4 w-4 text-purple-400" />
              <span>Mod Studio</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. THREE-SECOND COUNTDOWN OVERLAY */}
      {gameState === 'countdown' && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-cyan-400 bg-slate-900/90 shadow-2xl shadow-cyan-500/40 animate-ping">
              <span className="text-6xl font-black text-cyan-300 font-mono">
                {countdownSec > 0 ? countdownSec : 'GO!'}
              </span>
            </div>
            <span className="mt-6 text-sm font-black text-slate-200 tracking-widest uppercase">
              GET READY TO SLITHER!
            </span>
          </div>
        </div>
      )}

      {/* 3. MINIMALIST HUD-ONLY SCREEN (DURING PLAYING STATE) */}
      {(gameState === 'playing' || gameState === 'gameover') && (
        <>
          {/* TIPPY-TOP RIGHT: Minimizable Leaderboard & Arena Radar Widget */}
          <div className="pointer-events-auto absolute top-2 right-2 z-40 flex flex-col items-end gap-1.5">
            {leaderboardData.length > 0 && (
              <div className="w-56 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] font-black tracking-wider text-slate-200 uppercase">
                      LEADERBOARD (12M)
                    </span>
                  </div>
                  <button
                    onClick={() => setLeaderboardMinimized(!leaderboardMinimized)}
                    className="p-0.5 rounded text-slate-400 hover:text-white transition"
                    title={leaderboardMinimized ? 'Expand' : 'Minimize'}
                  >
                    {leaderboardMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!leaderboardMinimized && (
                  <div className="space-y-1 text-[11px]">
                    {leaderboardData.map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center justify-between px-2 py-0.5 rounded-lg ${
                          entry.isPlayer
                            ? 'bg-emerald-950/80 font-extrabold border border-emerald-500/40 text-emerald-300 shadow'
                            : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[145px]">
                          <span
                            className={`text-[10px] font-mono font-black shrink-0 ${
                              entry.rank === 1
                                ? 'text-amber-400'
                                : entry.rank === 2
                                ? 'text-slate-300'
                                : entry.rank === 3
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            }`}
                          >
                            #{entry.rank > 9999 ? `${(entry.rank / 1000000).toFixed(1)}M` : entry.rank}
                          </span>
                          <span className="truncate flex items-center gap-1">
                            {entry.customSkinBadge && (
                              <span className="text-[8px] font-black px-1 py-0.2 rounded bg-purple-950/90 text-purple-300 border border-purple-500/50 shrink-0">
                                {entry.customSkinBadge}
                              </span>
                            )}
                            <span className="truncate">{entry.name}</span>
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0 ml-1">
                          {entry.length}m
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Arena Minimap Radar with Specific Power-up Icons */}
            {radarData && (
              <div className="w-40 rounded-2xl border border-cyan-500/50 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col items-center">
                <div className="flex items-center justify-between w-full border-b border-slate-800 pb-1 mb-1.5">
                  <span className="text-[10px] font-black tracking-wider text-cyan-400 uppercase">
                    ARENA RADAR
                  </span>
                </div>
                {/* Minimap Circular Radar */}
                <div className="relative w-32 h-32 rounded-full border-2 border-cyan-500/40 bg-slate-950/90 overflow-hidden shadow-inner flex items-center justify-center">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 border border-cyan-500/20 rounded-full" />
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/20" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500/20" />

                  {/* Player Dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping z-20" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-300 z-20" />

                  {/* Bot Dots */}
                  {radarData.botPositions.map((b, idx) => {
                    const nx = 50 + ((b.x - radarData.playerPos.x) / radarData.maxRadius) * 45;
                    const nz = 50 + ((b.z - radarData.playerPos.z) / radarData.maxRadius) * 45;
                    if (nx < 0 || nx > 100 || nz < 0 || nz > 100) return null;
                    return (
                      <div
                        key={idx}
                        className="absolute w-1.5 h-1.5 rounded-full bg-red-500 z-10"
                        style={{ left: `${nx}%`, top: `${nz}%` }}
                      />
                    );
                  })}

                  {/* Boss Dot */}
                  {radarData.bossPos && (() => {
                    const nx = 50 + ((radarData.bossPos.x - radarData.playerPos.x) / radarData.maxRadius) * 45;
                    const nz = 50 + ((radarData.bossPos.z - radarData.playerPos.z) / radarData.maxRadius) * 45;
                    if (nx < 0 || nx > 100 || nz < 0 || nz > 100) return null;
                    return (
                      <div
                        key="boss"
                        className="absolute w-3 h-3 rounded-full bg-amber-400 animate-bounce z-25 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                        style={{ left: `${nx}%`, top: `${nz}%` }}
                        title="Perimeter Boss"
                      />
                    );
                  })()}

                  {/* Power-up Icons on Minimap */}
                  {radarData.powerups?.map((p, idx) => {
                    const nx = 50 + ((p.x - radarData.playerPos.x) / radarData.maxRadius) * 45;
                    const nz = 50 + ((p.z - radarData.playerPos.z) / radarData.maxRadius) * 45;
                    if (nx < 0 || nx > 100 || nz < 0 || nz > 100) return null;
                    let symbol = '⚡';
                    if (p.type === 'magnet') symbol = '🧲';
                    else if (p.type === 'speed') symbol = '⚡';
                    else if (p.type === 'shield') symbol = '🛡️';
                    else if (p.type === 'fire') symbol = '🔥';

                    return (
                      <div
                        key={idx}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-black z-30 animate-pulse drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                        style={{ left: `${nx}%`, top: `${nz}%` }}
                        title={`${p.type.toUpperCase()} Power-up`}
                      >
                        {symbol}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between w-full mt-1.5 text-[8px] font-bold text-slate-400 px-1">
                  <span>🧲 Mag</span>
                  <span>⚡ Spd</span>
                  <span>🛡️ Shd</span>
                  <span>🔥 Fir</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Header Bar */}
          <div className="pointer-events-auto flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent">
            {/* Left: Player Level & Evolution */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border-2 border-cyan-400 bg-slate-900 shadow-lg shadow-cyan-500/20">
                <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 drop-shadow-md" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black tracking-wider text-cyan-400 drop-shadow-sm">
                    LVL {stats.level}
                  </span>
                  <span className="hidden sm:inline-block text-xs font-bold text-slate-200">
                    {currentTier.title}
                  </span>
                </div>
                {/* EXP Bar */}
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-2.5 w-24 sm:w-36 rounded-full bg-slate-950 p-0.5 border border-slate-700/80 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-green-400 transition-all duration-300"
                      style={{ width: `${expPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{expPercent}%</span>
                </div>
              </div>
            </div>

            {/* Center: Match Countdown & Stage Name */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full border-2 shadow-xl ${
                  isUrgent
                    ? 'border-red-500 bg-red-950/90 text-red-300 animate-bounce'
                    : 'border-slate-700 bg-slate-900/90 text-slate-100'
                }`}
              >
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  ARENA
                </span>
                <span className="text-base sm:text-lg font-black tracking-widest font-mono">
                  {timeFormatted}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400">
                  {(TOTAL_ARENA_SNAKES - stats.botsKilled).toLocaleString()} AI Snakes Active
                </span>
              </div>
            </div>

            {/* Right: Sound & Pause Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 mr-44 sm:mr-52">
              {onExitToMenu && (
                <button
                  onClick={onExitToMenu}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 border-slate-700 bg-slate-900/95 text-slate-200 hover:bg-slate-800 hover:text-cyan-400 transition-colors shadow-sm text-xs font-black"
                  title="Back to Main Menu"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
              )}

              <button
                onClick={toggleSound}
                className="p-2 rounded-2xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:bg-slate-800 transition-colors shadow-sm"
                title="Toggle Audio"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                onClick={onTogglePause}
                className="p-2 rounded-2xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:bg-slate-800 transition-colors shadow-sm"
                title="Pause Match"
              >
                {isPaused ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 rounded-2xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:bg-slate-800 transition-colors shadow-sm"
                title="Controls & Mechanics"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Top Center: Stage Progress Bar OR Stage Boss Health Bar */}
          {!stats.bossAlive ? (
            <div className="pointer-events-auto mx-auto max-w-md w-full px-4 mt-1">
              <div className="rounded-2xl border border-cyan-500/50 bg-slate-950/90 p-2 shadow-2xl shadow-cyan-500/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-1 text-[11px] font-black">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <Compass className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
                    <span>STAGE {stats.currentStageId} PROGRESS</span>
                  </div>
                  <span className="text-cyan-300 font-mono">
                    {Math.min(100, Math.round(stats.stageProgress || 0))}% TO BOSS OUTSIDE
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-900 p-0.5 border border-slate-700 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-amber-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, stats.stageProgress || 0))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto mx-auto max-w-md w-full px-4 mt-1 flex flex-col gap-1.5">
              <div className="rounded-2xl border-2 border-red-500/90 bg-slate-950/95 p-2.5 shadow-2xl shadow-red-500/30 backdrop-blur-md animate-pulse">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Skull className="h-4 w-4 text-red-500 animate-bounce" />
                    <span className="text-xs font-black tracking-wider text-red-400 uppercase">
                      OUTSIDE BOSS: {STAGES.find((s) => s.id === stats.currentStageId)?.bossName || 'VIPER TITAN'}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                      stats.bossPhase === 2 ? 'bg-red-600 text-white animate-ping' : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {stats.bossPhase === 2 ? 'PHASE 2: ENRAGED' : 'PHASE 1'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-300">
                    {Math.max(0, stats.bossHp)} / {stats.bossMaxHp} HP
                  </span>
                </div>
                <div className="h-3.5 w-full rounded-full bg-slate-950 p-0.5 border border-red-900 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-200"
                    style={{
                      width: `${Math.max(0, Math.min(100, (stats.bossHp / stats.bossMaxHp) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Instant Teleport Outside Button (PlayerBossHunter) */}
              {onTeleportBossHunter && (
                <button
                  onClick={onTeleportBossHunter}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-cyan-400 bg-gradient-to-r from-cyan-950 via-blue-950 to-purple-950 py-2 text-xs font-black text-cyan-300 shadow-lg shadow-cyan-500/30 hover:brightness-125 active:scale-98 transition animate-bounce"
                >
                  <Zap className="h-4 w-4 text-cyan-400 fill-cyan-400" />
                  <span>⚡ TELEPORT OUTSIDE PERIMETER TO HUNT BOSS (11m MARK)</span>
                </button>
              )}
            </div>
          )}

          {/* In-Match Stats Ribbon (Tail Length & Live Arena Pool) */}
          <div className="pointer-events-auto absolute top-16 left-3 sm:left-6 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 rounded-full border-2 border-emerald-400 bg-emerald-950/85 px-4 py-1.5 text-sm font-black text-white shadow-lg">
              <span className="text-emerald-200">Length:</span>
              <span className="font-extrabold text-white">{stats.currentLength}m</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-slate-950/85 px-3 py-1 text-[11px] font-bold text-cyan-300 shadow">
              <span className="text-slate-400">Arena Alive:</span>
              <span className="font-mono font-black text-cyan-400">{(TOTAL_ARENA_SNAKES - stats.botsKilled).toLocaleString()}</span>
            </div>
          </div>

          {/* Right HUD Column: Scrolling Kill Feed & Power-up Badges */}
          <div className="pointer-events-auto absolute top-36 right-3 sm:right-6 flex flex-col items-end gap-2">
            {/* Top-Right Live Kill/Elimination Feed */}
            {killFeedData.length > 0 && (
              <div className="w-52 space-y-1 pointer-events-none mt-1">
                {killFeedData.map((feed) => (
                  <div
                    key={feed.id}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-slate-950/90 px-2.5 py-1 text-[10px] font-bold text-slate-200 shadow-md backdrop-blur-sm animate-in slide-in-from-right duration-200"
                  >
                    <Flame className="h-3 w-3 text-red-400 shrink-0" />
                    <span className="truncate">{feed.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Active Floor Power-up Badges */}
            {stats.activePowerUps.magnet > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-blue-500/50 bg-blue-950/90 px-3 py-1 text-xs font-black text-blue-300 shadow">
                <Magnet className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                <span>MAGNET {Math.ceil(stats.activePowerUps.magnet)}s</span>
              </div>
            )}

            {stats.activePowerUps.speed > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/90 px-3 py-1 text-xs font-black text-cyan-300 shadow">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span>SPEED {Math.ceil(stats.activePowerUps.speed)}s</span>
              </div>
            )}

            {stats.activePowerUps.shield > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-950/90 px-3 py-1 text-xs font-black text-amber-300 shadow">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span>SHIELD {Math.ceil(stats.activePowerUps.shield)}s</span>
              </div>
            )}
            {stats.activePowerUps.fire > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/90 px-3 py-1 text-xs font-black text-red-300 shadow">
                <Flame className="h-3.5 w-3.5 text-red-400" />
                <span>FIRE {Math.ceil(stats.activePowerUps.fire)}s</span>
              </div>
            )}
          </div>
        </>
      )}

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
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-200">
            <h3 className="text-lg font-black text-cyan-400 mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5" /> How to Play & Win
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <p>
                🎮 <strong>Movement:</strong> Use <strong>WASD / Arrow Keys</strong> or the on-screen Joystick. Hold <strong>Spacebar</strong> to boost speed.
              </p>
              <p>
                🟡 <strong>Collection:</strong> Eat millions of pellets spread across the massive arena to gain length and EXP!
              </p>
              <p>
                🚪 <strong>Evolution Gates:</strong> Pass through gates (+10, x2) to rapidly multiply your tail size.
              </p>
              <p>
                ⚔️ <strong>Outside Boss Combat:</strong> When stage progress reaches 100%, venture <strong>outside the arena walls</strong> to confront and defeat the Giant Boss circling the perimeter!
              </p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full rounded-2xl bg-cyan-400 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 transition shadow-lg shadow-cyan-400/20"
            >
              Got It, Let&apos;s Battle!
            </button>
          </div>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {gameState === 'playing' && isPaused && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="max-w-xs w-full rounded-3xl border-2 border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <h3 className="text-xl font-black text-slate-100 mb-1">ARENA PAUSED</h3>
            <p className="text-xs text-slate-400 mb-5">Your coins and diamonds are safe and recorded.</p>
            <div className="space-y-3">
              <button
                onClick={onTogglePause}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
              >
                <Play className="h-4 w-4" />
                <span>RESUME MATCH</span>
              </button>
              {onExitToMenu && (
                <button
                  onClick={onExitToMenu}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-700 bg-slate-800/90 py-3 text-sm font-black text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-md"
                >
                  <RotateCcw className="h-4 w-4 text-cyan-400" />
                  <span>BACK TO MAIN MENU</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
