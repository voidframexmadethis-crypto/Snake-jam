'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Award,
  RotateCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cpu,
  Layers,
  Filter,
} from 'lucide-react';
import {
  TOP_CATEGORIES,
  COLLECTION_SETS,
  SkinDefinition,
  SkinCategory,
  SkinRarity,
  GACHA_BOX_COST,
  TOTAL_SKINS_COUNT,
  PAGE_SIZE,
  getSkinById,
  querySkinsPage,
} from '@/lib/gameTypes';
import { soundManager } from '@/lib/audio';
import {
  buildSnakeProceduralHead,
  buildSnakeSegmentMesh,
} from '@/lib/snakeModelBuilder';
import { addressableManager } from '@/lib/addressables';

interface SkinsWardrobeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equippedSkinId: string;
  onEquipSkin: (skinId: string) => void;
  unlockedSkinIds: string[];
  onUnlockSkin: (skinId: string) => void;
  coins?: number;
  gems?: number;
  onDeductCoins?: (amount: number) => void;
  onDeductGems?: (amount: number) => void;
  onAddCoins?: (amount: number) => void;
  playerLevel?: number;
  currentStageId?: number;
}

// -------------------------------------------------------------
// ASYNCHRONOUS ADDRESSABLES 3D PREVIEW CANVAS (THE GARAGE STAGE)
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

      // Strict Addressables Unload & GPU VRAM disposal
      addressableManager.unloadAssetGroup(snakeGroup);
      addressableManager.unloadAssetGroup(platformGroup);
      scene.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [skin]);

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 overflow-hidden flex items-center justify-center">
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 pointer-events-none text-[11px] font-semibold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700/60 backdrop-blur-sm shadow-md">
        <RotateCw className="h-3 w-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Drag to rotate 360°</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN SKINS WARDROBE / 100,000+ SHOP MODAL
// -------------------------------------------------------------
export default function SkinsWardrobeModal({
  isOpen,
  onClose,
  equippedSkinId,
  onEquipSkin,
  unlockedSkinIds,
  onUnlockSkin,
  coins = 0,
  gems = 0,
  onDeductCoins,
  onDeductGems,
  onAddCoins,
  playerLevel = 1,
  currentStageId = 1,
}: SkinsWardrobeModalProps) {
  // Navigation & Category Filtering
  const [selectedCategory, setSelectedCategory] = useState<SkinCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<SkinRarity | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'coins' | 'gems' | 'ads'>('all');
  const [searchQuery, setSearchBarQuery] = useState('');
  const [selectedPreviewSkinId, setSelectedPreviewSkinId] = useState<string | null>(null);

  // Pagination state (50 items per view)
  const [page, setPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  // Virtual Recycler View state (visiblePoolSize = 20)
  const recyclerScrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [columnCount, setColumnCount] = useState(3);

  // Ad-Watch State
  const [adWatchingSkinId, setAdWatchingSkinId] = useState<string | null>(null);
  const [adCountdown, setAdCountdown] = useState<number>(5);

  // Gacha / Mystery Box State
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);
  const [gachaStep, setGachaStep] = useState<'idle' | 'shaking' | 'burst' | 'reveal'>('idle');
  const [gachaResultSkin, setGachaResultSkin] = useState<SkinDefinition | null>(null);
  const [gachaIsDuplicate, setGachaIsDuplicate] = useState(false);

  // Explicit page change handler to prevent cascading renders
  const changePage = (newPage: number) => {
    setPage(newPage);
    setJumpPageInput(String(newPage));
    if (recyclerScrollRef.current) {
      recyclerScrollRef.current.scrollTop = 0;
    }
  };

  const handleSelectCategory = (catId: SkinCategory | 'all') => {
    setSelectedCategory(catId);
    changePage(1);
  };

  const handleSelectRarity = (rar: SkinRarity | 'all') => {
    setSelectedRarity(rar);
    changePage(1);
  };

  const handleSelectCurrency = (cur: 'all' | 'coins' | 'gems' | 'ads') => {
    setCurrencyFilter(cur);
    changePage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchBarQuery(val);
    changePage(1);
  };

  // Dynamic column calculation for Virtual Recycler Grid
  useEffect(() => {
    const updateColumns = () => {
      if (!recyclerScrollRef.current) return;
      const w = recyclerScrollRef.current.clientWidth;
      if (w < 480) setColumnCount(1);
      else if (w < 720) setColumnCount(2);
      else setColumnCount(3);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [isOpen]);

  // High-speed deterministic 50-item query
  const queryResult = useMemo(() => {
    return querySkinsPage({
      category: selectedCategory,
      rarity: selectedRarity,
      searchQuery,
      currencyFilter,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [selectedCategory, selectedRarity, searchQuery, currencyFilter, page]);

  // Derived active preview skin (defaults to equippedSkinId)
  const activePreviewSkinId = selectedPreviewSkinId || equippedSkinId;
  const previewSkin = useMemo(() => {
    return getSkinById(activePreviewSkinId);
  }, [activePreviewSkinId]);

  // Addressables & Recycler View Slicing (visiblePoolSize = 20 active cards maximum)
  const CARD_ROW_HEIGHT = 114;
  const totalItems = queryResult.skins.length;
  const totalRows = Math.ceil(totalItems / columnCount);
  const visibleRowStart = Math.max(0, Math.floor(scrollTop / CARD_ROW_HEIGHT) - 1);
  const visibleRowEnd = Math.min(totalRows, Math.ceil((scrollTop + 460) / CARD_ROW_HEIGHT) + 1);

  const startIndex = visibleRowStart * columnCount;
  const endIndex = Math.min(totalItems, visibleRowEnd * columnCount);

  // Strictly cap the active rendered slots to 20 maximum as per Unity C# Recycler View specification!
  const visibleSkins = queryResult.skins.slice(
    startIndex,
    Math.min(startIndex + 20, endIndex)
  );

  const topPadding = visibleRowStart * CARD_ROW_HEIGHT;
  const bottomPadding = Math.max(0, (totalRows - visibleRowEnd) * CARD_ROW_HEIGHT);

  // Simulated 5-second reward ad countdown
  useEffect(() => {
    if (!adWatchingSkinId) return;

    soundManager.playDailySpinTick();
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
        soundManager.playDailySpinTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adWatchingSkinId, onUnlockSkin, onEquipSkin]);

  const startAdWatch = (skinId: string) => {
    setAdCountdown(5);
    setAdWatchingSkinId(skinId);
  };

  // Soft currency purchase handler (coins)
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

  // Hard currency purchase handler (diamonds/gems awarded from 3-4 kills)
  const handleBuyWithGems = (skin: SkinDefinition) => {
    if (!skin.gemPrice) return;
    if (gems < skin.gemPrice) {
      soundManager.playWallHit();
      return;
    }
    onDeductGems?.(skin.gemPrice);
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

    const rand = Math.random();
    let targetRarity: SkinRarity = 'common';
    if (rand < 0.08) targetRarity = 'legendary';
    else if (rand < 0.25) targetRarity = 'epic';
    else if (rand < 0.55) targetRarity = 'rare';
    else targetRarity = 'common';

    // Random roll from query pool or procedural
    const randomIdx = Math.floor(Math.random() * 200) + 1;
    const rolled = getSkinById(`proc_${randomIdx}`);

    const isDup = unlockedSkinIds.includes(rolled.id);
    setGachaResultSkin(rolled);
    setGachaIsDuplicate(isDup);

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
        onAddCoins?.(200);
      } else {
        onUnlockSkin(rolled.id);
      }
    }, 1900);
  };

  // Handle direct page jump submission
  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= queryResult.totalPages) {
      changePage(target);
    } else {
      setJumpPageInput(String(page));
    }
  };

  // Left & Right 3D Stage preview arrows handler
  const handlePreviewPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const skinsList = queryResult.skins;
    if (skinsList.length === 0) return;
    const idx = skinsList.findIndex((s) => s.id === previewSkin.id);
    const prevIdx = (idx - 1 + skinsList.length) % skinsList.length;
    setSelectedPreviewSkinId(skinsList[prevIdx].id);
  };

  const handlePreviewNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const skinsList = queryResult.skins;
    if (skinsList.length === 0) return;
    const idx = skinsList.findIndex((s) => s.id === previewSkin.id);
    const nextIdx = (idx + 1) % skinsList.length;
    setSelectedPreviewSkinId(skinsList[nextIdx].id);
  };

  // Calculate active collection set perk for the selected category
  const activeCategorySet = COLLECTION_SETS.find((cs) => cs.id === selectedCategory);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl h-[92vh] max-h-[920px] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col cursor-default"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-slate-100">
                  100,000+ SERPENT SKIN SHOP
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  Addressables & Recycler UI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Preview with Left/Right arrows · Buy with Coins 🪙 or Diamonds 💎 (from 3–4 kills)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-black shadow-inner">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>{coins.toLocaleString()}</span>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-black shadow-inner"
                title="Diamonds are awarded when achieving 3-4 kills in match combat!"
              >
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>{gems.toLocaleString()} 💎</span>
              </div>
            </div>

            {/* Mystery Box CTA Button */}
            <button
              onClick={handleOpenMysteryBox}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-slate-100 text-xs font-extrabold hover:brightness-110 active:scale-95 transition shadow-md shadow-purple-500/20"
            >
              <Gift className="h-4 w-4 text-amber-300 animate-bounce" />
              <span>Mystery Crate</span>
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

        {/* Content Layout: Left 3D Stage & Details (40%), Right Catalog & Recycler Grid (60%) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* ========================================================= */}
          {/* LEFT: 3D Stage & Active Skin Stats with Left/Right Arrows */}
          {/* ========================================================= */}
          <div className="w-full md:w-[40%] border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto bg-slate-950/30">
            <div>
              {/* 3D Interactive Stage Canvas with Prominent Preview Arrows */}
              <div className="relative h-48 sm:h-64 mb-3 rounded-2xl overflow-hidden shadow-inner border border-slate-800">
                <Skin3DPreviewCanvas skin={previewSkin} />

                {/* Left Preview Arrow Button */}
                <button
                  onClick={handlePreviewPrev}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-slate-100 shadow-xl transition-all active:scale-90 flex items-center justify-center group"
                  title="Preview Previous Skin"
                >
                  <ChevronLeft className="h-5 w-5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                {/* Right Preview Arrow Button */}
                <button
                  onClick={handlePreviewNext}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-slate-100 shadow-xl transition-all active:scale-90 flex items-center justify-center group"
                  title="Preview Next Skin"
                >
                  <ChevronRight className="h-5 w-5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Currency Badge on Stage Overlay */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-700 backdrop-blur-sm text-xs font-black shadow-lg">
                  {previewSkin.coinPrice ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" /> {previewSkin.coinPrice.toLocaleString()} 🪙
                    </span>
                  ) : previewSkin.gemPrice ? (
                    <span className="text-cyan-300 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> {previewSkin.gemPrice} 💎
                    </span>
                  ) : previewSkin.unlockType === 'ad_watch' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Tv className="h-3.5 w-3.5" /> Free Ad
                    </span>
                  ) : (
                    <span className="text-purple-300">Milestone</span>
                  )}
                </div>
              </div>

              {/* Skin Title & Rarity Card */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-100">
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
                      {previewSkin.modelType} Class · {previewSkin.category}
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
                    Passive Perk:
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
                <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-black shadow-inner">
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
              ) : previewSkin.gemPrice ? (
                <button
                  onClick={() => handleBuyWithGems(previewSkin)}
                  disabled={gems < previewSkin.gemPrice}
                  className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                    gems >= previewSkin.gemPrice
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 active:scale-98 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {gems >= previewSkin.gemPrice
                    ? `Buy for ${previewSkin.gemPrice} 💎 Diamonds`
                    : `Need ${previewSkin.gemPrice - gems} More 💎 (Earn via 3-4 Kills)`}
                </button>
              ) : previewSkin.coinPrice ? (
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
                    ? `Buy for ${previewSkin.coinPrice.toLocaleString()} 🪙 Coins`
                    : `Need ${(previewSkin.coinPrice - coins).toLocaleString()} More 🪙`}
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

          {/* ========================================================= */}
          {/* RIGHT: Top Categories Tabs, Filter Bar, Virtual Recycler Grid */}
          {/* ========================================================= */}
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-hidden">
            {/* Top Categories Tabs: Mythical, Creatures, Vehicles, Neon, Minimalist, etc. */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
              {TOP_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 scale-102'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-slate-950/40 text-slate-900 font-black'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {cat.totalCount.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Collection Set Perk Banner (When specific category tab is selected) */}
            {activeCategorySet && (
              <div className="my-1.5 p-2.5 rounded-2xl border border-slate-800 bg-slate-950/60 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{activeCategorySet.emoji}</span>
                  <div>
                    <span className="text-xs font-black text-slate-200 mr-2">
                      {activeCategorySet.name} Theme Perk:
                    </span>
                    <span className="text-xs font-extrabold text-cyan-300">
                      {activeCategorySet.perkTitle}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                  {activeCategorySet.perkDescription}
                </span>
              </div>
            )}

            {/* Search, Rarity, and Currency Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2 py-1.5 shrink-0">
              {/* Search Bar with instant #number jump */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search 100,000 skins by name, class, or number (e.g. Shark, Coaster, #429)..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-1.5 pl-9 pr-8 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Rarity Filter */}
              <div className="flex items-center gap-1 shrink-0">
                {(['all', 'common', 'rare', 'epic', 'legendary'] as const).map(
                  (rarity) => (
                    <button
                      key={rarity}
                      onClick={() => handleSelectRarity(rarity)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black capitalize transition ${
                        selectedRarity === rarity
                          ? 'bg-slate-200 text-slate-950 shadow'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rarity}
                    </button>
                  )
                )}
              </div>

              {/* Currency Filter */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleSelectCurrency('all')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                    currencyFilter === 'all'
                      ? 'bg-slate-200 text-slate-950'
                      : 'bg-slate-800/60 text-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleSelectCurrency('coins')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-0.5 ${
                    currencyFilter === 'coins'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-800/60 text-amber-300'
                  }`}
                >
                  🪙 Coins
                </button>
                <button
                  onClick={() => handleSelectCurrency('gems')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-0.5 ${
                    currencyFilter === 'gems'
                      ? 'bg-cyan-400 text-slate-950 font-black'
                      : 'bg-slate-800/60 text-cyan-300'
                  }`}
                  title="Diamonds awarded from 3-4 kills"
                >
                  💎 Gems
                </button>
                <button
                  onClick={() => handleSelectCurrency('ads')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-0.5 ${
                    currencyFilter === 'ads'
                      ? 'bg-emerald-400 text-slate-950 font-black'
                      : 'bg-slate-800/60 text-emerald-300'
                  }`}
                >
                  📺 Free
                </button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* VIRTUAL SCROLL RECYCLER GRID (visiblePoolSize = 20) */}
            {/* ========================================================= */}
            <div
              ref={recyclerScrollRef}
              onScroll={(e) => {
                setScrollTop(e.currentTarget.scrollTop);
                addressableManager.recordCardRecycle();
              }}
              className="flex-1 overflow-y-auto pr-1 py-1"
            >
              {queryResult.skins.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                  <Filter className="h-10 w-10 mb-2 opacity-50 text-cyan-400" />
                  <p className="text-sm font-bold text-slate-300">No skins matched your filter</p>
                  <p className="text-xs text-slate-500 mt-1">Try resetting the search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* Top Spacer for virtual scroll virtualization */}
                  {topPadding > 0 && (
                    <div
                      style={{ height: topPadding }}
                      className="col-span-full w-full pointer-events-none"
                    />
                  )}

                  {/* Active Recycled Cards (Max 20 cards active simultaneously) */}
                  {visibleSkins.map((skin) => {
                    const isUnlocked = unlockedSkinIds.includes(skin.id);
                    const isEquipped = equippedSkinId === skin.id;
                    const isSelected = activePreviewSkinId === skin.id;

                    return (
                      <div
                        key={skin.id}
                        onClick={() => setSelectedPreviewSkinId(skin.id)}
                        className={`relative cursor-pointer rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between transition-all select-none ${
                          isSelected
                            ? 'border-cyan-400 bg-slate-800/90 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                            : isEquipped
                            ? 'border-emerald-500/60 bg-slate-900/80'
                            : isUnlocked
                            ? 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                            : 'border-slate-800 bg-slate-950/60 opacity-80 hover:opacity-100 hover:border-slate-700'
                        }`}
                        style={{ height: 104 }}
                      >
                        <div>
                          {/* Card Top: Palette Swatch + Name + Badges */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <div className="flex -space-x-1 shrink-0">
                                <div
                                  className="h-4 w-4 rounded-full border border-slate-900 shadow"
                                  style={{ backgroundColor: skin.primaryColor }}
                                />
                                <div
                                  className="h-4 w-4 rounded-full border border-slate-900 shadow"
                                  style={{ backgroundColor: skin.secondaryColor }}
                                />
                                <div
                                  className="h-4 w-4 rounded-full border border-slate-900 shadow"
                                  style={{ backgroundColor: skin.glowColor }}
                                />
                              </div>
                              <span className="font-black text-xs text-slate-200 truncate">
                                {skin.name}
                              </span>
                            </div>

                            {/* Rarity Badge */}
                            <span
                              className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded border shrink-0 ${
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

                          <p className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                            {skin.description}
                          </p>
                        </div>

                        {/* Card Bottom: Perk & Price */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span className="text-[9px] font-bold text-slate-400 truncate max-w-[110px]">
                            {skin.statBonus}
                          </span>

                          {isEquipped ? (
                            <span className="text-[10px] font-black text-cyan-400 flex items-center gap-0.5">
                              <Check className="h-3 w-3" /> Equipped
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[10px] font-black text-emerald-400">
                              Owned
                            </span>
                          ) : skin.gemPrice ? (
                            <span className="text-[10px] font-black text-cyan-300 flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> {skin.gemPrice} 💎
                            </span>
                          ) : skin.coinPrice ? (
                            <span className="text-[10px] font-black text-amber-400">
                              {skin.coinPrice.toLocaleString()} 🪙
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
                              Boss Crate
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Spacer for virtual scroll virtualization */}
                  {bottomPadding > 0 && (
                    <div
                      style={{ height: bottomPadding }}
                      className="col-span-full w-full pointer-events-none"
                    />
                  )}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* CATEGORY PAGINATION CONTROLS BAR (50 ITEMS PER PAGE) */}
            {/* ========================================================= */}
            <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-950/40 px-2 py-1.5 rounded-2xl">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-extrabold text-slate-200">
                  Showing {((page - 1) * PAGE_SIZE) + 1} -{' '}
                  {Math.min(page * PAGE_SIZE, queryResult.totalCount).toLocaleString()} of{' '}
                  {queryResult.totalCount.toLocaleString()} skins
                </span>
                <span className="hidden lg:inline text-[11px] text-slate-500">
                  (Recycler: 20 slots active · 0 MB Leaked)
                </span>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center gap-1.5">
                {/* First page */}
                <button
                  onClick={() => changePage(1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs transition"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Prev page */}
                <button
                  onClick={() => changePage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>

                {/* Direct Jump Input Form */}
                <form onSubmit={handleJumpPageSubmit} className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={queryResult.totalPages}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-center text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-400">of {queryResult.totalPages.toLocaleString()}</span>
                  <button
                    type="submit"
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-[11px] font-black transition"
                  >
                    Go
                  </button>
                </form>

                {/* Next page */}
                <button
                  onClick={() => changePage(Math.min(queryResult.totalPages, page + 1))}
                  disabled={page >= queryResult.totalPages}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold transition flex items-center gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {/* Last page */}
                <button
                  onClick={() => changePage(queryResult.totalPages)}
                  disabled={page >= queryResult.totalPages}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs transition"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
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
              <div
                className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{
                  backgroundColor: gachaResultSkin?.glowColor || '#a855f7',
                }}
              />

              {/* Shaking Crate & Burst */}
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

              {/* Skin Reveal */}
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

                  {gachaIsDuplicate ? (
                    <div className="mb-4 rounded-xl bg-amber-950/60 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300">
                      Already Owned! Duplicate Protection Refunded +200 🪙 Coins.
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 text-xs font-black text-emerald-300">
                      ✨ NEW SKIN ADDED TO WARDROBE!
                    </div>
                  )}

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
