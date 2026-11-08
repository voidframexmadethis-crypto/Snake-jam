'use client';

import React from 'react';
import {
  Trophy,
  Skull,
  Coins,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { GameStats, STAGES, TOTAL_ARENA_SNAKES } from '@/lib/gameTypes';

interface GameOverModalProps {
  isOpen: boolean;
  isVictory: boolean;
  stats: GameStats;
  onPlayAgain: () => void;
  onOpenTycoon: () => void;
  onOpenSpin: () => void;
  onBackToMenu: () => void;
  onNextStage?: () => void;
}

export default function GameOverModal({
  isOpen,
  isVictory,
  stats,
  onPlayAgain,
  onOpenTycoon,
  onOpenSpin,
  onBackToMenu,
  onNextStage,
}: GameOverModalProps) {
  if (!isOpen) return null;

  const currentStage = STAGES.find((s) => s.id === stats.currentStageId) || STAGES[0];
  const hasNextStage = STAGES.some((s) => s.id === stats.currentStageId + 1);
  const arenaRank = Math.max(
    1,
    Math.min(
      TOTAL_ARENA_SNAKES,
      TOTAL_ARENA_SNAKES -
        (stats.score * 85 + stats.botsKilled * 350000 + Math.round(stats.currentLength * 1500))
    )
  );

  return (
    <div
      onClick={onPlayAgain}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl cursor-default"
      >
        {/* Banner Icon */}
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border shadow-xl">
          {isVictory ? (
            <div className="h-full w-full rounded-3xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-amber-400" />
            </div>
          ) : (
            <div className="h-full w-full rounded-3xl bg-red-950/80 border border-red-500/40 flex items-center justify-center">
              <Skull className="h-8 w-8 text-red-400" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black tracking-wide text-slate-100">
          {isVictory ? 'STAGE TRIUMPH!' : 'ROUND CONCLUDED'}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {isVictory
            ? `${currentStage.bossName} was vanquished! Next arena unlocked!`
            : 'Your snake fought hard in the 12,000,000 player battle royale arena.'}
        </p>

        {/* Stats Grid */}
        <div className="my-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-left col-span-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Final Match Score
              </span>
              <div className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {stats.score.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                Global Standing
              </span>
              <div className="text-base font-black text-cyan-300 font-mono">
                #{arenaRank.toLocaleString()}
              </div>
              <span className="text-[9px] text-slate-500">out of 12,000,000</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3 text-left">
            <span className="text-[10px] font-bold text-amber-400/80 uppercase">
              Coins (This Round)
            </span>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1">
              <Coins className="h-4 w-4" /> +{stats.cashEarnedThisMatch.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Lifetime Total
            </span>
            <div className="text-lg font-black text-slate-300">
              {stats.totalPermanentCoins.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-left">
            <span className="text-[10px] font-bold text-cyan-400/80 uppercase">
              Diamonds (This Round)
            </span>
            <div className="text-lg font-black text-cyan-400 flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> +{stats.gemsEarnedThisMatch.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              Total Diamonds
            </span>
            <div className="text-lg font-black text-slate-300">
              {stats.totalGems.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Stage Advance announcement if cleared */}
        {isVictory && hasNextStage && onNextStage && (
          <button
            onClick={onNextStage}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-black text-slate-100 shadow-lg shadow-purple-500/20 hover:opacity-95 transition"
          >
            <Crown className="h-4 w-4 text-amber-300" />
            <span>ADVANCE TO NEXT STAGE</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onPlayAgain}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 py-4 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all border-2 border-emerald-300"
          >
            <RotateCcw className="h-5 w-5" />
            <span>REVIVE & RESTART ARENA</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenTycoon}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>Spend Coins</span>
            </button>

            <button
              onClick={onOpenSpin}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-950/40 py-2.5 text-xs font-bold text-pink-300 hover:bg-pink-900/40 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>Free Spin</span>
            </button>
          </div>

          <button
            onClick={onBackToMenu}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-700 bg-slate-800/90 py-3 text-sm font-black text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-md mt-2"
          >
            <RotateCcw className="h-4 w-4 text-cyan-400" />
            <span>BACK TO MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
}
