'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, Gift } from 'lucide-react';
import { DAILY_SPIN_REWARDS, DailySpinReward, GameStats } from '@/lib/gameTypes';
import { soundManager } from '@/lib/audio';

interface DailySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  onRewardClaimed: (reward: DailySpinReward) => void;
}

export default function DailySpinModal({
  isOpen,
  onClose,
  stats,
  onRewardClaimed,
}: DailySpinModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [wonReward, setWonReward] = useState<DailySpinReward | null>(null);

  const numSegments = DAILY_SPIN_REWARDS.length;
  const segmentAngle = (Math.PI * 2) / numSegments;

  // Draw Roulette Wheel
  const drawWheel = React.useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 16;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(rotation);

    // Draw slices
    DAILY_SPIN_REWARDS.forEach((reward, i) => {
      const startAngle = i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Alternate subtle shades
      ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#0f172a';
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Slice label & accent
      ctx.save();
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = reward.color;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(reward.label, radius - 24, 0);
      ctx.restore();
    });

    // Outer wheel border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center decorative cap
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }, [segmentAngle]);

  useEffect(() => {
    if (isOpen) {
      drawWheel(currentRotation);
    }
  }, [isOpen, currentRotation, drawWheel]);

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonReward(null);

    // Pick random target reward
    const targetIndex = Math.floor(Math.random() * numSegments);
    const targetReward = DAILY_SPIN_REWARDS[targetIndex];

    // Calculate rotation: multiple full spins + offset to target index at the top pointer (at -PI/2)
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle =
      Math.PI * 2 * extraSpins +
      (Math.PI * 2 - (targetIndex * segmentAngle + segmentAngle / 2)) -
      Math.PI / 2;

    const startRot = currentRotation;
    const totalDist = targetAngle - (startRot % (Math.PI * 2));
    const duration = 4000; // 4s spin
    const startTime = performance.now();
    let lastTickStep = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const newRot = startRot + totalDist * ease;
      setCurrentRotation(newRot);
      drawWheel(newRot);

      // Tick sound on segment pass
      const currentStep = Math.floor((newRot / segmentAngle) % numSegments);
      if (currentStep !== lastTickStep) {
        lastTickStep = currentStep;
        soundManager.playDailySpinTick();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setWonReward(targetReward);
        soundManager.playSpinWin();
        onRewardClaimed(targetReward);
      }
    };

    requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl cursor-default"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-1">
          <Gift className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-black text-slate-100 tracking-wide">
            DAILY LUCKY SPIN
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Free daily rewards! Spin to win coins, rare skins, and powerups.
        </p>

        {/* Wheel container with top pointer */}
        <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center">
          {/* Top Pointer arrow */}
          <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-2">
            <div className="h-0 w-0 border-x-8 border-x-transparent border-t-[18px] border-t-amber-400 drop-shadow-md" />
          </div>

          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="block rounded-full"
          />
        </div>

        {/* Result alert */}
        {wonReward && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-emerald-200">
            <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>You Won: {wonReward.label}!</span>
            </div>
          </div>
        )}

        {/* Spin CTA Button */}
        <button
          onClick={spin}
          disabled={isSpinning}
          className={`mt-5 w-full rounded-2xl py-3.5 text-sm font-extrabold uppercase tracking-wider transition-all shadow-lg ${
            isSpinning
              ? 'cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 hover:opacity-95 shadow-amber-500/20 active:scale-95'
          }`}
        >
          {isSpinning ? 'SPINNING...' : 'SPIN FOR FREE!'}
        </button>
      </div>
    </div>
  );
}
