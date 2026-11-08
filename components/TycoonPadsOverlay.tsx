'use client';

import React from 'react';
import { X, Zap, Flame, DollarSign, Magnet, Coins, ArrowUpRight } from 'lucide-react';
import { GameStats, UPGRADE_CONFIG, getUpgradeCost, PlayerUpgrades } from '@/lib/gameTypes';

interface TycoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  onUpgrade: (type: keyof PlayerUpgrades) => void;
}

export default function TycoonModal({
  isOpen,
  onClose,
  stats,
  onUpgrade,
}: TycoonModalProps) {
  if (!isOpen) return null;

  const upgradeKeys: (keyof PlayerUpgrades)[] = [
    'speedLevel',
    'startLengthLevel',
    'incomeLevel',
    'magnetLevel',
  ];

  const iconMap = {
    speedLevel: Zap,
    startLengthLevel: Flame,
    incomeLevel: DollarSign,
    magnetLevel: Magnet,
  };

  const keyToConfigKey = (k: keyof PlayerUpgrades): keyof typeof UPGRADE_CONFIG => {
    if (k === 'speedLevel') return 'speed';
    if (k === 'startLengthLevel') return 'startLength';
    if (k === 'incomeLevel') return 'income';
    return 'magnet';
  };

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
            <Coins className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-black text-slate-100">TYCOON UPGRADES</h2>
              <p className="text-xs text-slate-400">
                Permanent stat multipliers funded by your banked match cash!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 font-black text-sm">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>{stats.totalPermanentCoins}</span>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Upgrades List */}
        <div className="py-4 space-y-3">
          {upgradeKeys.map((key) => {
            const confKey = keyToConfigKey(key);
            const conf = UPGRADE_CONFIG[confKey];
            const currentLevel = stats.upgrades[key];
            const cost = getUpgradeCost(confKey, currentLevel);
            const canAfford = stats.totalPermanentCoins >= cost && currentLevel < 10;
            const Icon = iconMap[key];

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900 shadow"
                    style={{ color: conf.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-200">
                        {conf.name}
                      </span>
                      <span className="text-xs font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        LVL {currentLevel}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      {conf.description}
                    </p>
                  </div>
                </div>

                <div>
                  {currentLevel >= 10 ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                      MAX TIER
                    </span>
                  ) : (
                    <button
                      onClick={() => onUpgrade(key)}
                      disabled={!canAfford}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-md ${
                        canAfford
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="h-3.5 w-3.5" />
                      <span>{cost}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
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
