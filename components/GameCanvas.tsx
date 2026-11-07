'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeGameEngine, FloatingText } from '@/lib/threeGameEngine';
import {
  GameStats,
  MATCH_DURATION_SECONDS,
  DailySpinReward,
  INITIAL_SKINS,
  STAGES,
  PlayerUpgrades,
  computeCollectionPerks,
} from '@/lib/gameTypes';
import HUD from './HUD';
import VirtualJoystick from './VirtualJoystick';
import BottomControlDock from './BottomControlDock';
import DailySpinModal from './DailySpinModal';
import SkinsWardrobeModal from './SkinsWardrobeModal';
import StageSelectModal from './StageSelectModal';
import TycoonModal from './TycoonPadsOverlay';
import GameOverModal from './GameOverModal';

const INITIAL_STATS: GameStats = {
  score: 0,
  pelletsEaten: 0,
  botsKilled: 0,
  cashEarnedThisMatch: 0,
  totalPermanentCoins: 120, // Starting seed coins for testing upgrades!
  totalGems: 5,
  currentMatchTime: MATCH_DURATION_SECONDS,
  level: 1,
  exp: 0,
  expForNextLevel: 50,
  currentLength: 8,
  currentStageId: 1,
  equippedSkinId: 'emerald',
  upgrades: {
    speedLevel: 0,
    startLengthLevel: 0,
    incomeLevel: 0,
    magnetLevel: 0,
  },
  hasFreeDailySpin: true,
  activePowerUps: {
    magnet: 0,
    speed: 0,
    shield: 0,
    doubleCash: 0,
  },
  bossAlive: false,
  bossHp: 600,
  bossMaxHp: 600,
};

export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ThreeGameEngine | null>(null);

  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [cameraMode, setCameraMode] = useState<'dynamic' | 'close' | 'isometric'>('dynamic');

  // Modals state
  const [isTycoonOpen, setIsTycoonOpen] = useState(false);
  const [isSkinsOpen, setIsSkinsOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isSpinOpen, setIsSpinOpen] = useState(false);
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(['emerald']);

  // Floating text queue
  const addFloatingText = useCallback((textData: FloatingText) => {
    setFloatingTexts((prev) => [...prev.slice(-8), textData]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== textData.id));
    }, 1400);
  }, []);

  const [radarData, setRadarData] = useState({
    playerPos: { x: 0, z: 0 },
    botPositions: [] as { x: number; z: number }[],
    bossPos: null as { x: number; z: number } | null,
    currentRadius: 90,
    maxRadius: 90,
  });

  // Periodically refresh radar positions for HUD
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        setRadarData(engineRef.current.getRadarData());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const [matchResult, setMatchResult] = useState<{ isGameOver: boolean; isVictory: boolean }>({
    isGameOver: false,
    isVictory: false,
  });

  // Initialize Three.js Engine once inside ref container
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new ThreeGameEngine(
      mountRef.current,
      (newStats) => setStats({ ...newStats }),
      addFloatingText,
      (isVictory) => setMatchResult({ isGameOver: true, isVictory }),
      INITIAL_STATS
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [addFloatingText]);

  // Handle Joystick move
  const handleJoystickMove = (vector: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.inputVector = vector;
    }
  };

  const handleBoostChange = (isBoosting: boolean) => {
    if (engineRef.current) {
      engineRef.current.isBoosting = isBoosting;
    }
  };

  const togglePause = () => {
    if (engineRef.current) {
      const next = !isPaused;
      setIsPaused(next);
      engineRef.current.isPaused = next;
    }
  };

  const handleSetCameraMode = (mode: 'dynamic' | 'close' | 'isometric') => {
    setCameraMode(mode);
    if (engineRef.current) {
      engineRef.current.cameraMode = mode;
    }
  };

  const handleUpgrade = (type: keyof PlayerUpgrades) => {
    if (engineRef.current) {
      const configKeyMap: Record<keyof PlayerUpgrades, any> = {
        speedLevel: 'speed',
        startLengthLevel: 'startLength',
        incomeLevel: 'income',
        magnetLevel: 'magnet',
      };
      engineRef.current.tryPurchaseUpgrade(configKeyMap[type]);
    }
  };

  const handleEquipSkin = (skinId: string) => {
    setStats((prev) => ({ ...prev, equippedSkinId: skinId }));
    if (engineRef.current) {
      engineRef.current.stats.equippedSkinId = skinId;
      engineRef.current.restartMatch();
    }
  };

  const handleUnlockSkin = (skinId: string) => {
    setUnlockedSkinIds((prev) => {
      if (!prev.includes(skinId)) return [...prev, skinId];
      return prev;
    });
  };

  const handleDeductCoins = (amount: number) => {
    setStats((prev) => {
      const nextCoins = Math.max(0, prev.totalPermanentCoins - amount);
      if (engineRef.current) {
        engineRef.current.stats.totalPermanentCoins = nextCoins;
      }
      return { ...prev, totalPermanentCoins: nextCoins };
    });
  };

  const handleAddCoins = (amount: number) => {
    setStats((prev) => {
      const nextCoins = prev.totalPermanentCoins + amount;
      if (engineRef.current) {
        engineRef.current.stats.totalPermanentCoins = nextCoins;
      }
      return { ...prev, totalPermanentCoins: nextCoins };
    });
  };

  // Sync active collection perks whenever unlocked skins change
  useEffect(() => {
    const perks = computeCollectionPerks(unlockedSkinIds);
    if (engineRef.current) {
      engineRef.current.collectionPerks = perks;
    }
  }, [unlockedSkinIds]);

  const handleSelectStage = (stageId: number) => {
    setStats((prev) => ({ ...prev, currentStageId: stageId }));
    setIsStagesOpen(false);
    if (engineRef.current) {
      engineRef.current.stats.currentStageId = stageId;
      engineRef.current.restartMatch();
    }
  };

  const handleNextStage = () => {
    const nextId = stats.currentStageId + 1;
    handleSelectStage(nextId);
  };

  const handlePlayAgain = () => {
    setMatchResult({ isGameOver: false, isVictory: false });
    if (engineRef.current) {
      engineRef.current.restartMatch();
      setStats({ ...engineRef.current.stats });
    }
  };

  const handleSpinReward = (reward: DailySpinReward) => {
    setStats((prev) => {
      const next = { ...prev };
      if (reward.type === 'coins' && reward.amount) {
        next.totalPermanentCoins += reward.amount;
      } else if (reward.type === 'gems' && reward.amount) {
        next.totalGems += reward.amount;
      } else if (reward.type === 'skin' && reward.skinId) {
        handleUnlockSkin(reward.skinId);
        next.equippedSkinId = reward.skinId;
      } else if (reward.type === 'powerup') {
        next.activePowerUps.magnet = 15;
      } else if (reward.type === 'start_buff') {
        next.upgrades.startLengthLevel += 1;
      }
      return next;
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Modern HUD Overlay */}
      <HUD
        stats={stats}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onOpenTycoon={() => setIsTycoonOpen(true)}
        onOpenSkins={() => setIsSkinsOpen(true)}
        onOpenSpin={() => setIsSpinOpen(true)}
        floatingTexts={floatingTexts}
        radarData={radarData}
      />

      {/* Virtual Joystick for Touch / Mobile */}
      <VirtualJoystick
        onMove={handleJoystickMove}
        onBoostChange={handleBoostChange}
        disabled={
          isPaused ||
          isTycoonOpen ||
          isSkinsOpen ||
          isStagesOpen ||
          isSpinOpen ||
          matchResult.isGameOver
        }
      />

      {/* Collapsible Bottom Control Dock */}
      <BottomControlDock
        cameraMode={cameraMode}
        onSetCameraMode={handleSetCameraMode}
        onOpenTycoon={() => setIsTycoonOpen(true)}
        onOpenSkins={() => setIsSkinsOpen(true)}
        onOpenStages={() => setIsStagesOpen(true)}
        onOpenDailySpin={() => setIsSpinOpen(true)}
      />

      {/* Modals */}
      <TycoonModal
        isOpen={isTycoonOpen}
        onClose={() => setIsTycoonOpen(false)}
        stats={stats}
        onUpgrade={handleUpgrade}
      />

      <DailySpinModal
        isOpen={isSpinOpen}
        onClose={() => setIsSpinOpen(false)}
        stats={stats}
        onRewardClaimed={handleSpinReward}
      />

      <SkinsWardrobeModal
        isOpen={isSkinsOpen}
        onClose={() => setIsSkinsOpen(false)}
        equippedSkinId={stats.equippedSkinId}
        onEquipSkin={handleEquipSkin}
        unlockedSkinIds={unlockedSkinIds}
        onUnlockSkin={handleUnlockSkin}
        coins={stats.totalPermanentCoins}
        onDeductCoins={handleDeductCoins}
        onAddCoins={handleAddCoins}
        playerLevel={stats.level}
        currentStageId={stats.currentStageId}
      />

      <StageSelectModal
        isOpen={isStagesOpen}
        onClose={() => setIsStagesOpen(false)}
        currentStageId={stats.currentStageId}
        onSelectStage={handleSelectStage}
      />

      <GameOverModal
        isOpen={matchResult.isGameOver}
        isVictory={matchResult.isVictory}
        stats={stats}
        onPlayAgain={handlePlayAgain}
        onOpenTycoon={() => setIsTycoonOpen(true)}
        onOpenSpin={() => setIsSpinOpen(true)}
        onNextStage={handleNextStage}
      />
    </div>
  );
}
