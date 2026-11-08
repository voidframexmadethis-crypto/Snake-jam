'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  // Joystick center position on screen (dynamic thumb anchor)
  const [basePos, setBasePos] = useState<{ x: number; y: number } | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isTouchActive, setIsTouchActive] = useState(false);
  const [boosting, setBoosting] = useState(false);

  // Default resting position (bottom-left area)
  const [defaultPos, setDefaultPos] = useState<{ x: number; y: number }>({ x: 95, y: 550 });

  // Dedicated pointer tracking refs to avoid any state desynchronization
  const steeringPointerIdRef = useRef<number | null>(null);
  const boostPointerIdRef = useRef<number | null>(null);
  const touchOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onMoveRef = useRef(onMove);
  const onBoostChangeRef = useRef(onBoostChange);

  useEffect(() => {
    onMoveRef.current = onMove;
    onBoostChangeRef.current = onBoostChange;
  });

  const maxRadius = 55;
  const deadZone = 4;

  // Set default resting position on mount and resize
  useEffect(() => {
    const updateDefaultPos = () => {
      const pos = {
        x: Math.max(75, Math.min(120, window.innerWidth * 0.16)),
        y: Math.max(150, window.innerHeight - 120),
      };
      setDefaultPos(pos);
    };

    updateDefaultPos();
    window.addEventListener('resize', updateDefaultPos, { passive: true });
    return () => window.removeEventListener('resize', updateDefaultPos);
  }, []);

  // Safe reset function that NEVER fails to release joystick state
  const resetJoystick = useCallback(() => {
    steeringPointerIdRef.current = null;
    setIsTouchActive(false);
    setKnobPos({ x: 0, y: 0 });
    setBasePos(null);
    lastVectorRef.current = { x: 0, y: 0 };
    onMoveRef.current({ x: 0, y: 0 });
  }, []);

  const resetBoost = useCallback(() => {
    boostPointerIdRef.current = null;
    setBoosting(false);
    onBoostChangeRef.current(false);
  }, []);

  // Global window listeners: ensures joystick never gets stuck even if the finger lifts off-screen
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (e.pointerId === steeringPointerIdRef.current) {
        resetJoystick();
      }
      if (e.pointerId === boostPointerIdRef.current) {
        resetBoost();
      }
    };

    const handleGlobalCancel = () => {
      resetJoystick();
      resetBoost();
    };

    window.addEventListener('pointerup', handleGlobalPointerUp, { passive: true });
    window.addEventListener('pointercancel', handleGlobalCancel, { passive: true });
    window.addEventListener('touchend', handleGlobalCancel, { passive: true });
    window.addEventListener('touchcancel', handleGlobalCancel, { passive: true });
    window.addEventListener('blur', handleGlobalCancel, { passive: true });

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalCancel);
      window.removeEventListener('touchend', handleGlobalCancel);
      window.removeEventListener('touchcancel', handleGlobalCancel);
      window.removeEventListener('blur', handleGlobalCancel);
    };
  }, [resetJoystick, resetBoost]);


  // -------------------------------------------------------------
  // STEERING TOUCH ZONE HANDLERS (LEFT 65% OF SCREEN)
  // -------------------------------------------------------------
  const handleSteeringPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    // Ignore if clicking on buttons or interactive HUD elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-no-joystick="true"]')) {
      return;
    }

    // Capture pointer to maintain continuous tracking
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    steeringPointerIdRef.current = e.pointerId;
    setIsTouchActive(true);

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Place the joystick base right under the player's thumb!
    touchOriginRef.current = { x: clientX, y: clientY };
    setBasePos({ x: clientX, y: clientY });
    setKnobPos({ x: 0, y: 0 });
    lastVectorRef.current = { x: 0, y: 0 };
    onMoveRef.current({ x: 0, y: 0 });
  };

  const handleSteeringPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || steeringPointerIdRef.current !== e.pointerId) return;

    let dx = e.clientX - touchOriginRef.current.x;
    let dy = e.clientY - touchOriginRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist < deadZone) {
      setKnobPos({ x: 0, y: 0 });
      if (lastVectorRef.current.x !== 0 || lastVectorRef.current.y !== 0) {
        lastVectorRef.current = { x: 0, y: 0 };
        onMoveRef.current({ x: 0, y: 0 });
      }
      return;
    }

    const angle = Math.atan2(dy, dx);

    // Follow-Thumb Dynamic Anchor:
    // If the thumb drags further than maxRadius, smoothly pull the base along!
    // This guarantees ZERO turn-delay when reversing thumb direction.
    if (dist > maxRadius) {
      const excess = dist - maxRadius;
      touchOriginRef.current.x += Math.cos(angle) * excess;
      touchOriginRef.current.y += Math.sin(angle) * excess;
      setBasePos({ x: touchOriginRef.current.x, y: touchOriginRef.current.y });

      // Recalculate relative to shifted origin
      dx = e.clientX - touchOriginRef.current.x;
      dy = e.clientY - touchOriginRef.current.y;
    }

    const clampedDist = Math.min(Math.hypot(dx, dy), maxRadius);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });

    // Normalized magnitude [0, 1]
    const normalizedDist = Math.min(1.0, (clampedDist - deadZone) / (maxRadius - deadZone));
    const vx = Math.cos(angle) * normalizedDist;
    const vy = Math.sin(angle) * normalizedDist;

    lastVectorRef.current = { x: vx, y: vy };
    onMoveRef.current({ x: vx, y: vy });
  };

  const handleSteeringPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (steeringPointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      resetJoystick();
    }
  };

  // -------------------------------------------------------------
  // BOOST BUTTON HANDLERS (RIGHT SIDE)
  // -------------------------------------------------------------
  const handleBoostDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (disabled) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    boostPointerIdRef.current = e.pointerId;
    setBoosting(true);
    onBoostChangeRef.current(true);

    // Subtle tactile haptic vibration if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
  };

  const handleBoostUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (boostPointerIdRef.current === e.pointerId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      resetBoost();
    }
  };

  const activeIsTouch = disabled ? false : isTouchActive;
  const activeKnob = disabled ? { x: 0, y: 0 } : knobPos;
  const activeBase = disabled ? null : basePos;
  const activePos = activeBase || defaultPos;
  const currentAngle = Math.atan2(activeKnob.y, activeKnob.x);
  const knobDist = Math.hypot(activeKnob.x, activeKnob.y);
  const hasDirection = knobDist > 6;
  const activeBoosting = disabled ? false : boosting;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden touch-none">
      {/* ========================================================= */}
      {/* DEDICATED STEERING TOUCH ZONE (LEFT 62% OF SCREEN) */}
      {/* Covers top-0 to bottom-0 so touches near edges NEVER fail */}
      {/* ========================================================= */}
      <div
        onPointerDown={handleSteeringPointerDown}
        onPointerMove={handleSteeringPointerMove}
        onPointerUp={handleSteeringPointerUp}
        onPointerCancel={handleSteeringPointerUp}
        onLostPointerCapture={resetJoystick}
        className="pointer-events-auto absolute left-0 top-0 bottom-0 w-[62%] sm:w-[65%] touch-none select-none z-10"
        style={{ touchAction: 'none' }}
      />

      {/* Floating / Resting Thumbstick Visual */}
      <div
        className="pointer-events-none absolute z-20 transition-opacity duration-150"
        style={{
          left: `${activePos.x}px`,
          top: `${activePos.y}px`,
          transform: 'translate(-50%, -50%)',
          opacity: disabled ? 0.15 : activeIsTouch ? 1 : 0.65,
        }}
      >
        {/* Outer Ring Base */}
        <div
          className={`relative flex items-center justify-center rounded-full border-2 transition-colors duration-150 backdrop-blur-sm ${
            activeIsTouch
              ? 'border-cyan-400 bg-slate-950/75 shadow-2xl shadow-cyan-500/40 ring-2 ring-cyan-500/20'
              : 'border-slate-600/70 bg-slate-950/50 shadow-lg shadow-black/40'
          }`}
          style={{ width: `${maxRadius * 2 + 10}px`, height: `${maxRadius * 2 + 10}px` }}
        >
          {/* Decorative directional reticle & compass ring */}
          <div className="absolute inset-2.5 rounded-full border border-dashed border-cyan-500/25 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-cyan-500/20 pointer-events-none" />
          <div className="absolute w-full h-[1px] bg-cyan-500/20 pointer-events-none" />

          {/* Compass Icon indicator when resting */}
          {!activeIsTouch && (
            <Compass className="h-6 w-6 text-slate-400/80 animate-pulse" />
          )}

          {/* Dynamic Laser Line from center to knob */}
          {hasDirection && activeIsTouch && (
            <div
              className="absolute h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-cyan-300 origin-left pointer-events-none"
              style={{
                left: `${maxRadius + 5}px`,
                top: `${maxRadius + 5}px`,
                width: `${knobDist}px`,
                transform: `rotate(${currentAngle}rad)`,
              }}
            />
          )}

          {/* Draggable Knob Handle */}
          <div
            className={`absolute flex items-center justify-center rounded-full border-2 shadow-xl transition-transform duration-75 pointer-events-none ${
              activeIsTouch
                ? 'border-cyan-200 bg-gradient-to-tr from-cyan-600 via-cyan-400 to-sky-300 shadow-cyan-400/60 scale-105'
                : 'border-slate-500 bg-slate-800/90 shadow-black/50'
            }`}
            style={{
              width: '48px',
              height: '48px',
              transform: `translate(${activeKnob.x}px, ${activeKnob.y}px)`,
            }}
          >
            {/* Direction pointer arrowhead inside knob */}
            {hasDirection && activeIsTouch && (
              <div
                className="h-0 w-0 border-x-4 border-x-transparent border-b-8 border-b-slate-950 transition-transform"
                style={{
                  transform: `rotate(${currentAngle + Math.PI / 2}rad)`,
                }}
              />
            )}
            {!hasDirection && (
              <div className="h-3 w-3 rounded-full bg-slate-950/70" />
            )}
          </div>
        </div>

        {/* Subtle label beneath resting joystick */}
        {!activeIsTouch && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap text-[10px] font-black text-cyan-300 uppercase tracking-widest bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-slate-700/80 shadow-md">
            Touch Anywhere to Steer
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* DEDICATED BOOST ACTION BUTTON (RIGHT SIDE) */}
      {/* Large generous hit target with tactile feedback */}
      {/* ========================================================= */}
      <div className="pointer-events-none absolute right-4 sm:right-8 bottom-8 sm:bottom-12 z-30 select-none">
        <button
          data-no-joystick="true"
          onPointerDown={handleBoostDown}
          onPointerUp={handleBoostUp}
          onPointerCancel={handleBoostUp}
          onLostPointerCapture={resetBoost}
          disabled={disabled}
          className={`pointer-events-auto flex h-20 w-20 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-3xl border-2 shadow-2xl transition-all duration-100 touch-none select-none cursor-pointer ${
            activeBoosting
              ? 'scale-90 border-amber-300 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 text-slate-950 shadow-amber-500/70 ring-4 ring-amber-400/30'
              : 'border-amber-500/60 bg-slate-900/90 text-amber-400 hover:border-amber-400 hover:bg-slate-800 active:scale-95 shadow-lg shadow-black/50'
          }`}
          style={{ touchAction: 'none' }}
        >
          <Flame className={`h-8 w-8 sm:h-9 sm:w-9 ${activeBoosting ? 'animate-bounce text-slate-950' : 'text-amber-400'}`} />
          <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase mt-0.5">
            BOOST
          </span>
        </button>
      </div>
    </div>
  );
}
