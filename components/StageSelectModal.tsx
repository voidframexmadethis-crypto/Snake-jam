'use client';

import React from 'react';
import { X, Lock, CheckCircle2, Skull, Compass } from 'lucide-react';
import { STAGES, StageDefinition } from '@/lib/gameTypes';

interface StageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStageId: number;
  onSelectStage: (stageId: number) => void;
}

export default function StageSelectModal({
  isOpen,
  onClose,
  currentStageId,
  onSelectStage,
}: StageSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Compass className="h-6 w-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-black text-slate-100">BATTLE ARENA STAGES</h2>
              <p className="text-xs text-slate-400">
                Slay the stage boss to unlock next arenas 100% free!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stages List */}
        <div className="py-4 space-y-3">
          {STAGES.map((stage) => {
            const isCurrent = currentStageId === stage.id;
            const isUnlocked = stage.unlocked;

            return (
              <div
                key={stage.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                  isCurrent
                    ? 'border-cyan-400 bg-slate-800/90 shadow-md shadow-cyan-500/10'
                    : isUnlocked
                    ? 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                    : 'border-slate-800 bg-slate-950/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-100 text-sm">
                      {stage.name}
                    </span>
                    {stage.cleared && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> CLEARED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{stage.subtitle}</p>

                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-red-400 font-bold">
                      <Skull className="h-3.5 w-3.5" /> Boss: {stage.bossName}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono">{stage.bossHp} HP</span>
                  </div>
                </div>

                <div>
                  {isUnlocked ? (
                    <button
                      onClick={() => onSelectStage(stage.id)}
                      disabled={isCurrent}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 cursor-default'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {isCurrent ? 'Current Arena' : 'Select Stage'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400 border border-slate-700">
                      <Lock className="h-3.5 w-3.5" />
                      Defeat Previous Boss
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
