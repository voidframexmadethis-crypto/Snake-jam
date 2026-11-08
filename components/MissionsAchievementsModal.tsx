'use client';

import React, { useState } from 'react';
import {
  X,
  Target,
  Award,
  CheckCircle2,
  Coins,
  Sparkles,
  Zap,
  Skull,
  Crown,
  Flame,
  Compass,
} from 'lucide-react';
import { Mission, Achievement } from '@/lib/gameTypes';
import { soundManager } from '@/lib/audio';

interface MissionsAchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: Mission[];
  achievements: Achievement[];
  onClaimMission: (id: string) => void;
  onClaimAchievement: (id: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Skull,
  Sparkles,
  Coins,
  Crown,
  Award,
  Zap,
  Compass,
  Flame,
  Target,
};

export default function MissionsAchievementsModal({
  isOpen,
  onClose,
  missions,
  achievements,
  onClaimMission,
  onClaimAchievement,
}: MissionsAchievementsModalProps) {
  const [activeTab, setActiveTab] = useState<'missions' | 'achievements'>('missions');

  if (!isOpen) return null;

  const handleClaimM = (id: string) => {
    soundManager.playCashOut();
    onClaimMission(id);
  };

  const handleClaimA = (id: string) => {
    soundManager.playSpinWin();
    onClaimAchievement(id);
  };

  const pendingMissionsCount = missions.filter((m) => m.completed && !m.claimed).length;
  const pendingAchievementsCount = achievements.filter((a) => a.unlocked && !a.claimed).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200 font-sans cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-slate-900/95 p-4 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/20">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-amber-400 tracking-wide uppercase">
                Missions & Milestones
              </h2>
              <p className="text-xs text-slate-400">
                Complete daily quests & career achievements for massive coin & gem rewards!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex gap-2 my-4 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === 'missions'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="h-4 w-4" />
            <span>Daily & Weekly Quests</span>
            {pendingMissionsCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                {pendingMissionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === 'achievements'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Career Achievements</span>
            {pendingAchievementsCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                {pendingAchievementsCount}
              </span>
            )}
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activeTab === 'missions' ? (
            missions.map((m) => {
              const IconComp = ICON_MAP[m.icon] || Target;
              const percent = Math.min(100, Math.round((m.current / m.target) * 100));
              return (
                <div
                  key={m.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    m.claimed
                      ? 'border-slate-800 bg-slate-950/40 opacity-60'
                      : m.completed
                      ? 'border-amber-500/50 bg-amber-950/20 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start gap-3 w-full sm:w-auto">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 mt-0.5">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-100">
                          {m.title}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                            m.type === 'daily'
                              ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                              : 'bg-purple-950 text-purple-400 border border-purple-800/50'
                          }`}
                        >
                          {m.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>

                      {/* Progress Bar */}
                      <div className="mt-2.5 flex items-center gap-2 max-w-xs">
                        <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {m.current} / {m.target}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reward / Action Button */}
                  <div className="mt-3 sm:mt-0 flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-extrabold text-xs">
                      {m.rewardType === 'coins' && <Coins className="h-4 w-4 text-amber-400" />}
                      {m.rewardType === 'gems' && <Sparkles className="h-4 w-4 text-pink-400" />}
                      {m.rewardType === 'exp' && <Zap className="h-4 w-4 text-cyan-400" />}
                      <span>
                        +{m.rewardAmount} {m.rewardType.toUpperCase()}
                      </span>
                    </div>

                    {m.claimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50">
                        <CheckCircle2 className="h-4 w-4" /> Claimed
                      </span>
                    ) : m.completed ? (
                      <button
                        onClick={() => handleClaimM(m.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-orange-400 transition shadow-md shadow-amber-500/20 animate-pulse"
                      >
                        CLAIM!
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold px-3 py-1.5">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            achievements.map((a) => {
              const IconComp = ICON_MAP[a.icon] || Award;
              const percent = Math.min(100, Math.round((a.current / a.target) * 100));

              const tierColors = {
                bronze: 'border-amber-700/40 text-amber-500',
                silver: 'border-slate-400/40 text-slate-300',
                gold: 'border-amber-400/50 text-amber-300',
                diamond: 'border-cyan-400/50 text-cyan-300',
              };

              return (
                <div
                  key={a.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    a.claimed
                      ? 'border-slate-800 bg-slate-950/40 opacity-60'
                      : a.unlocked
                      ? 'border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start gap-3 w-full sm:w-auto">
                    <div
                      className={`p-2.5 rounded-xl bg-slate-900 border ${tierColors[a.tier]} mt-0.5`}
                    >
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-100">
                          {a.title}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase border ${tierColors[a.tier]}`}
                        >
                          {a.tier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{a.description}</p>

                      <div className="mt-2.5 flex items-center gap-2 max-w-xs">
                        <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {a.current} / {a.target}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-extrabold">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5" /> +{a.rewardCoins}
                      </span>
                      <span className="text-pink-400 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" /> +{a.rewardGems}
                      </span>
                    </div>

                    {a.claimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-900/50">
                        <CheckCircle2 className="h-4 w-4" /> Claimed
                      </span>
                    ) : a.unlocked ? (
                      <button
                        onClick={() => handleClaimA(a.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs hover:from-cyan-400 hover:to-blue-400 transition shadow-md shadow-cyan-500/20 animate-pulse"
                      >
                        CLAIM!
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold px-3 py-1.5">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
