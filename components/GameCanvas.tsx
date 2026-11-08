'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ThreeGameEngine, FloatingText, KillFeedEntry } from '@/lib/threeGameEngine';
import {
  GameStats,
  MATCH_DURATION_SECONDS,
  DailySpinReward,
  INITIAL_SKINS,
  STAGES,
  PlayerUpgrades,
  computeCollectionPerks,
  INITIAL_MISSIONS,
  INITIAL_ACHIEVEMENTS,
  Mission,
  Achievement,
  LeaderboardEntry,
} from '@/lib/gameTypes';
import { soundManager } from '@/lib/audio';
import HUD from './HUD';
import { useLowPolyObjectPool } from '@/hooks/useObjectPool';
import VirtualJoystick from './VirtualJoystick';
import BottomControlDock from './BottomControlDock';
import DailySpinModal from './DailySpinModal';
import SkinsWardrobeModal from './SkinsWardrobeModal';
import StageSelectModal from './StageSelectModal';
import TycoonModal from './TycoonPadsOverlay';
import GameOverModal from './GameOverModal';
import MissionsAchievementsModal from './MissionsAchievementsModal';
import MultiplayerModLobbyModal from './MultiplayerModLobbyModal';
import { MultiplayerRoom } from '@/lib/multiplayerSystem';

const INITIAL_STATS: GameStats = {
  score: 0,
  pelletsEaten: 0,
  botsKilled: 0,
  cashEarnedThisMatch: 0,
  gemsEarnedThisMatch: 0,
  totalPermanentCoins: 0,
  totalGems: 0,
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
    fire: 0,
  },
  bossAlive: false,
  bossHp: 600,
  bossMaxHp: 600,
  stageProgress: 0,
  bossPhase: 1,
};

interface LastMatchResults {
  coins: number;
  gems: number;
  score: number;
}

export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ThreeGameEngine | null>(null);

  // Persistence: Initial load from localStorage
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [unlockedSkinIds, setUnlockedSkinIds] = useState<string[]>(['emerald']);

  const [hasMounted, setHasMounted] = useState(false);

  // Persistence: Initial load from localStorage on mount
  useEffect(() => {
    let initialCoins = 0;
    let initialGems = 0;
    let initialUpgrades = INITIAL_STATS.upgrades;
    let initialLevel = 1;
    let initialSkins = ['emerald'];

    try {
      const savedCoins = localStorage.getItem('SavedLifetimeCoins');
      const savedGems = localStorage.getItem('SavedTotalGems');
      const savedUpgrades = localStorage.getItem('SavedUpgrades');
      const savedLevel = localStorage.getItem('SavedLevel');
      const savedSkins = localStorage.getItem('SavedUnlockedSkins');

      if (savedCoins !== null && savedCoins !== '') {
        const val = parseInt(savedCoins, 10);
        if (!isNaN(val)) initialCoins = val;
      }
      if (savedGems !== null && savedGems !== '') {
        const val = parseInt(savedGems, 10);
        if (!isNaN(val)) initialGems = val;
      }
      if (savedUpgrades) {
        initialUpgrades = JSON.parse(savedUpgrades);
      }
      if (savedLevel) {
        const val = parseInt(savedLevel, 10);
        if (!isNaN(val) && val > 0) initialLevel = val;
      }
      if (savedSkins) {
        const parsed = JSON.parse(savedSkins);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialSkins = parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading stored game data:', e);
    }

    const timer = setTimeout(() => {
      setStats((prev) => ({
        ...prev,
        totalPermanentCoins: initialCoins,
        totalGems: initialGems,
        upgrades: initialUpgrades,
        level: initialLevel,
      }));
      setUnlockedSkinIds(initialSkins);
      setHasMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [countdownSec, setCountdownSec] = useState<number>(3);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [cameraMode, setCameraMode] = useState<'dynamic' | 'close' | 'isometric'>('dynamic');

  // Quests & Achievements State
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);

  // Modals state
  const [isTycoonOpen, setIsTycoonOpen] = useState(false);
  const [isSkinsOpen, setIsSkinsOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [isSpinOpen, setIsSpinOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [isModsOpen, setIsModsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)._openMultiplayerModal = () => setIsMultiplayerOpen(true);
      (window as any)._openModsModal = () => setIsModsOpen(true);
    }
  }, []);
  // Leaderboard and kill feed data
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [killFeedData, setKillFeedData] = useState<KillFeedEntry[]>([]);
  const [lastMatchResults, setLastMatchResults] = useState<LastMatchResults | null>(null);

  // Persistence: Save on match end or upgrades, only after initial load has finished
  useEffect(() => {
    if (!hasMounted) return;
    if (gameState === 'gameover' || gameState === 'menu') {
      try {
        localStorage.setItem('SavedLifetimeCoins', stats.totalPermanentCoins.toString());
        localStorage.setItem('SavedTotalGems', stats.totalGems.toString());
        localStorage.setItem('SavedUpgrades', JSON.stringify(stats.upgrades));
        localStorage.setItem('SavedLevel', stats.level.toString());
        localStorage.setItem('SavedUnlockedSkins', JSON.stringify(unlockedSkinIds));
      } catch (e) {
        console.warn('Error saving game data:', e);
      }
    }
  }, [hasMounted, gameState, stats.totalPermanentCoins, stats.totalGems, stats.upgrades, stats.level, unlockedSkinIds]);

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
    currentRadius: 1250,
    maxRadius: 1250,
  });

  // Periodically refresh radar, live leaderboard, kill feed, and quests progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        const curStats = engineRef.current.stats;
        setRadarData(engineRef.current.getRadarData());
        setLeaderboardData(engineRef.current.getLiveLeaderboard());
        setKillFeedData(engineRef.current.getKillFeed());

        // Missions Progress Update
        setMissions((prevMissions) =>
          prevMissions.map((m) => {
            let currentVal = m.current;
            if (m.id === 'daily_kills') currentVal = Math.max(currentVal, curStats.botsKilled);
            if (m.id === 'daily_pellets') currentVal = Math.max(currentVal, curStats.pelletsEaten);
            if (m.id === 'daily_bank') currentVal = Math.max(currentVal, curStats.cashEarnedThisMatch);
            if (m.id === 'weekly_length') currentVal = Math.max(currentVal, curStats.currentLength);
            if (m.id === 'weekly_boss') currentVal = curStats.bossHp <= 0 ? 1 : currentVal;

            const completed = currentVal >= m.target;
            return { ...m, current: currentVal, completed };
          })
        );

        // Achievements Progress Update
        setAchievements((prevAch) =>
          prevAch.map((a) => {
            let currentVal = a.current;
            if (a.id === 'ach_first_kill' || a.id === 'ach_hunter_master')
              currentVal = Math.max(currentVal, curStats.botsKilled);
            if (a.id === 'ach_bank_tycoon') currentVal = Math.max(currentVal, curStats.totalPermanentCoins);
            if (a.id === 'ach_pellet_master') currentVal = Math.max(currentVal, curStats.pelletsEaten);
            if (a.id === 'ach_colossus_80') currentVal = Math.max(currentVal, curStats.currentLength);
            if (a.id === 'ach_stage_3') currentVal = Math.max(currentVal, curStats.currentStageId);

            const unlocked = currentVal >= a.target;
            return { ...a, current: currentVal, unlocked };
          })
        );
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const [matchResult, setMatchResult] = useState<{ isGameOver: boolean; isVictory: boolean }>({
    isGameOver: false,
    isVictory: false,
  });

  // Initialize Three.js Engine with loaded stats and object pooling
  useEffect(() => {
    if (!mountRef.current || !hasMounted) return;

    const engine = new ThreeGameEngine(
      mountRef.current,
      (newStats) => {
        setStats({ ...newStats });
        // Immediately persist to localStorage whenever stats update (on kill, pellet eat, etc.)
        try {
          localStorage.setItem('SavedLifetimeCoins', newStats.totalPermanentCoins.toString());
          localStorage.setItem('SavedTotalGems', newStats.totalGems.toString());
        } catch {}
      },
      addFloatingText,
      (isVictory) => {
        setMatchResult({ isGameOver: true, isVictory });
        setGameState('gameover');
        if (engineRef.current) {
          const s = engineRef.current.stats;
          setLastMatchResults({
            coins: s.cashEarnedThisMatch,
            gems: s.gemsEarnedThisMatch,
            score: s.score,
          });
          try {
            localStorage.setItem('SavedLifetimeCoins', s.totalPermanentCoins.toString());
            localStorage.setItem('SavedTotalGems', s.totalGems.toString());
            localStorage.setItem('SavedUpgrades', JSON.stringify(s.upgrades));
            localStorage.setItem('SavedLevel', s.level.toString());
          } catch {}
        }
      },
      stats // Passes the loaded stats!
    );
    engine.isPaused = true; // Pause engine initially for main menu
    engineRef.current = engine;

    // Direct global link for WalletSyncManager compatibility
    if (typeof window !== 'undefined') {
      (window as any).WalletSyncManager = {
        AddCoinsAndSave: (amount: number) => {
          if (engineRef.current) {
            engineRef.current.syncWallet(amount);
          }
        },
        addCoinsAndSave: (amount: number) => {
          if (engineRef.current) {
            engineRef.current.syncWallet(amount);
          }
        },
      };
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [hasMounted, addFloatingText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Return cleanly to main menu while preserving all coins and diamonds
  const handleBackToMenu = useCallback(() => {
    setGameState('menu');
    setMatchResult({ isGameOver: false, isVictory: false });
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.isPaused = true;
      engineRef.current.isGameOver = false;
      const curStats = engineRef.current.stats;
      setStats({ ...curStats });
      try {
        localStorage.setItem('SavedLifetimeCoins', curStats.totalPermanentCoins.toString());
        localStorage.setItem('SavedTotalGems', curStats.totalGems.toString());
        localStorage.setItem('SavedUpgrades', JSON.stringify(curStats.upgrades));
        localStorage.setItem('SavedLevel', curStats.level.toString());
        localStorage.setItem('SavedUnlockedSkins', JSON.stringify(unlockedSkinIds));
      } catch (e) {
        console.warn('Error saving to localStorage on back to menu:', e);
      }
    }
  }, [unlockedSkinIds]);

  // Handle Start Match Sequence (Menu -> 3s Countdown -> Direct Action)
  const handleStartMatch = () => {
    setIsMissionsOpen(false);
    setIsSkinsOpen(false);
    setIsStagesOpen(false);
    setIsTycoonOpen(false);
    setIsSpinOpen(false);

    setGameState('countdown');
    setCountdownSec(3);
    soundManager.playDailySpinTick();

    const timer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          soundManager.playPowerup();
          setGameState('playing');
          if (engineRef.current) {
            engineRef.current.isPaused = false;
            engineRef.current.restartMatch();
          }
          return 0;
        }
        soundManager.playDailySpinTick();
        return prev - 1;
      });
    }, 900);
  };

  // Handle Joystick move
  const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.inputVector = vector;
    }
  }, []);

  const handleBoostChange = useCallback((isBoosting: boolean) => {
    if (engineRef.current) {
      engineRef.current.isBoosting = isBoosting;
    }
  }, []);

  const togglePause = useCallback(() => {
    if (engineRef.current) {
      const next = !isPaused;
      setIsPaused(next);
      engineRef.current.isPaused = next;
    }
  }, [isPaused]);

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
      if (gameState === 'playing') {
        engineRef.current.restartMatch();
      }
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

  const handleDeductGems = (amount: number) => {
    setStats((prev) => {
      const nextGems = Math.max(0, prev.totalGems - amount);
      if (engineRef.current) {
        engineRef.current.stats.totalGems = nextGems;
      }
      return { ...prev, totalGems: nextGems };
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
      if (gameState === 'playing') {
        engineRef.current.restartMatch();
      }
    }
  };

  const handleNextStage = () => {
    const nextId = stats.currentStageId + 1;
    handleSelectStage(nextId);
  };

  const handlePlayAgain = () => {
    setMatchResult({ isGameOver: false, isVictory: false });
    handleStartMatch();
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

  // Claim Mission Handler
  const handleClaimMission = (id: string) => {
    const targetMission = missions.find((m) => m.id === id);
    if (!targetMission || !targetMission.completed || targetMission.claimed) return;

    setMissions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, claimed: true } : m))
    );

    if (targetMission.rewardType === 'coins') {
      handleAddCoins(targetMission.rewardAmount);
    } else if (targetMission.rewardType === 'gems') {
      setStats((prev) => ({ ...prev, totalGems: prev.totalGems + targetMission.rewardAmount }));
    } else if (targetMission.rewardType === 'exp') {
      setStats((prev) => {
        const nextExp = prev.exp + targetMission.rewardAmount;
        if (nextExp >= prev.expForNextLevel) {
          return {
            ...prev,
            level: prev.level + 1,
            exp: nextExp - prev.expForNextLevel,
            expForNextLevel: Math.round(prev.expForNextLevel * 1.4),
          };
        }
        return { ...prev, exp: nextExp };
      });
    }
  };

  // Claim Achievement Handler
  const handleClaimAchievement = (id: string) => {
    const targetAch = achievements.find((a) => a.id === id);
    if (!targetAch || !targetAch.unlocked || targetAch.claimed) return;

    setAchievements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, claimed: true } : a))
    );

    if (targetAch.rewardCoins) handleAddCoins(targetAch.rewardCoins);
    if (targetAch.rewardGems) {
      setStats((prev) => ({ ...prev, totalGems: prev.totalGems + targetAch.rewardGems }));
    }
  };

  // Update missions progress
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setTimeout(() => {
      setMissions(prev => prev.map(m => {
          if (m.claimed || m.completed) return m;
          
          let newCurrent = m.current;
          if (m.id === 'daily_pellets') newCurrent = stats.pelletsEaten;
          if (m.id === 'daily_survive') newCurrent = Math.floor(MATCH_DURATION_SECONDS - stats.currentMatchTime);

          if (newCurrent >= m.target) {
              return { ...m, current: newCurrent, completed: true };
          }
          return { ...m, current: newCurrent };
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, [stats.pelletsEaten, stats.currentMatchTime, gameState]);

  const hasClaimableMissions =
    missions.some((m) => m.completed && !m.claimed) ||
    achievements.some((a) => a.unlocked && !a.claimed);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {hasMounted && (
        <>
          {/* Modern HUD Overlay */}
          <HUD
            stats={stats}
            gameState={gameState}
            countdownSec={countdownSec}
            onStartMatch={handleStartMatch}
            isPaused={isPaused}
            onTogglePause={togglePause}
            onOpenTycoon={() => setIsTycoonOpen(true)}
            onOpenSkins={() => setIsSkinsOpen(true)}
            onOpenSpin={() => setIsSpinOpen(true)}
            onOpenMissions={() => setIsMissionsOpen(true)}
            onOpenStages={() => setIsStagesOpen(true)}
            floatingTexts={floatingTexts}
            radarData={radarData}
            leaderboardData={leaderboardData}
            killFeedData={killFeedData}
            hasClaimableMissions={hasClaimableMissions}
            onTeleportBossHunter={() => engineRef.current?.trigger11MinuteTeleport()}
            lastMatchResults={lastMatchResults}
            onExitToMenu={handleBackToMenu}
          />

          {/* Virtual Joystick for Touch / Mobile */}
          {gameState === 'playing' && (
            <VirtualJoystick
              onMove={handleJoystickMove}
              onBoostChange={handleBoostChange}
              disabled={
                isPaused ||
                isTycoonOpen ||
                isSkinsOpen ||
                isStagesOpen ||
                isSpinOpen ||
                isMissionsOpen ||
                matchResult.isGameOver
              }
            />
          )}

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
            gems={stats.totalGems}
            onDeductCoins={handleDeductCoins}
            onDeductGems={handleDeductGems}
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

          <MissionsAchievementsModal
            isOpen={isMissionsOpen}
            onClose={() => setIsMissionsOpen(false)}
            missions={missions}
            achievements={achievements}
            onClaimMission={handleClaimMission}
            onClaimAchievement={handleClaimAchievement}
          />

          <GameOverModal
            isOpen={gameState === 'gameover'}
            isVictory={matchResult.isVictory}
            stats={stats}
            onPlayAgain={handlePlayAgain}
            onOpenTycoon={() => setIsTycoonOpen(true)}
            onOpenSpin={() => setIsSpinOpen(true)}
            onBackToMenu={handleBackToMenu}
            onNextStage={handleNextStage}
          />

          <MultiplayerModLobbyModal
            isOpen={isMultiplayerOpen || isModsOpen}
            onClose={() => {
              setIsMultiplayerOpen(false);
              setIsModsOpen(false);
            }}
            onStartMultiplayerMatch={(room) => {
              setIsMultiplayerOpen(false);
              setIsModsOpen(false);
              handlePlayAgain();
            }}
            skinId={stats.equippedSkinId}
          />
        </>
      )}
    </div>
  );
}
