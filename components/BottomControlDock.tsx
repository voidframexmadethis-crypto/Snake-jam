'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Camera,
  Coins,
  Sparkles,
  Compass,
  Gift,
} from 'lucide-react';

interface BottomControlDockProps {
  cameraMode: 'dynamic' | 'close' | 'isometric';
  onSetCameraMode: (mode: 'dynamic' | 'close' | 'isometric') => void;
  onOpenTycoon: () => void;
  onOpenSkins: () => void;
  onOpenStages: () => void;
  onOpenDailySpin: () => void;
}

export default function BottomControlDock({
  cameraMode,
  onSetCameraMode,
  onOpenTycoon,
  onOpenSkins,
  onOpenStages,
  onOpenDailySpin,
}: BottomControlDockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      data-no-joystick="true"
      className="pointer-events-auto fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center max-w-[min(940px,96vw)] select-none"
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 rounded-t-xl border-t border-x border-slate-700/80 bg-slate-900/90 px-3.5 py-1 text-[11px] font-bold text-slate-300 shadow-lg hover:bg-slate-800 transition-colors"
      >
        {collapsed ? (
          <>
            <ChevronUp className="h-3.5 w-3.5 text-cyan-400" />
            <span>Show Dock</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
            <span>Hide Dock</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Dock Container */}
      {!collapsed && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/85 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          {/* Camera Presets */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            <Camera className="h-3.5 w-3.5 text-slate-400 ml-1 mr-0.5" />
            {(['dynamic', 'close', 'isometric'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetCameraMode(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition ${
                  cameraMode === mode
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'isometric' ? 'Top-Down' : mode}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Hub Buttons */}
          <button
            onClick={onOpenTycoon}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-amber-300 hover:border-amber-400 hover:bg-slate-800 transition"
          >
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span>Tycoon Shop</span>
          </button>

          <button
            onClick={onOpenSkins}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:border-cyan-400 hover:bg-slate-800 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Free Skins</span>
          </button>

          <button
            onClick={onOpenStages}
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-purple-300 hover:border-purple-400 hover:bg-slate-800 transition"
          >
            <Compass className="h-3.5 w-3.5 text-purple-400" />
            <span>Stages</span>
          </button>

          <button
            onClick={onOpenDailySpin}
            className="flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-950/60 to-purple-950/60 px-3 py-1.5 text-xs font-bold text-pink-300 hover:border-pink-400 hover:bg-slate-800 transition"
          >
            <Gift className="h-3.5 w-3.5 text-pink-400" />
            <span>Daily Spin</span>
            <span className="rounded bg-pink-500/30 px-1 py-0.2 text-[9px] font-black text-pink-200">
              FREE
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
