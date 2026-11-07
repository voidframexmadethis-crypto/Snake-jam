'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Flame, Compass } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onBoostChange: (isBoosting: boolean) => void;
  disabled?: boolean;
}

export default function VirtualJoystick({
  onMove,
  onBoostChange,
  disabled = false,
}: VirtualJoystickProps) {
  // Joystick center position on screen
  const [basePos, setBasePos] = useState<{ x: number; y: number } | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [boosting, setBoosting] = useState(false);

  // Default resting position (bottom-left)
  const [defaultPos, setDefaultPos] = useState<{ x: number; y: number }>({ x: 90, y: 550 });
  const activeTouchIdRef = useRef<number | null>(null);
  const touchOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });

  const maxRadius = 55;

  // Set default resting position on mount and resize
  useEffect(() => {
    const updateDefaultPos = () => {
      const pos = {
        x: Math.max(75, Math.min(110, window.innerWidth * 0.15)),
        y: window.innerHeight - 130,
      };
      setDefaultPos(pos);
    };

    updateDefaultPos();
    window.addEventListener('resize', updateDefaultPos);
    return () => window.removeEventListener('resize', updateDefaultPos);
  }, []);

  // Touch area pointer event handlers
  const handleTouchZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activeTouchIdRef.current !== null) return;

    // Prevent handling if clicking directly on interactive buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-no-joystick="true"]')) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    activeTouchIdRef.current = e.pointerId;
    setIsTouchActive(true);

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Place the joystick base right under the player's thumb!
    touchOriginRef.current = { x: clientX, y: clientY };
    setBasePos({ x: clientX, y: clientY });
    setKnobPos({ x: 0, y: 0 });
  };

  const handleTouchZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current !== e.pointerId) return;

    const dx = e.clientX - touchOriginRef.current.x;
    const dy = e.clientY - touchOriginRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= 0.001) {
      setKnobPos({ x: 0, y: 0 });
      onMoveRef.current({ x: 0, y: 0 });
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });

    // Send normalized vector
    const normalizedDist = clampedDist / maxRadius;
    onMoveRef.current({
      x: Math.cos(angle) * normalizedDist,
      y: Math.sin(angle) * normalizedDist,
    });
  };

  const handleTouchZonePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    activeTouchIdRef.current = null;
    setIsTouchActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMoveRef.current({ x: 0, y: 0 });

    // Return to resting position in bottom-left
    setBasePos(null);
  };

  // Boost action button handling
  const handleBoostDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setBoosting(true);
    onBoostChange(true);
  };

  const handleBoostUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setBoosting(false);
    onBoostChange(false);
  };

  const activePos = basePos || defaultPos;
  const currentAngle = Math.atan2(knobPos.y, knobPos.x);
  const hasDirection = Math.hypot(knobPos.x, knobPos.y) > 6;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Full-screen thumb steering touch zone (active below top header, avoiding bottom dock) */}
      <div
        onPointerDown={handleTouchZonePointerDown}
        onPointerMove={handleTouchZonePointerMove}
        onPointerUp={handleTouchZonePointerEnd}
        onPointerCancel={handleTouchZonePointerEnd}
        className="pointer-events-auto absolute inset-x-0 top-16 bottom-20 touch-none select-none z-10"
      />

      {/* Floating / Resting Thumbstick Visual */}
      <div
        className="pointer-events-none absolute z-20 transition-opacity duration-200"
        style={{
          left: `${activePos.x}px`,
          top: `${activePos.y}px`,
          transform: 'translate(-50%, -50%)',
          opacity: disabled ? 0.2 : isTouchActive ? 1 : 0.65,
        }}
      >
        {/* Outer Ring Base */}
        <div
          className={`relative flex items-center justify-center rounded-full border-2 transition-colors duration-200 ${
            isTouchActive
              ? 'border-cyan-400 bg-slate-950/70 shadow-2xl shadow-cyan-500/30'
              : 'border-slate-600/60 bg-slate-950/40'
          }`}
          style={{ width: `${maxRadius * 2 + 10}px`, height: `${maxRadius * 2 + 10}px` }}
        >
          {/* Decorative directional reticle */}
          <div className="absolute inset-3 rounded-full border border-dashed border-cyan-500/20" />
          <div className="absolute h-full w-[1px] bg-slate-700/30" />
          <div className="absolute w-full h-[1px] bg-slate-700/30" />

          {/* Compass Icon indicator */}
          {!isTouchActive && (
            <Compass className="h-6 w-6 text-slate-500/70" />
          )}

          {/* Draggable Knob Handle */}
          <div
            className={`absolute flex items-center justify-center rounded-full border-2 transition-transform duration-75 shadow-lg ${
              isTouchActive
                ? 'border-cyan-300 bg-gradient-to-tr from-cyan-600 via-cyan-500 to-sky-400 shadow-cyan-400/50'
                : 'border-slate-500 bg-slate-800 shadow-slate-900/50'
            }`}
            style={{
              width: '46px',
              height: '46px',
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            {/* Direction pointer arrowhead inside knob */}
            {hasDirection && isTouchActive && (
              <div
                className="h-0 w-0 border-x-4 border-x-transparent border-b-8 border-b-slate-950"
                style={{
                  transform: `rotate(${currentAngle + Math.PI / 2}rad)`,
                }}
              />
            )}
            {!hasDirection && (
              <div className="h-2.5 w-2.5 rounded-full bg-slate-950/60" />
            )}
          </div>
        </div>

        {/* Subtle label beneath resting joystick */}
        {!isTouchActive && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-800">
            Thumb to Move
          </div>
        )}
      </div>

      {/* Boost / Sprint Action Button (Right Side) */}
      <div className="pointer-events-none absolute right-4 sm:right-8 bottom-24 z-30 select-none">
        <button
          data-no-joystick="true"
          onPointerDown={handleBoostDown}
          onPointerUp={handleBoostUp}
          onPointerCancel={handleBoostUp}
          disabled={disabled}
          className={`pointer-events-auto flex h-20 w-20 flex-col items-center justify-center rounded-3xl border-2 shadow-2xl transition-all duration-100 touch-none select-none ${
            boosting
              ? 'scale-90 border-amber-300 bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 shadow-amber-500/60'
              : 'border-amber-500/50 bg-slate-900/90 text-amber-400 hover:border-amber-400 hover:bg-slate-800 active:scale-95 shadow-lg'
          }`}
        >
          <Flame className={`h-8 w-8 ${boosting ? 'animate-bounce' : ''}`} />
          <span className="text-[10px] font-black tracking-wider uppercase mt-0.5">
            BOOST
          </span>
        </button>
      </div>
    </div>
  );
}
