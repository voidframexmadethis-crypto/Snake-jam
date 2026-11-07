'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  X,
  Tv,
  Check,
  Lock,
  Sparkles,
  Crown,
  Play,
  Gift,
  Coins,
  Layers,
  Award,
  Zap,
  TrendingUp,
  RotateCw,
} from 'lucide-react';
import {
  INITIAL_SKINS,
  COLLECTION_SETS,
  SkinDefinition,
  SkinCategory,
  SkinRarity,
  GACHA_BOX_COST,
} from '@/lib/gameTypes';
import { soundManager } from '@/lib/audio';
import {
  buildSnakeProceduralHead,
  buildSnakeSegmentMesh,
} from '@/lib/snakeModelBuilder';

interface SkinsWardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equippedSkinId: string;
  onEquipSkin: (skinId: string) => void;
  unlockedSkinIds: string[];
  onUnlockSkin: (skinId: string) => void;
  coins?: number;
  onDeductCoins?: (amount: number) => void;
  onAddCoins?: (amount: number) => void;
  playerLevel?: number;
  currentStageId?: number;
}

// -------------------------------------------------------------
// INTERACTIVE 3D PREVIEW CANVAS (THE GARAGE STAGE)
// -------------------------------------------------------------
function Skin3DPreviewCanvas({ skin }: { skin: SkinDefinition }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const rotationVelocityRef = useRef(0.008);
  const targetRotationYRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 5.2);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);

    // Subtle sci-fi pedestal platform
    const platformGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.2, 32);
    const diskMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.position.y = -0.55;
    disk.receiveShadow = true;
    platformGroup.add(disk);

    // Glowing rim on platform
    const ringGeo = new THREE.TorusGeometry(2.3, 0.05, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: skin.glowColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.45;
    platformGroup.add(ring);
    scene.add(platformGroup);

    // Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(4, 8, 6);
    scene.add(dirLight);

    const glowLight = new THREE.PointLight(skin.glowColor, 3.5, 8);
    glowLight.position.set(0, 1.8, 1.5);
    scene.add(glowLight);

    // Build 3D Snake Model: Head + 4 segments in S-curve posture
    const snakeGroup = new THREE.Group();
    const { headGroup } = buildSnakeProceduralHead(
      skin.primaryColor,
      skin.secondaryColor,
      skin.glowColor,
      skin.modelType,
      false,
      1.15
    );
    headGroup.position.set(0, 0, 1.0);
    headGroup.rotation.y = Math.PI; // Face forward towards camera
    snakeGroup.add(headGroup);

    const segmentOffsets = [
      { x: 0.1, z: 0.0, rotY: 0.15 },
      { x: 0.45, z: -0.9, rotY: 0.4 },
      { x: 0.35, z: -1.8, rotY: -0.2 },
      { x: -0.15, z: -2.7, rotY: -0.4 },
      { x: -0.5, z: -3.5, rotY: 0.1 },
    ];

    segmentOffsets.forEach((off, idx) => {
      const segMesh = buildSnakeSegmentMesh(
        skin.primaryColor,
        skin.secondaryColor,
        skin.glowColor,
        idx,
        skin.modelType,
        false,
        1.05
      );
      segMesh.position.set(off.x, 0.1, off.z);
      segMesh.rotation.y = off.rotY;
      snakeGroup.add(segMesh);
    });

    // Center snake around pedestal origin
    snakeGroup.position.set(0, -0.15, 0.4);
    scene.add(snakeGroup);

    // Mouse / Touch Drag Handlers
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      lastMouseXRef.current = clientX;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - lastMouseXRef.current;
      targetRotationYRef.current += deltaX * 0.015;
      lastMouseXRef.current = clientX;
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const elem = renderer.domElement;
    elem.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    elem.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    // Animation loop
    let animId = 0;
    let clock = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.016;

      if (!isDraggingRef.current) {
        targetRotationYRef.current += rotationVelocityRef.current;
      }

      snakeGroup.rotation.y = THREE.MathUtils.damp(
        snakeGroup.rotation.y,
        targetRotationYRef.current,
        8,
        0.016
      );

      // Subtle breathing float oscillation
      snakeGroup.position.y = -0.15 + Math.sin(clock * 2.2) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      elem.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      elem.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [skin]);

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 overflow-hidden flex items-center justify-center">
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 pointer-events-none text-[11px] font-semibold text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded-full border border-slate-700/60 backdrop-blur-sm">
        <RotateCw className="h-3 w-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Drag to rotate 360°</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN SKINS WARDROBE / GARAGE MODAL
// -------------------------------------------------------------
export default function SkinsWardrobeModal({
  isOpen,
  onClose,
  equippedSkinId,
  onEquipSkin,
  unlockedSkinIds,
  onUnlockSkin,
  coins = 0,
  onDeductCoins,
  onAddCoins,
  playerLevel = 1,
  currentStageId = 1,
}: SkinsWardrobeModalProps) {
  // Navigation & Selected Skin
  const [selectedCategory, setSelectedCategory] = useState<SkinCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<SkinRarity | 'all'>('all');
  const [selectedPreviewSkinId, setSelectedPreviewSkinId] = useState<string | null>(null);

  // Ad-Watch State
  const [adWatchingSkinId, setAdWatchingSkinId] = useState<string | null>(null);
  const [adCountdown, setAdCountdown] = useState<number>(5);

  // Gacha / Mystery Box State
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [gachaStep, setGachaStep] = useState<'idle' | 'shaking' | 'burst' | 'reveal'>('idle');
  const [gachaResultSkin, setGachaResultSkin] = useState<SkinDefinition | null>(null);
  const [gachaIsDuplicate, setGachaIsDuplicate] = useState(false);

  // Derived active preview skin (defaults to equippedSkinId)
  const activePreviewSkinId = selectedPreviewSkinId || equippedSkinId;

  // Active preview skin definition
  const previewSkin =
    INITIAL_SKINS.find((s) => s.id === activePreviewSkinId) ||
    INITIAL_SKINS.find((s) => s.id === equippedSkinId) ||
    INITIAL_SKINS[0];

  // Simulated 5-second reward ad countdown
  useEffect(() => {
    if (!adWatchingSkinId) return;

    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onUnlockSkin(adWatchingSkinId);
          onEquipSkin(adWatchingSkinId);
          soundManager.playSpinWin();
          setAdWatchingSkinId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adWatchingSkinId, onUnlockSkin, onEquipSkin]);

  const startAdWatch = (skinId: string) => {
    setAdWatchingSkinId(skinId);
    setAdCountdown(5);
  };

  // Soft currency purchase handler
  const handleBuyWithCoins = (skin: SkinDefinition) => {
    if (!skin.coinPrice) return;
    if (coins < skin.coinPrice) {
      soundManager.playWallHit();
      return;
    }
    onDeductCoins?.(skin.coinPrice);
    onUnlockSkin(skin.id);
    onEquipSkin(skin.id);
    soundManager.playEquip();
  };

  // Gacha Mystery Box opening
  const handleOpenMysteryBox = () => {
    if (coins < GACHA_BOX_COST) {
      soundManager.playWallHit();
      return;
    }

    onDeductCoins?.(GACHA_BOX_COST);
    setIsGachaModalOpen(true);
    setGachaStep('shaking');
    soundManager.playGachaOpen();

    // Roll random skin with rarity weighting:
    // Common: 45%, Rare: 30%, Epic: 18%, Legendary: 7%
    const rand = Math.random();
    let targetRarity: SkinRarity = 'common';
    if (rand < 0.07) targetRarity = 'legendary';
    else if (rand < 0.25) targetRarity = 'epic';
    else if (rand < 0.55) targetRarity = 'rare';
    else targetRarity = 'common';

    const candidates = INITIAL_SKINS.filter((s) => s.rarity === targetRarity);
    const rolled =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      INITIAL_SKINS[Math.floor(Math.random() * INITIAL_SKINS.length)];

    const isDup = unlockedSkinIds.includes(rolled.id);
    setGachaResultSkin(rolled);
    setGachaIsDuplicate(isDup);

    // Sequence timing
    setTimeout(() => {
      setGachaStep('burst');
    }, 1100);

    setTimeout(() => {
      setGachaStep('reveal');
      if (rolled.rarity === 'legendary' || rolled.rarity === 'epic') {
        soundManager.playGachaLegendary();
      } else {
        soundManager.playSpinWin();
      }

      if (isDup) {
        // Refund 200 coins
        onAddCoins?.(200);
      } else {
        onUnlockSkin(rolled.id);
      }
    }, 1900);
  };

  // Filter skins
  const filteredSkins = INITIAL_SKINS.filter((s) => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (selectedRarity !== 'all' && s.rarity !== selectedRarity) return false;
    return true;
  });

  // Calculate active collection perk for the currently selected category
  const activeCategorySet = COLLECTION_SETS.find((cs) => cs.id === selectedCategory);
  const categorySkins = activeCategorySet
    ? INITIAL_SKINS.filter((s) => s.category === activeCategorySet.id)
    : [];
  const categoryOwnedCount = categorySkins.filter((s) =>
    unlockedSkinIds.includes(s.id)
  ).length;
  const isCategoryComplete =
    categorySkins.length > 0 && categoryOwnedCount === categorySkins.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[900px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-slate-100">
                  SERPENT WARDROBE & GARAGE
                </h2>
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  3D Preview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Collect theme sets to activate permanent passive stat bonuses!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Coins Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-black shadow-inner">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>{coins.toLocaleString()}</span>
            </div>

            {/* Mystery Box CTA Button */}
            <button
              onClick={handleOpenMysteryBox}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-slate-100 text-xs font-extrabold hover:brightness-110 active:scale-95 transition shadow-md shadow-purple-500/20"
            >
              <Gift className="h-4 w-4 text-amber-300 animate-bounce" />
              <span className="hidden sm:inline">Mystery Crate</span>
              <span className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px] text-amber-300">
                {GACHA_BOX_COST} 🪙
              </span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Left 3D Stage & Details (40%), Right Catalog (60%) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT: 3D Stage & Active Skin Stats */}
          <div className="w-full md:w-[42%] border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto bg-slate-950/30">
            <div>
              {/* 3D Interactive Stage Canvas */}
              <div className="h-48 sm:h-64 mb-3">
                <Skin3DPreviewCanvas skin={previewSkin} />
              </div>

              {/* Skin Title & Rarity Card */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-black text-slate-100">
                    {previewSkin.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                        previewSkin.rarity === 'legendary'
                          ? 'border-amber-500/60 bg-amber-950/70 text-amber-300'
                          : previewSkin.rarity === 'epic'
                          ? 'border-purple-500/60 bg-purple-950/70 text-purple-300'
                          : previewSkin.rarity === 'rare'
                          ? 'border-cyan-500/60 bg-cyan-950/70 text-cyan-300'
                          : 'border-slate-600 bg-slate-800/80 text-emerald-400'
                      }`}
                    >
                      {previewSkin.rarity}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      {previewSkin.modelType} Class
                    </span>
                  </div>
                </div>

                {/* Color swatches */}
                <div className="flex items-center -space-x-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <div
                    className="h-5 w-5 rounded-full border border-slate-900 shadow"
                    style={{ backgroundColor: previewSkin.primaryColor }}
                    title="Primary"
                  />
                  <div
                    className="h-5 w-5 rounded-full border border-slate-900 shadow"
                    style={{ backgroundColor: previewSkin.secondaryColor }}
                    title="Secondary"
                  />
                  <div
                    className="h-5 w-5 rounded-full border border-slate-900 shadow"
                    style={{ backgroundColor: previewSkin.glowColor }}
                    title="Energy Glow"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {previewSkin.description}
              </p>

              {/* Stat Bonus Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">
                    Skin Perk:
                  </span>
                </div>
                <span className="text-xs font-black text-cyan-300">
                  {previewSkin.statBonus}
                </span>
              </div>
            </div>

            {/* Bottom Action for Selected Skin */}
            <div className="pt-2">
              {equippedSkinId === previewSkin.id ? (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-black">
                  <Check className="h-4 w-4" /> CURRENTLY EQUIPPED
                </div>
              ) : unlockedSkinIds.includes(previewSkin.id) ? (
                <button
                  onClick={() => {
                    onEquipSkin(previewSkin.id);
                    soundManager.playEquip();
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition active:scale-98 shadow-lg shadow-cyan-500/20"
                >
                  Equip This Skin
                </button>
              ) : previewSkin.unlockType === 'coins' && previewSkin.coinPrice ? (
                <button
                  onClick={() => handleBuyWithCoins(previewSkin)}
                  disabled={coins < previewSkin.coinPrice}
                  className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                    coins >= previewSkin.coinPrice
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-98 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Coins className="h-4 w-4" />
                  {coins >= previewSkin.coinPrice
                    ? `Buy for ${previewSkin.coinPrice} 🪙`
                    : `Need ${previewSkin.coinPrice - coins} More 🪙`}
                </button>
              ) : previewSkin.unlockType === 'ad_watch' ? (
                <button
                  onClick={() => startAdWatch(previewSkin.id)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-slate-100 text-xs font-black flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20"
                >
                  <Tv className="h-4 w-4" />
                  Watch 5s Ad to Unlock Free!
                </button>
              ) : previewSkin.unlockType === 'milestone' && previewSkin.requiredLevel ? (
                <div className="w-full py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 text-center">
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  {playerLevel >= previewSkin.requiredLevel ? (
                    <button
                      onClick={() => {
                        onUnlockSkin(previewSkin.id);
                        onEquipSkin(previewSkin.id);
                        soundManager.playEquip();
                      }}
                      className="text-cyan-400 underline font-black"
                    >
                      Milestone Reached! Claim & Equip
                    </button>
                  ) : (
                    <span>
                      Requires Player Level {previewSkin.requiredLevel} (You: Lvl {playerLevel})
                    </span>
                  )}
                </div>
              ) : previewSkin.unlockType === 'boss' && previewSkin.requiredBossStage ? (
                <div className="w-full py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 text-center">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  {currentStageId > previewSkin.requiredBossStage ? (
                    <button
                      onClick={() => {
                        onUnlockSkin(previewSkin.id);
                        onEquipSkin(previewSkin.id);
                        soundManager.playEquip();
                      }}
                      className="text-amber-400 underline font-black"
                    >
                      Boss Slain! Claim & Equip
                    </button>
                  ) : (
                    <span>
                      Defeat Stage {previewSkin.requiredBossStage} Boss in Arena
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleOpenMysteryBox}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-slate-100 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  <Gift className="h-4 w-4 text-amber-300" />
                  Unlock in Mystery Crate (300 🪙)
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Categories, Set Perks Bar, and Skin Grid (58%) */}
          <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
            {/* Themed Categories Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-slate-100 text-slate-950 shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                All Skins ({INITIAL_SKINS.length})
              </button>

              {COLLECTION_SETS.map((cs) => {
                const isSelected = selectedCategory === cs.id;
                const setSkins = INITIAL_SKINS.filter((s) => s.category === cs.id);
                const ownedCount = setSkins.filter((s) =>
                  unlockedSkinIds.includes(s.id)
                ).length;
                const isComplete = ownedCount === setSkins.length;

                return (
                  <button
                    key={cs.id}
                    onClick={() => setSelectedCategory(cs.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : isComplete
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{cs.emoji}</span>
                    <span>{cs.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-slate-950/40 text-slate-900'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {ownedCount}/{setSkins.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Collection Set Perk Banner (Shown when a category is selected) */}
            {activeCategorySet && (
              <div
                className={`my-2 p-3 rounded-2xl border transition shrink-0 ${
                  isCategoryComplete
                    ? 'bg-emerald-950/50 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{activeCategorySet.emoji}</span>
                    <span className="text-xs font-black text-slate-200">
                      {activeCategorySet.name} Collection Perk:
                    </span>
                    <span className="text-xs font-extrabold text-cyan-300">
                      {activeCategorySet.perkTitle}
                    </span>
                  </div>

                  {isCategoryComplete ? (
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      <Check className="h-3 w-3" /> SET PERK ACTIVE
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-400">
                      {categoryOwnedCount}/{categorySkins.length} Owned
                    </span>
                  )}
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCategoryComplete ? 'bg-emerald-400' : 'bg-cyan-500'
                    }`}
                    style={{
                      width: `${(categoryOwnedCount / categorySkins.length) * 100}%`,
                    }}
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  {activeCategorySet.perkDescription}
                </p>
              </div>
            )}

            {/* Rarity Filter Chips */}
            <div className="flex items-center gap-1.5 py-1 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">
                Rarity:
              </span>
              {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(
                (rarity) => (
                  <button
                    key={rarity}
                    onClick={() => setSelectedRarity(rarity)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold capitalize transition ${
                      selectedRarity === rarity
                        ? 'bg-slate-200 text-slate-950'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rarity}
                  </button>
                )
              )}
            </div>

            {/* Skins Grid */}
            <div className="flex-1 overflow-y-auto pr-1 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredSkins.map((skin) => {
                const isUnlocked = unlockedSkinIds.includes(skin.id);
                const isEquipped = equippedSkinId === skin.id;
                const isSelected = activePreviewSkinId === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => setSelectedPreviewSkinId(skin.id)}
                    className={`relative cursor-pointer rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-slate-800/90 ring-2 ring-cyan-500/30'
                        : isEquipped
                        ? 'border-emerald-500/60 bg-slate-900/80'
                        : isUnlocked
                        ? 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                        : 'border-slate-800 bg-slate-950/60 opacity-75 hover:opacity-90'
                    }`}
                  >
                    <div>
                      {/* Card Top: Palette + Name + Badges */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            <div
                              className="h-5 w-5 rounded-full border border-slate-900 shadow"
                              style={{ backgroundColor: skin.primaryColor }}
                            />
                            <div
                              className="h-5 w-5 rounded-full border border-slate-900 shadow"
                              style={{ backgroundColor: skin.secondaryColor }}
                            />
                            <div
                              className="h-5 w-5 rounded-full border border-slate-900 shadow"
                              style={{ backgroundColor: skin.glowColor }}
                            />
                          </div>
                          <span className="font-extrabold text-xs text-slate-200 truncate max-w-[100px]">
                            {skin.name}
                          </span>
                        </div>

                        {/* Rarity Tag */}
                        <span
                          className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded border ${
                            skin.rarity === 'legendary'
                              ? 'border-amber-500/60 bg-amber-950/70 text-amber-300'
                              : skin.rarity === 'epic'
                              ? 'border-purple-500/60 bg-purple-950/70 text-purple-300'
                              : skin.rarity === 'rare'
                              ? 'border-cyan-500/60 bg-cyan-950/70 text-cyan-300'
                              : 'border-slate-600 bg-slate-800 text-emerald-400'
                          }`}
                        >
                          {skin.rarity}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight mb-2">
                        {skin.description}
                      </p>
                    </div>

                    {/* Card Bottom: Status Pill */}
                    <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400">
                        {skin.statBonus}
                      </span>

                      {isEquipped ? (
                        <span className="text-[10px] font-black text-cyan-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400">
                          Owned
                        </span>
                      ) : skin.unlockType === 'coins' ? (
                        <span className="text-[10px] font-black text-amber-400">
                          {skin.coinPrice} 🪙
                        </span>
                      ) : skin.unlockType === 'ad_watch' ? (
                        <span className="text-[10px] font-black text-cyan-300 flex items-center gap-0.5">
                          <Tv className="h-2.5 w-2.5" /> Free Ad
                        </span>
                      ) : skin.unlockType === 'milestone' ? (
                        <span className="text-[10px] font-bold text-slate-400">
                          Lvl {skin.requiredLevel}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-purple-400">
                          Boss/Crate
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SIMULATED AD VIDEO PLAYER OVERLAY */}
        {/* ========================================================= */}
        {adWatchingSkinId && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
            <div className="w-full max-w-sm rounded-3xl border border-cyan-500/40 bg-slate-900 p-6 shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-950 border border-cyan-500 text-cyan-400 mb-4 animate-pulse">
                <Play className="h-7 w-7" />
              </div>
              <h3 className="text-base font-black text-slate-100 mb-1">
                Reward Sponsor Broadcast
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Thank you for playing Snake Tycoon Arena! Your free skin will unlock in:
              </p>

              {/* Countdown circle */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-cyan-400 text-2xl font-black text-cyan-300 mb-4">
                {adCountdown}s
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* GACHA / MYSTERY BOX DRAW MODAL */}
        {/* ========================================================= */}
        {isGachaModalOpen && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center">
            <div className="relative w-full max-w-md rounded-3xl border border-purple-500/50 bg-slate-900 p-6 shadow-2xl overflow-hidden">
              {/* Background radiant aura */}
              <div
                className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{
                  backgroundColor:
                    gachaResultSkin?.glowColor || '#a855f7',
                }}
              />

              {/* Step 1 & 2: Shaking Crate & Light Burst */}
              {(gachaStep === 'shaking' || gachaStep === 'burst') && (
                <div className="py-8 flex flex-col items-center">
                  <div
                    className={`relative mx-auto flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-800 via-indigo-900 to-slate-900 border-2 border-amber-400 shadow-2xl ${
                      gachaStep === 'shaking'
                        ? 'animate-bounce'
                        : 'scale-125 transition-transform duration-500'
                    }`}
                  >
                    <Gift className="h-14 w-14 text-amber-300 drop-shadow" />
                    {gachaStep === 'burst' && (
                      <div className="absolute inset-0 rounded-3xl bg-white/40 animate-ping" />
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-100 mt-6 tracking-wide animate-pulse">
                    {gachaStep === 'shaking'
                      ? 'UNLOCKING MYSTERY CRATE...'
                      : 'CONVERGING COSMIC ENERGY!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Channeling arena loot algorithms...
                  </p>
                </div>
              )}

              {/* Step 3: Skin Reveal */}
              {gachaStep === 'reveal' && gachaResultSkin && (
                <div className="py-4 flex flex-col items-center animate-in zoom-in-90 duration-300">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border mb-3 ${
                      gachaResultSkin.rarity === 'legendary'
                        ? 'border-amber-500 bg-amber-950/80 text-amber-300 shadow-lg shadow-amber-500/20'
                        : gachaResultSkin.rarity === 'epic'
                        ? 'border-purple-500 bg-purple-950/80 text-purple-300'
                        : gachaResultSkin.rarity === 'rare'
                        ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300'
                        : 'border-slate-600 bg-slate-800 text-emerald-400'
                    }`}
                  >
                    ★ {gachaResultSkin.rarity} DROP ★
                  </span>

                  {/* Visual Palettes */}
                  <div className="flex items-center -space-x-2 my-2">
                    <div
                      className="h-10 w-10 rounded-full border-2 border-slate-900 shadow-lg"
                      style={{ backgroundColor: gachaResultSkin.primaryColor }}
                    />
                    <div
                      className="h-10 w-10 rounded-full border-2 border-slate-900 shadow-lg"
                      style={{ backgroundColor: gachaResultSkin.secondaryColor }}
                    />
                    <div
                      className="h-10 w-10 rounded-full border-2 border-slate-900 shadow-lg"
                      style={{ backgroundColor: gachaResultSkin.glowColor }}
                    />
                  </div>

                  <h3 className="text-xl font-black text-slate-100 mt-2">
                    {gachaResultSkin.name}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-xs mt-1">
                    {gachaResultSkin.description}
                  </p>

                  <div className="my-3 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-cyan-300">
                    Perk: {gachaResultSkin.statBonus}
                  </div>

                  {/* Duplicate Refund Notice or New Unlock Banner */}
                  {gachaIsDuplicate ? (
                    <div className="mb-4 rounded-xl bg-amber-950/60 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300">
                      Already Owned! Duplicate Protection Refunded +200 🪙 Coins.
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 text-xs font-black text-emerald-300">
                      ✨ NEW SKIN ADDED TO WARDROBE!
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 w-full">
                    <button
                      onClick={() => {
                        onEquipSkin(gachaResultSkin.id);
                        soundManager.playEquip();
                        setIsGachaModalOpen(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition active:scale-98 shadow-md"
                    >
                      Equip Now
                    </button>

                    <button
                      onClick={handleOpenMysteryBox}
                      disabled={coins < GACHA_BOX_COST}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-100 text-xs font-black transition active:scale-98 shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Roll Again ({GACHA_BOX_COST} 🪙)
                    </button>
                  </div>

                  <button
                    onClick={() => setIsGachaModalOpen(false)}
                    className="mt-3 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Back to Wardrobe
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
