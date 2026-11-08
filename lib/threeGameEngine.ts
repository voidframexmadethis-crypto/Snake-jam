import * as THREE from 'three';
import { soundManager } from './audio';
import {
  GameStats,
  MATCH_DURATION_SECONDS,
  BOSS_SPAWN_TIME_REMAINING,
  STAGES,
  INITIAL_SKINS,
  HANDCRAFTED_SKINS,
  TOTAL_ARENA_SNAKES,
  EVOLUTION_TIERS,
  UPGRADE_CONFIG,
  UpgradeType,
  PlayerUpgrades,
  SkinModelType,
  COLLECTION_SETS,
  getUpgradeCost,
  getThemeByLifetimeCoins,
  LeaderboardEntry,
  ObstacleData,
  StageDefinition,
} from './gameTypes';
import {
  buildSnakeProceduralHead,
  buildSnakeSegmentMesh,
} from './snakeModelBuilder';

export interface ActiveCollectionPerks {
  speedBonus: number;
  startLengthBonus: number;
  incomeBonus: number;
  magnetBonus: number;
  allStatsBonus: number;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number; // 2D screen coordinate
  opacity: number;
}

export interface GateData {
  id: number;
  type: 'add' | 'mult' | 'sub';
  value: number;
  label: string;
  x: number;
  z: number;
  width: number;
  meshGroup: THREE.Group;
  cooldown: number; // seconds
}

export interface PelletData {
  id: number;
  x: number;
  z: number;
  value: number;
  color: THREE.Color;
  meshIndex: number;
  active: boolean;
}

export interface PowerUpItem {
  id: number;
  type: 'magnet' | 'speed' | 'shield' | 'fire';
  x: number;
  z: number;
  group: THREE.Group;
  active: boolean;
}

export type ParticleType = 'confetti' | 'spark' | 'smoke';

export interface ParticleData {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  vrx: number;
  vry: number;
  vrz: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

export interface KillFeedEntry {
  id: string;
  text: string;
  color: string;
  time: number;
}

export interface UpgradePadData {
  type: 'speed' | 'startLength' | 'income' | 'magnet';
  label: string;
  x: number;
  z: number;
  radius: number;
  color: number;
  group: THREE.Group;
  charging: number; // 0 to 1
}

export interface SnakeSegment {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export interface SnakeEntity {
  id: string;
  name: string;
  isPlayer: boolean;
  isBoss: boolean;
  alive: boolean;
  x: number;
  z: number;
  heading: number; // radians
  speed: number;
  turnSpeed: number;
  length: number;
  targetLength: number;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  skinPrimary: string;
  skinSecondary: string;
  skinGlow: string;
  skinModelType: SkinModelType;
  headGroup: THREE.Group;
  tongueMesh?: THREE.Mesh;
  segments: SnakeSegment[];
  history: { x: number; z: number; heading: number }[];
  aiState?: 'forage' | 'hunt' | 'flee';
  aiTarget?: { x: number; z: number };
  aiTimer?: number;
  respawnTimer?: number;
  shieldActive?: boolean;
  jawAngle?: number;
  targetJawAngle?: number;
  customSkinName?: string;
  hasCustomSkin?: boolean;
  botGlobalIndex?: number;
}

export interface ChestData {
  id: string;
  x: number;
  z: number;
  meshGroup: THREE.Group;
  active: boolean;
  type: 'wood' | 'gold';
}

export interface CoinPelletData {
  id: string;
  x: number;
  z: number;
  coinValue: number;
  spinSpeed: number; // 180 deg/sec = Math.PI rad/s
  mesh: THREE.Mesh;
  active: boolean;
}

// Reusable math vectors for zero GC in game loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _colorA = new THREE.Color();
const _mat4 = new THREE.Matrix4();

export class ThreeGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private frameId: number = 0;
  private isDestroyed: boolean = false;
  private isSoftwareGl: boolean = false;

  // Lighting & Environment
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private groundMesh!: THREE.Mesh;
  private ringBarrierMesh!: THREE.Mesh;

  // Game Entities
  private player!: SnakeEntity;
  private bots: SnakeEntity[] = [];
  private boss: SnakeEntity | null = null;
  private bossPatrolAngle: number = 0;
  private pellets: PelletData[] = [];
  private pelletInstancedMesh!: THREE.InstancedMesh;
  private gates: GateData[] = [];
  private powerups: PowerUpItem[] = [];
  private dropOffZoneGroup!: THREE.Group;
  private upgradePads: UpgradePadData[] = [];
  private obstacles: ObstacleData[] = [];
  private obstacleGroup!: THREE.Group;
  private shieldBubbleMesh!: THREE.Mesh;
  private particles: ParticleData[] = [];
  private particlePool: ParticleData[] = [];
  private sharedConfettiGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
  private sharedSparkGeo = new THREE.SphereGeometry(0.15, 8, 8);
  private coinSegmentPool: THREE.Mesh[] = [];
  private sharedCoinGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.25, 16);
  private sharedCoinMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 1.0,
    roughness: 0.1,
    emissive: 0x443300,
    emissiveIntensity: 0.2,
  });
  private pelletGrid: number[][] = []; // indices into this.pellets
  private readonly gridSize: number = 40;
  private readonly gridDim: number = Math.ceil(2500 / 40); // arenaSize / gridSize
  private snakeCoins: SnakeEntity[] = [];
  private chests: ChestData[] = [];
  private coinPellets: CoinPelletData[] = [];
  private diamondPellets: CoinPelletData[] = [];
  private sharedDiamondGeo = new THREE.OctahedronGeometry(0.9, 0);
  private sharedDiamondMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    metalness: 1.0,
    roughness: 0.05,
    emissive: 0x0891b2,
    emissiveIntensity: 0.6,
  });
  public shakeIntensity: number = 0;
  private cameraZoomOffset: number = 0;
  private pelletCombo: number = 0;
  private pelletComboTimer: number = 0;
  public killFeed: KillFeedEntry[] = [];
  private fireProjectiles: { x: number; z: number; vx: number; vz: number; mesh: THREE.Mesh; active: boolean }[] = [];
  private fireShotCooldown: number = 0;
  private sharedFireGeo = new THREE.SphereGeometry(0.4, 12, 12);
  private sharedFireMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xf97316,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });

  // Distant 12M Swarm Simulation
  private distantSwarmMesh: THREE.InstancedMesh | null = null;
  private distantSwarmData: {
    x: number;
    z: number;
    heading: number;
    speed: number;
    phase: number;
  }[] = [];

  // Arena & Match State
  public matchTimeRemaining: number = MATCH_DURATION_SECONDS;
  public arenaSize: number = 2500;
  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;

  // Timer & Teleport Settings (PlayerBossHunter)
  public matchTimer: number = 0;
  public teleportUnlockTime: number = 660; // Exactly 11 minutes (11 * 60 seconds)
  public hasTeleportedToPerimeter: boolean = false;
  public canEatBoss: boolean = false;

  // Controls & Inputs
  public inputVector: { x: number; y: number } = { x: 0, y: 0 };
  public isBoosting: boolean = false;
  private keysPressed: { [key: string]: boolean } = {};
  public cameraMode: 'dynamic' | 'close' | 'isometric' = 'dynamic';
  public collectionPerks: ActiveCollectionPerks = {
    speedBonus: 0,
    startLengthBonus: 0,
    incomeBonus: 0,
    magnetBonus: 0,
    allStatsBonus: 0,
  };

  // Game Stats & State callback
  public onStatsUpdate: (stats: GameStats) => void;
  public onFloatingText: (text: FloatingText) => void;
  public onMatchEnd: (isVictory: boolean) => void;
  public stats: GameStats;

  public syncWallet(coinsToAdd: number, gemsToAdd: number = 0) {
    this.stats.totalPermanentCoins += coinsToAdd;
    this.stats.cashEarnedThisMatch += coinsToAdd;
    if (gemsToAdd > 0) {
      this.stats.totalGems += gemsToAdd;
      this.stats.gemsEarnedThisMatch += gemsToAdd;
    }
    this.onStatsUpdate({ ...this.stats });
  }

  constructor(
    container: HTMLElement,
    onStatsUpdate: (stats: GameStats) => void,
    onFloatingText: (text: FloatingText) => void,
    onMatchEnd: (isVictory: boolean) => void,
    initialStats: GameStats
  ) {
    this.container = container;
    this.onStatsUpdate = onStatsUpdate;
    this.onFloatingText = onFloatingText;
    this.onMatchEnd = onMatchEnd;
    this.stats = { ...initialStats };

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    const currentStage = getThemeByLifetimeCoins(this.stats.totalPermanentCoins);
    this.scene.background = new THREE.Color(currentStage.fogColor);
    this.scene.fog = new THREE.FogExp2(currentStage.fogColor, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      350
    );
    this.camera.position.set(0, 32, 28);
    this.camera.lookAt(0, 0, 0);

    this.clock = new THREE.Clock();

    // 4. Setup Lighting
    this.setupLighting(currentStage.skyTint);

    // 5. Build Environment & Arena
    this.buildEnvironment(currentStage);

    // 6. Spawn Game Elements
    this.buildPellets();
    this.buildGates();
    this.buildPowerups();
    this.buildObstacles(currentStage);

    // 7. Spawn Player & Bots
    this.spawnPlayer();
    this.spawnBots(28);

    // 8. Bind Input Listeners
    this.bindInputs();

    // 9. Start Main Loop
    this.frameId = requestAnimationFrame(this.tick);
  }

  // ==========================================
  // LIGHTING & ENVIRONMENT
  // ==========================================
  private setupLighting(skyTint: string) {
    this.hemiLight = new THREE.HemisphereLight(
      new THREE.Color(skyTint),
      new THREE.Color(0x1a202c),
      1.2
    );
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    this.dirLight.position.set(40, 60, 30);
    this.dirLight.castShadow = false;
    this.scene.add(this.dirLight);
  }

  private buildEnvironment(stage: (typeof STAGES)[0]) {
    // Floor Grid Canvas Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = stage.terrainColor;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle grid pattern
    ctx.strokeStyle = stage.gridColor;
    ctx.lineWidth = 4;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    // Tech corner markers
    ctx.fillStyle = stage.skyTint;
    for (let x = 0; x <= 512; x += 128) {
      for (let y = 0; y <= 512; y += 128) {
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }

    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(16, 16);
    floorTexture.colorSpace = THREE.SRGBColorSpace;

    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    this.groundMesh = new THREE.Mesh(floorGeo, floorMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.groundMesh);

    // Outer Mountain / Rock Outcrops Perimeter (Zero-pill natural barrier)
    const rockGeo = new THREE.DodecahedronGeometry(5, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
      metalness: 0.1,
    });
    const rockCount = 48;
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const dist = (this.arenaSize / 2) + 6 + (Math.sin(i * 3.7) * 4);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(Math.cos(angle) * dist, 2.5, Math.sin(angle) * dist);
      rock.scale.set(
        1.2 + Math.random() * 0.8,
        1.5 + Math.random() * 1.5,
        1.2 + Math.random() * 0.8
      );
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = !this.isSoftwareGl;
      rock.receiveShadow = !this.isSoftwareGl;
      this.scene.add(rock);
    }

    // Distant 12,000,000 Snake Swarm Instanced Mesh (Visual Presence of 12M Arena Multitude)
    const swarmCount = 360;
    const swarmGeo = new THREE.CapsuleGeometry(0.7, 2.4, 4, 8);
    swarmGeo.rotateZ(Math.PI / 2);
    const swarmMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    this.distantSwarmMesh = new THREE.InstancedMesh(swarmGeo, swarmMat, swarmCount);
    this.distantSwarmData = [];

    const customColors = HANDCRAFTED_SKINS.map(s => new THREE.Color(s.primaryColor));
    for (let i = 0; i < swarmCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 160 + Math.random() * 950;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const heading = Math.random() * Math.PI * 2;
      const speed = 7 + Math.random() * 7;
      const color = customColors[i % customColors.length];

      _mat4.makeRotationY(-heading + Math.PI / 2);
      _mat4.setPosition(x, 0.55, z);
      this.distantSwarmMesh.setMatrixAt(i, _mat4);
      this.distantSwarmMesh.setColorAt(i, color);
      this.distantSwarmData.push({
        x,
        z,
        heading,
        speed,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.distantSwarmMesh.instanceMatrix.needsUpdate = true;
    if (this.distantSwarmMesh.instanceColor) {
      this.distantSwarmMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.distantSwarmMesh);
  }

  // ==========================================
  // PELLETS & CONSUMABLES
  // ==========================================
  private buildPellets() {
    const count = 100000;
    const pelletGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const pelletMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x111111,
    });

    this.pelletInstancedMesh = new THREE.InstancedMesh(pelletGeo, pelletMat, count);
    this.pelletInstancedMesh.castShadow = !this.isSoftwareGl;
    this.pelletInstancedMesh.receiveShadow = !this.isSoftwareGl;

    const palette = [
      new THREE.Color(0x10b981), // Emerald
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xf59e0b), // Gold
      new THREE.Color(0xec4899), // Pink
      new THREE.Color(0x8b5cf6), // Violet
      new THREE.Color(0x3b82f6), // Blue
    ];

    // Initialize Spatial Grid
    this.pelletGrid = Array.from({ length: this.gridDim * this.gridDim }, () => []);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 8);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const color = palette[Math.floor(Math.random() * palette.length)];

      _mat4.makeTranslation(x, 0.45, z);
      this.pelletInstancedMesh.setMatrixAt(i, _mat4);
      this.pelletInstancedMesh.setColorAt(i, color);

      this.pellets.push({
        id: i,
        x,
        z,
        value: 1,
        color,
        meshIndex: i,
        active: true,
      });

      // Add to grid
      const gx = Math.floor((x + 1250) / this.gridSize);
      const gz = Math.floor((z + 1250) / this.gridSize);
      const gIdx = gz * this.gridDim + gx;
      if (this.pelletGrid[gIdx]) {
        this.pelletGrid[gIdx].push(i);
      }
    }

    // Pre-populate particle pool (Zero Allocation)
    for (let i = 0; i < 800; i++) {
      const type: ParticleType = i < 400 ? 'confetti' : 'spark';
      const geo = type === 'confetti' ? this.sharedConfettiGeo : this.sharedSparkGeo;
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        vx: 0, vy: 0, vz: 0,
        vrx: 0, vry: 0, vrz: 0,
        life: 0, maxLife: 0,
        type
      });
    }

    if (this.pelletInstancedMesh.instanceColor) {
      this.pelletInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.pelletInstancedMesh);

    // Pre-populate Coin Segment Pool (Zero Allocation)
    this.sharedCoinGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 500; i++) {
      const mesh = new THREE.Mesh(this.sharedCoinGeo, this.sharedCoinMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.coinSegmentPool.push(mesh);
    }

    // Initial loose coins on floor
    for (let i = 0; i < 200; i++) {
      const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 80);
      const a = Math.random() * Math.PI * 2;
      this.spawnCoinPellet(Math.cos(a) * r, Math.sin(a) * r, 10);
    }
  }

  private respawnPellet(p: PelletData) {
    // Remove from old grid cell
    const oldGx = Math.floor((p.x + 1250) / this.gridSize);
    const oldGz = Math.floor((p.z + 1250) / this.gridSize);
    const oldGIdx = oldGz * this.gridDim + oldGx;
    if (this.pelletGrid[oldGIdx]) {
      this.pelletGrid[oldGIdx] = this.pelletGrid[oldGIdx].filter(idx => idx !== p.meshIndex);
    }

    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 5);
    p.x = Math.cos(angle) * r;
    p.z = Math.sin(angle) * r;
    p.active = true;

    // Add to new grid cell
    const gx = Math.floor((p.x + 1250) / this.gridSize);
    const gz = Math.floor((p.z + 1250) / this.gridSize);
    const gIdx = gz * this.gridDim + gx;
    if (this.pelletGrid[gIdx]) {
      this.pelletGrid[gIdx].push(p.meshIndex);
    }

    _mat4.makeTranslation(p.x, 0.45, p.z);
    this.pelletInstancedMesh.setMatrixAt(p.meshIndex, _mat4);
  }

  // ==========================================
  // EVOLUTION / MULTIPLIER GATES
  // ==========================================
  private buildGates() {
    const gateConfigs: { type: 'add' | 'mult' | 'sub'; val: number; text: string; x: number; z: number }[] = [
      { type: 'add', val: 10, text: '+10', x: -30, z: -20 },
      { type: 'mult', val: 2, text: 'x2', x: 30, z: -20 },
      { type: 'add', val: 25, text: '+25', x: 0, z: -35 },
      { type: 'add', val: 15, text: '+15', x: -35, z: 25 },
      { type: 'mult', val: 1.5, text: 'x1.5', x: 35, z: 25 },
      { type: 'sub', val: 5, text: '-5', x: 0, z: 35 },
    ];

    gateConfigs.forEach((conf, idx) => {
      const group = new THREE.Group();
      group.position.set(conf.x, 0, conf.z);

      const isPositive = conf.type !== 'sub';
      const frameColor = isPositive ? 0x06b6d4 : 0xef4444;

      // Gate pillars
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 5, 16);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.3,
        metalness: 0.8,
      });

      const pLeft = new THREE.Mesh(pillarGeo, pillarMat);
      pLeft.position.set(-3.5, 2.5, 0);
      pLeft.castShadow = !this.isSoftwareGl;
      group.add(pLeft);

      const pRight = new THREE.Mesh(pillarGeo, pillarMat);
      pRight.position.set(3.5, 2.5, 0);
      pRight.castShadow = !this.isSoftwareGl;
      group.add(pRight);

      // Gate Top Arch
      const archGeo = new THREE.BoxGeometry(7.5, 0.8, 0.8);
      const archMat = new THREE.MeshStandardMaterial({
        color: frameColor,
        emissive: frameColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.set(0, 5, 0);
      group.add(arch);

      // Translucent Energy Curtain
      const curtainGeo = new THREE.PlaneGeometry(6.6, 4.4);
      const curtainMat = new THREE.MeshBasicMaterial({
        color: frameColor,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const curtain = new THREE.Mesh(curtainGeo, curtainMat);
      curtain.position.set(0, 2.4, 0);
      group.add(curtain);

      // Billboard Text on Top
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = isPositive ? '#22d3ee' : '#f87171';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 244, 116);

      ctx.fillStyle = isPositive ? '#38bdf8' : '#ef4444';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(conf.text, 128, 64);

      const signTex = new THREE.CanvasTexture(canvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const signGeo = new THREE.PlaneGeometry(4.2, 2.1);
      const signMat = new THREE.MeshBasicMaterial({
        map: signTex,
        side: THREE.DoubleSide,
      });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 6.2, 0);
      group.add(signMesh);

      this.scene.add(group);

      this.gates.push({
        id: idx,
        type: conf.type,
        value: conf.val,
        label: conf.text,
        x: conf.x,
        z: conf.z,
        width: 7,
        meshGroup: group,
        cooldown: 0,
      });
    });
  }

  // ==========================================
  // POWER-UPS (FREE PICKUPS)
  // ==========================================
  private buildPowerups() {
    const types: ('magnet' | 'speed' | 'shield' | 'fire')[] = [
      'magnet',
      'speed',
      'shield',
      'fire',
      'magnet',
      'speed',
      'shield',
      'fire',
    ];
    types.forEach((type, i) => {
      const group = new THREE.Group();
      const halfSize = this.arenaSize / 2 - 10;
      const x = (Math.random() - 0.5) * halfSize * 2;
      const z = (Math.random() - 0.5) * halfSize * 2;
      group.position.set(x, 1.2, z);
      group.scale.set(1.8, 1.8, 1.8);

      let color = 0x3b82f6; // Magnet blue
      if (type === 'speed') color = 0x06b6d4; // Speed cyan
      if (type === 'shield') color = 0xf59e0b; // Shield gold
      if (type === 'fire') color = 0xef4444; // Fire red

      if (type === 'magnet') {
        // ... (Keep existing magnet code)
        const magnetGeo = new THREE.TorusGeometry(0.9, 0.25, 12, 24, Math.PI * 1.3);
        const magnetMat = new THREE.MeshStandardMaterial({
          color: 0x2563eb,
          emissive: 0x3b82f6,
          emissiveIntensity: 1.2,
          metalness: 0.8,
        });
        const magnetMesh = new THREE.Mesh(magnetGeo, magnetMat);
        magnetMesh.rotation.x = Math.PI / 2;
        group.add(magnetMesh);

        const tipGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 12);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
        const tipL = new THREE.Mesh(tipGeo, tipMat);
        tipL.position.set(-0.85, 0, -0.4);
        group.add(tipL);

        const tipR = new THREE.Mesh(tipGeo, tipMat);
        tipR.position.set(0.85, 0, -0.4);
        group.add(tipR);
      } else if (type === 'speed') {
        // Arrow shape (cyan shaft + arrowhead cone pointing forward)
        const shaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 12);
        const headGeo = new THREE.ConeGeometry(0.4, 0.7, 12);
        const arrowMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x22d3ee,
          emissiveIntensity: 1.5,
          metalness: 0.8,
        });
        const shaft = new THREE.Mesh(shaftGeo, arrowMat);
        shaft.position.y = -0.3;
        group.add(shaft);

        const head = new THREE.Mesh(headGeo, arrowMat);
        head.position.y = 0.45;
        group.add(head);
      } else if (type === 'shield') {
        // Shield badge / crest shape with golden border rim
        const shieldGeo = new THREE.BoxGeometry(1.2, 1.4, 0.2);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          emissive: 0x1d4ed8,
          emissiveIntensity: 1.5,
          metalness: 0.7,
        });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        group.add(shieldMesh);

        const rimGeo = new THREE.BoxGeometry(1.35, 1.55, 0.1);
        const rimMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xfacc15,
          emissiveIntensity: 0.9,
          metalness: 0.9,
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        rimMesh.position.z = -0.06;
        group.add(rimMesh);
      } else if (type === 'fire') {
        // Fire flames (multi-layered flickering flame cones)
        const outerFlameGeo = new THREE.ConeGeometry(0.7, 1.6, 12);
        const outerFlameMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.9,
        });
        const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
        group.add(outerFlame);

        const innerFlameGeo = new THREE.ConeGeometry(0.4, 1.2, 12);
        const innerFlameMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xfbbf24,
          emissiveIntensity: 1.5,
        });
        const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        innerFlame.position.set(0.05, 0.15, 0.05);
        group.add(innerFlame);
      }

      this.scene.add(group);
      this.powerups.push({
        id: i,
        type,
        x,
        z,
        group,
        active: true,
      });
    });
  }



  // ==========================================
  // ARENA OBSTACLES & HAZARDS (BIOME STAGES)
  // ==========================================
  private buildObstacles(stage: StageDefinition) {
    this.obstacleGroup = new THREE.Group();
    this.scene.add(this.obstacleGroup);

    const obstacleConfigs: { x: number; z: number; type: 'pillar' | 'crystal' | 'boulder'; scale: number }[] = [
      { x: -25, z: -25, type: 'pillar', scale: 1.2 },
      { x: 25, z: -25, type: 'crystal', scale: 1.5 },
      { x: -25, z: 25, type: 'boulder', scale: 1.4 },
      { x: 25, z: 25, type: 'pillar', scale: 1.3 },
      { x: 0, z: -40, type: 'crystal', scale: 1.6 },
      { x: -40, z: 0, type: 'boulder', scale: 1.5 },
      { x: 40, z: 0, type: 'pillar', scale: 1.4 },
      { x: 0, z: 40, type: 'crystal', scale: 1.3 },
    ];

    obstacleConfigs.forEach((conf, idx) => {
      const radius = 2.2 * conf.scale;
      const height = 6.0 * conf.scale;
      const meshGroup = new THREE.Group();
      meshGroup.position.set(conf.x, 0, conf.z);

      if (conf.type === 'pillar') {
        const geo = new THREE.CylinderGeometry(radius * 0.8, radius, height, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: stage.gridColor,
          roughness: 0.4,
          metalness: 0.8,
          emissive: stage.skyTint,
          emissiveIntensity: 0.25,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;
        mesh.castShadow = !this.isSoftwareGl;
        mesh.receiveShadow = !this.isSoftwareGl;
        meshGroup.add(mesh);
      } else if (conf.type === 'crystal') {
        const geo = new THREE.OctahedronGeometry(radius * 1.5, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: stage.skyTint,
          roughness: 0.2,
          metalness: 0.9,
          emissive: stage.skyTint,
          emissiveIntensity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height * 0.5;
        mesh.rotation.y = Math.PI / 4;
        mesh.castShadow = !this.isSoftwareGl;
        meshGroup.add(mesh);
      } else {
        const geo = new THREE.DodecahedronGeometry(radius * 1.3, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: stage.terrainColor,
          roughness: 0.9,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height * 0.4;
        mesh.castShadow = !this.isSoftwareGl;
        mesh.receiveShadow = !this.isSoftwareGl;
        meshGroup.add(mesh);
      }

      this.obstacleGroup.add(meshGroup);

      this.obstacles.push({
        id: idx,
        x: conf.x,
        z: conf.z,
        radius,
        height,
        type: conf.type,
        color: 0xffffff,
      });
    });
  }

  // ==========================================
  // PROCEDURAL SNAKE CREATION (3-12 PARTS)
  // ==========================================
  private createSnakeHead(
    primaryColor: string,
    secondaryColor: string,
    glowColor: string,
    modelType: SkinModelType = 'classic',
    isBoss: boolean = false
  ): { headGroup: THREE.Group; tongueMesh?: THREE.Mesh } {
    const scale = isBoss ? 2.2 : 1.0;
    return buildSnakeProceduralHead(
      primaryColor,
      secondaryColor,
      glowColor,
      modelType,
      this.isSoftwareGl,
      scale
    );
  }

  private createSegmentMesh(
    primaryColor: string,
    secondaryColor: string,
    glowColor: string,
    index: number,
    modelType: SkinModelType = 'classic',
    isBoss: boolean = false
  ): THREE.Mesh {
    const scale = isBoss ? 2.0 : 0.9;
    return buildSnakeSegmentMesh(
      primaryColor,
      secondaryColor,
      glowColor,
      index,
      modelType,
      this.isSoftwareGl,
      scale
    );
  }

  // ==========================================
  // SPAWNING PLAYER & BOTS
  // ==========================================
  private spawnPlayer() {
    const equippedSkin =
      INITIAL_SKINS.find((s) => s.id === this.stats.equippedSkinId) ||
      INITIAL_SKINS[0];

    const modelType = equippedSkin.modelType || 'classic';

    const { headGroup, tongueMesh } = this.createSnakeHead(
      equippedSkin.primaryColor,
      equippedSkin.secondaryColor,
      equippedSkin.glowColor,
      modelType,
      false
    );
    this.scene.add(headGroup);

    const perkLenBonus =
      (this.collectionPerks.startLengthBonus || 0) +
      (this.collectionPerks.allStatsBonus || 0);
    const startBonus =
      this.stats.upgrades.startLengthLevel * 3 + Math.round(perkLenBonus * 0.15);
    const initialLen = 8 + startBonus;

    this.player = {
      id: 'player',
      name: 'Player 1',
      isPlayer: true,
      isBoss: false,
      alive: true,
      x: 0,
      z: 12,
      heading: -Math.PI / 2, // Facing North
      speed: 12,
      turnSpeed: 8.0,
      length: initialLen,
      targetLength: initialLen,
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      skinPrimary: equippedSkin.primaryColor,
      skinSecondary: equippedSkin.secondaryColor,
      skinGlow: equippedSkin.glowColor,
      skinModelType: modelType,
      headGroup,
      tongueMesh,
      segments: [],
      history: [],
    };

    // Shield Bubble Mesh
    const shieldGeo = new THREE.SphereGeometry(2.2, 24, 24);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });
    this.shieldBubbleMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldBubbleMesh.visible = false;
    this.player.headGroup.add(this.shieldBubbleMesh);

    // Pre-populate history
    for (let i = 0; i < 200; i++) {
      this.player.history.push({
        x: this.player.x,
        z: this.player.z + i * 0.5,
        heading: this.player.heading,
      });
    }

    // Build pre-allocated segment pool (Zero Allocation Object Pooling)
    const maxPoolSize = 150;
    for (let i = 0; i < maxPoolSize; i++) {
      const segMesh = this.createSegmentMesh(
        equippedSkin.primaryColor,
        equippedSkin.secondaryColor,
        equippedSkin.glowColor,
        i,
        modelType,
        false
      );
      segMesh.visible = i < initialLen;
      this.scene.add(segMesh);
      this.player.segments.push({
        mesh: segMesh,
        position: new THREE.Vector3(this.player.x, 0.45, this.player.z + (i + 1) * 0.8),
        rotation: new THREE.Euler(0, this.player.heading, 0),
      });
    }
  }

  private spawnBots(count: number) {
    const botCount = Math.max(count, 48);
    const botNames = [
      'CyberViper', 'NeonFang', 'GigaCobra', 'QuantumWorm', 'ShadowPython',
      'SolarDrake', 'ApexTitan', 'FrostBite', 'MagmaWyrm', 'PhantomStrike',
      'VoltEel', 'YetiRider', 'CoasterRacer', 'SharkFin', 'SnowGlide',
      'EmeraldFang', 'HyperVenom', 'AstralSerpent', 'InfernoCobra', 'ThunderScale',
      'RogueBasilisk', 'CosmicDragon', 'GlacialHydra', 'AbyssCrawler', 'OmegaStalker',
      'GoldenPython', 'IronViper', 'BlazeStriker', 'TitanWorm', 'ToxicDart',
      'StormRuler', 'VelocityDrake'
    ];

    for (let i = 0; i < botCount; i++) {
      // 72% of AI snakes wear custom snake skins from HANDCRAFTED_SKINS!
      const isCustomSkin = Math.random() < 0.72;
      const customSkin = HANDCRAFTED_SKINS[i % HANDCRAFTED_SKINS.length];
      
      const primaryColor = isCustomSkin ? customSkin.primaryColor : '#06b6d4';
      const secondaryColor = isCustomSkin ? customSkin.secondaryColor : '#0284c7';
      const glowColor = isCustomSkin ? customSkin.glowColor : '#38bdf8';
      const modelType: SkinModelType = isCustomSkin ? (customSkin.modelType || 'classic') : 'classic';

      const botGlobalIndex = Math.floor(Math.random() * TOTAL_ARENA_SNAKES) + 1;
      const baseName = botNames[i % botNames.length];
      const customSkinName = isCustomSkin ? customSkin.name : 'Classic Viper';
      const name = isCustomSkin
        ? `[${customSkin.name}] ${baseName}#${botGlobalIndex.toLocaleString()}`
        : `${baseName}#${botGlobalIndex.toLocaleString()}`;

      // Dynamic radial distribution: close rivals, mid-field foragers, outer-ring snakes
      const angle = (i / botCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      let dist: number;
      if (i < 12) {
        dist = 22 + Math.random() * 45;
      } else if (i < 28) {
        dist = 70 + Math.random() * 140;
      } else {
        dist = 220 + Math.random() * 320;
      }
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const { headGroup, tongueMesh } = this.createSnakeHead(
        primaryColor,
        secondaryColor,
        glowColor,
        modelType,
        false
      );

      // Add a distinct custom skin badge marker above the head if wearing custom skin
      if (isCustomSkin) {
        const markerGeo = new THREE.OctahedronGeometry(0.35, 0);
        const markerMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(glowColor),
          wireframe: true,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(0, 1.45, 0);
        headGroup.add(marker);
      }

      this.scene.add(headGroup);

      const botLength = 6 + Math.floor(Math.random() * 8);
      const bot: SnakeEntity = {
        id: `bot_${i}`,
        name,
        isPlayer: false,
        isBoss: false,
        alive: true,
        x,
        z,
        heading: Math.random() * Math.PI * 2,
        speed: 10 + Math.random() * 2,
        turnSpeed: 3.2,
        length: botLength,
        targetLength: botLength,
        level: 1 + Math.floor(Math.random() * 3),
        exp: 0,
        hp: 60,
        maxHp: 60,
        skinPrimary: primaryColor,
        skinSecondary: secondaryColor,
        skinGlow: glowColor,
        skinModelType: modelType,
        customSkinName,
        hasCustomSkin: isCustomSkin,
        botGlobalIndex,
        headGroup,
        tongueMesh,
        segments: [],
        history: [],
        aiState: 'forage',
        aiTimer: Math.random() * 3,
        respawnTimer: 0,
      };

      for (let h = 0; h < 200; h++) {
        bot.history.push({ x: bot.x, z: bot.z, heading: bot.heading });
      }

      // 40 meshes per bot pool ensures ultra-smooth 80 FPS rendering
      const maxPoolSize = 40;
      for (let s = 0; s < maxPoolSize; s++) {
        const segMesh = this.createSegmentMesh(
          primaryColor,
          secondaryColor,
          glowColor,
          s,
          modelType,
          false
        );
        segMesh.visible = s < botLength;
        this.scene.add(segMesh);
        bot.segments.push({
          mesh: segMesh,
          position: new THREE.Vector3(bot.x, 0.45, bot.z),
          rotation: new THREE.Euler(0, bot.heading, 0),
        });
      }

      this.bots.push(bot);
    }
  }

  private respawnBot(bot: SnakeEntity) {
    bot.alive = true;
    bot.respawnTimer = 0;

    // Respawn with a new identity from the 12,000,000 player pool!
    bot.botGlobalIndex = Math.floor(Math.random() * TOTAL_ARENA_SNAKES) + 1;
    const isCustomSkin = Math.random() < 0.72;
    const customSkin = HANDCRAFTED_SKINS[Math.floor(Math.random() * HANDCRAFTED_SKINS.length)];
    const baseNames = [
      'CyberViper', 'NeonFang', 'GigaCobra', 'QuantumWorm', 'ShadowPython',
      'SolarDrake', 'ApexTitan', 'FrostBite', 'MagmaWyrm', 'PhantomStrike',
      'VoltEel', 'YetiRider', 'CoasterRacer', 'SharkFin', 'SnowGlide',
      'EmeraldFang', 'HyperVenom', 'AstralSerpent'
    ];
    const baseName = baseNames[Math.floor(Math.random() * baseNames.length)];
    bot.hasCustomSkin = isCustomSkin;
    bot.customSkinName = isCustomSkin ? customSkin.name : 'Classic Viper';
    bot.name = isCustomSkin
      ? `[${customSkin.name}] ${baseName}#${bot.botGlobalIndex.toLocaleString()}`
      : `${baseName}#${bot.botGlobalIndex.toLocaleString()}`;

    // Respawn around player at safe distance
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 110;
    bot.x = Math.max(-1000, Math.min(1000, this.player.x + Math.cos(angle) * dist));
    bot.z = Math.max(-1000, Math.min(1000, this.player.z + Math.sin(angle) * dist));
    bot.heading = Math.random() * Math.PI * 2;

    const botLength = 6 + Math.floor(Math.random() * 8);
    bot.length = botLength;
    bot.targetLength = botLength;
    bot.hp = 60;
    bot.maxHp = 60;
    bot.aiState = 'forage';
    bot.aiTimer = 1.0 + Math.random() * 2;

    bot.headGroup.position.set(bot.x, 0, bot.z);
    bot.headGroup.rotation.y = -bot.heading + Math.PI / 2;
    bot.headGroup.visible = true;
    this.scene.add(bot.headGroup);

    bot.history = [];
    for (let h = 0; h < 200; h++) {
      bot.history.push({ x: bot.x, z: bot.z, heading: bot.heading });
    }

    bot.segments.forEach((seg, s) => {
      seg.mesh.visible = s < botLength;
      seg.position.set(bot.x, 0.45, bot.z);
      seg.mesh.position.set(bot.x, 0.45, bot.z);
      seg.mesh.rotation.y = -bot.heading + Math.PI / 2;
    });
  }

  // ==========================================
  // STAGE BOSS SPAWN (STAGE PROGRESSION)
  // ==========================================
  private spawnStageBoss() {
    if (this.boss && this.boss.alive) return;
    const stage = STAGES.find((s) => s.id === this.stats.currentStageId) || STAGES[0];

    soundManager.playBossAlert();
    this.triggerScreenShake(1.6);
    this.onFloatingText({
      id: Math.random().toString(),
      text: `⚠️ STAGE COMPLETE! ${stage.bossName} ENTERED THE ARENA!`,
      color: '#ef4444',
      x: window.innerWidth / 2,
      y: 120,
      opacity: 1,
    });

    const bossColor = stage.bossColor;
    const { headGroup, tongueMesh } = this.createSnakeHead(
      bossColor,
      '#111827',
      '#fbbf24',
      'dragon',
      true
    );
    this.scene.add(headGroup);

    const bossLen = stage.bossLength;
    const bossAngle = Math.random() * Math.PI * 2;
    this.bossPatrolAngle = bossAngle;
    const bossDist = 1850;
    const bx = Math.cos(bossAngle) * bossDist;
    const bz = Math.sin(bossAngle) * bossDist;

    this.boss = {
      id: 'stage_boss',
      name: stage.bossName,
      isPlayer: false,
      isBoss: true,
      alive: true,
      x: bx,
      z: bz,
      heading: bossAngle + Math.PI / 2,
      speed: 8.5,
      turnSpeed: 2.2,
      length: bossLen,
      targetLength: bossLen,
      level: 15,
      exp: 0,
      hp: stage.bossHp,
      maxHp: stage.bossHp,
      skinPrimary: bossColor,
      skinSecondary: '#1e293b',
      skinGlow: '#fbbf24',
      skinModelType: 'dragon',
      headGroup,
      tongueMesh,
      segments: [],
      history: [],
      aiState: 'hunt',
      aiTimer: 0,
    };

    for (let h = 0; h < 300; h++) {
      this.boss.history.push({ x: bx, z: bz, heading: this.boss.heading });
    }

    const maxPoolSize = 200;
    for (let s = 0; s < maxPoolSize; s++) {
      const segMesh = this.createSegmentMesh(
        bossColor,
        '#1e293b',
        '#fbbf24',
        s,
        'dragon',
        true
      );
      segMesh.visible = s < bossLen;
      this.scene.add(segMesh);
      this.boss.segments.push({
        mesh: segMesh,
        position: new THREE.Vector3(bx, 0.9, bz),
        rotation: new THREE.Euler(0, this.boss.heading, 0),
      });
    }

    this.stats.bossAlive = true;
    this.stats.bossHp = stage.bossHp;
    this.stats.bossMaxHp = stage.bossHp;
    this.stats.stageProgress = 100;
    this.stats.bossPhase = 1;

    // Transition Arena Appearance
    this.transitionArenaColors(stage);
  }

  public trigger11MinuteTeleport() {
    if (this.hasTeleportedToPerimeter) return;
    this.hasTeleportedToPerimeter = true;
    this.canEatBoss = true;

    // Ensure Stage Boss is spawned
    if (!this.boss || !this.boss.alive) {
      this.spawnStageBoss();
    }

    // Outer perimeter ring coordinates where the Boss patrols
    const perimeterRadius = 1850;
    const targetAngle = this.boss ? this.bossPatrolAngle + 0.05 : Math.random() * Math.PI * 2;
    const outerSpawnX = Math.cos(targetAngle) * perimeterRadius + 5;
    const outerSpawnZ = Math.sin(targetAngle) * perimeterRadius + 5;

    this.player.x = outerSpawnX;
    this.player.z = outerSpawnZ;
    this.player.heading = Math.atan2(-outerSpawnZ, -outerSpawnX);
    if (this.player.headGroup) {
      this.player.headGroup.position.set(outerSpawnX, 0, outerSpawnZ);
    }

    this.player.history = [];
    for (let h = 0; h < 300; h++) {
      this.player.history.push({ x: outerSpawnX, z: outerSpawnZ, heading: this.player.heading });
    }
    this.updateTailSegments(this.player, 0.016);

    soundManager.playBossAlert();
    this.triggerScreenShake(2.0);
    this.spawnParticleBurst(outerSpawnX, outerSpawnZ, '#38bdf8', 50, 'confetti');
    this.spawnParticleBurst(outerSpawnX, outerSpawnZ, '#f43f5e', 30, 'spark');

    this.onFloatingText({
      id: `tp_${Date.now()}`,
      text: `⚡ 11-Minute mark reached! Teleported outside the arena perimeter to hunt the Boss!`,
      color: '#38bdf8',
      x: window.innerWidth / 2,
      y: 120,
      opacity: 1,
    });
  }

  private transitionArenaColors(stage: StageDefinition) {
    // Shift fog and ground colors to boss theme
    const targetFog = new THREE.Color(stage.bossColor);
    const targetSky = new THREE.Color(stage.bossColor);

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(targetFog, 0.5);
    }
    
    // Pulse light to boss color
    this.hemiLight.color.lerp(targetSky, 0.5);
    this.dirLight.color.lerp(new THREE.Color(0xffffff), 0.5);
  }

  private getPooledCoinMesh(scale: number = 1.0): THREE.Mesh | null {
    const mesh = this.coinSegmentPool.find(m => !m.visible);
    if (mesh) {
      mesh.visible = true;
      mesh.scale.set(scale, scale, scale);
      return mesh;
    }
    return null;
  }

  private spawnSnakeCoin() {
    const id = 'snake_coin_' + Math.random().toString(36).substring(2, 9);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 50);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const heading = Math.random() * Math.PI * 2;
    const length = 6 + Math.floor(Math.random() * 6);
    
    const headGroup = new THREE.Group();
    
    // Top head coin
    const headTop = this.getPooledCoinMesh(1.5);
    if (headTop) {
      headTop.position.set(0, 0.2, 0);
      headGroup.add(headTop);
    }

    // Jaw group for eating animation
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, -0.1, 0);
    const headBottom = this.getPooledCoinMesh(1.5);
    if (headBottom) {
      headBottom.position.set(0, -0.2, 0);
      jawGroup.add(headBottom);
    }
    headGroup.add(jawGroup);

    this.scene.add(headGroup);

    const snakeCoin: SnakeEntity = {
      id,
      name: 'SNAKE COIN',
      isPlayer: false,
      isBoss: false,
      alive: true,
      x,
      z,
      heading,
      speed: 7.0,
      turnSpeed: 1.8,
      length,
      targetLength: length,
      level: 1,
      exp: 0,
      hp: 1,
      maxHp: 1,
      skinPrimary: '#ffd700',
      skinSecondary: '#ffd700',
      skinGlow: '#ffd700',
      skinModelType: 'classic',
      headGroup,
      segments: [],
      history: [],
      aiState: 'forage',
      aiTimer: 2.0,
    };

    for (let h = 0; h < 200; h++) {
      snakeCoin.history.push({ x, z, heading });
    }

    for (let i = 0; i < length; i++) {
      const segMesh = this.getPooledCoinMesh(1.2);
      if (segMesh) {
        snakeCoin.segments.push({
          mesh: segMesh,
          position: new THREE.Vector3(x, 0.45, z),
          rotation: new THREE.Euler(0, heading, 0),
        });
      }
    }

    this.snakeCoins.push(snakeCoin);
  }

  private spawnChest() {
    const id = 'chest_' + Math.random().toString(36).substring(2, 9);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 50);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    
    const group = new THREE.Group();
    group.position.set(x, 0.6, z);
    
    const bodyGeo = new THREE.BoxGeometry(2.0, 1.4, 1.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);
    
    const trimGeo = new THREE.BoxGeometry(2.2, 0.3, 1.6);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = 0.7;
    group.add(trim);

    this.scene.add(group);
    this.chests.push({ id, x, z, meshGroup: group, active: true, type: Math.random() > 0.8 ? 'gold' : 'wood' });
  }

  // ==========================================
  // COIN PELLET & TREASURE CHEST BURST SYSTEM
  // ==========================================
  public spawnCoinPellet(x: number, z: number, coinValue: number = 10) {
    let cp = this.coinPellets.find((item) => !item.active);
    if (!cp) {
      if (this.coinPellets.length >= 500) return; // Increased pool safety cap
      const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.18, 16); // Increased size for visibility
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1.0,
        roughness: 0.1,
        emissive: 0x553300,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 6; // Tilt for 3D spin view
      this.scene.add(mesh);

      cp = {
        id: 'coin_pellet_' + Math.random().toString(36).substring(2, 8),
        x,
        z,
        coinValue,
        spinSpeed: (200 * Math.PI) / 180, // rotationSpeed = 200 deg/sec
        mesh,
        active: true,
      };
      this.coinPellets.push(cp);
    } else {
      cp.x = x;
      cp.z = z;
      cp.coinValue = coinValue;
      cp.spinSpeed = (200 * Math.PI) / 180;
      cp.active = true;
      cp.mesh.visible = true;
    }

    cp.mesh.position.set(x, 0.45, z);
  }

  public spawnDiamondPellet(x: number, z: number, gemValue: number = 1) {
    let dp = this.diamondPellets.find((item) => !item.active);
    if (!dp) {
      if (this.diamondPellets.length >= 50) return;
      const mesh = new THREE.Mesh(this.sharedDiamondGeo, this.sharedDiamondMat);
      this.scene.add(mesh);

      dp = {
        id: 'diamond_pellet_' + Math.random().toString(36).substring(2, 8),
        x,
        z,
        coinValue: gemValue, // Reusing field for gem value
        spinSpeed: (180 * Math.PI) / 180,
        mesh,
        active: true,
      };
      this.diamondPellets.push(dp);
    } else {
      dp.x = x;
      dp.z = z;
      dp.coinValue = gemValue;
      dp.active = true;
      dp.mesh.visible = true;
    }
    dp.mesh.position.set(x, 0.8, z);
  }

  public openTreasureChest(chest: ChestData) {
    chest.active = false;
    this.scene.remove(chest.meshGroup);

    soundManager.playCashOut();
    this.spawnParticleBurst(chest.x, chest.z, '#fbbf24', 45, 'confetti');
    this.spawnParticleBurst(chest.x, chest.z, '#ffffff', 25, 'spark');

    // Direction vector facing away from player or forward
    let dirDx = chest.x - this.player.x;
    let dirDz = chest.z - this.player.z;
    let forwardAngle = Math.atan2(dirDz, dirDx);
    if (Math.hypot(dirDx, dirDz) < 0.1) {
      forwardAngle = this.player.heading;
    }

    // ArenaTreasureChest Unity settings: totalCoins = 25, coinSpacing = 1.0f, serpentineWaveSpeed = 0.5f
    const totalCoins = chest.type === 'gold' ? 35 : 25;
    const coinSpacing = 1.0;
    const serpentineWaveSpeed = 0.5;

    let currentSpawnX = chest.x;
    let currentSpawnZ = chest.z;

    // Spawn slithering curved trail for "Coin Snake" (Unity ArenaTreasureChest script)
    for (let i = 0; i < totalCoins; i++) {
      // Calculate slithering S-curve path: offsetAngle = Mathf.Sin(i * serpentineWaveSpeed) * 35f
      const offsetAngleDeg = Math.sin(i * serpentineWaveSpeed) * 35; // 35 degrees wave amplitude
      const offsetAngleRad = (offsetAngleDeg * Math.PI) / 180;
      const nextAngle = forwardAngle + offsetAngleRad;

      const nextDirX = Math.cos(nextAngle);
      const nextDirZ = Math.sin(nextAngle);

      currentSpawnX += nextDirX * coinSpacing;
      currentSpawnZ += nextDirZ * coinSpacing;

      this.spawnCoinPellet(currentSpawnX, currentSpawnZ, chest.type === 'gold' ? 15 : 10);
    }

    const totalReward = totalCoins * (chest.type === 'gold' ? 15 : 10);
    this.onFloatingText({
      id: Math.random().toString(),
      text: `🎁 TREASURE CHEST BURST! SLITHER TO COLLECT +${totalReward} COINS!`,
      color: '#f59e0b',
      x: window.innerWidth / 2,
      y: 200,
      opacity: 1,
    });
  }

  // ==========================================
  // INPUT HANDLING
  // ==========================================
  private bindInputs() {
    this.container.addEventListener('wheel', this.handleZoom.bind(this));
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;
      if (e.code === 'Space') {
        this.isBoosting = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
      if (e.code === 'Space') {
        this.isBoosting = false;
      }
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private handleZoom(event: WheelEvent) {
    if (this.isPaused || this.isGameOver) return;
    this.cameraZoomOffset = Math.max(-15, Math.min(30, this.cameraZoomOffset + event.deltaY * 0.05));
    event.preventDefault();
  }

  private onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ==========================================
  // GAME LOOP & TICK
  // ==========================================
  private lastFrameTime: number = 0;
  private readonly fpsInterval = 1000 / 80; // 80 FPS cap

  private tick = (timestamp: number = 0) => {
    if (this.isDestroyed) return;
    this.frameId = requestAnimationFrame(this.tick);

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.fpsInterval - 1) {
      return;
    }
    this.lastFrameTime = timestamp - (elapsed % this.fpsInterval);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPaused) {
      if (!this.isGameOver) {
        this.updateMatchTime(delta);
        this.updateControls(delta);
        this.updatePlayer(delta);
      }

      this.updateBots(delta);
      if (this.boss && this.boss.alive) {
        this.updateBoss(delta);
      }
      this.updatePellets(delta);
      this.updateGates(delta);
      this.updatePowerups(delta);
      this.updateSnakeCoins(delta);
      this.updateChests(delta);
      this.updateCoinPellets(delta);
      this.updateDiamondPellets(delta);
      this.updateFireProjectiles(delta);
      this.updateCollisions();
      this.updateParticles(delta);

      // Random Spawning of Special Entities
      if (!this.isGameOver) {
        if (Math.random() < 0.005 && this.snakeCoins.length < 5) {
          this.spawnSnakeCoin();
        }
        if (Math.random() < 0.003 && this.chests.length < 6) {
          this.spawnChest();
        }
      }

      // Coins keep spawning even after death
      if (Math.random() < 0.015 && this.coinPellets.filter((cp) => cp.active).length < 250) {
        const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 80);
        const a = Math.random() * Math.PI * 2;
        this.spawnCoinPellet(Math.cos(a) * r, Math.sin(a) * r, 10);
      }
      if (Math.random() < 0.002 && this.diamondPellets.filter(dp => dp.active).length < 15) {
        const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 100);
        const a = Math.random() * Math.PI * 2;
        this.spawnDiamondPellet(Math.cos(a) * r, Math.sin(a) * r, 1);
      }

      if (this.pelletComboTimer > 0) {
        this.pelletComboTimer -= delta;
        if (this.pelletComboTimer <= 0) {
          this.pelletCombo = 0;
        }
      }

      this.updateCamera(delta);
      this.updateDistantSwarm(delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateDistantSwarm(delta: number) {
    if (!this.distantSwarmMesh || !this.distantSwarmData.length) return;
    const time = this.clock.getElapsedTime();
    for (let i = 0; i < this.distantSwarmData.length; i++) {
      const item = this.distantSwarmData[i];
      item.heading += Math.sin(time * 1.5 + item.phase) * 0.4 * delta;
      item.x += Math.cos(item.heading) * item.speed * delta;
      item.z += Math.sin(item.heading) * item.speed * delta;

      const halfSize = this.arenaSize / 2 - 25;
      if (Math.abs(item.x) > halfSize || Math.abs(item.z) > halfSize) {
        item.heading = Math.atan2(-item.z, -item.x) + (Math.random() - 0.5);
      }

      _mat4.makeRotationY(-item.heading + Math.PI / 2);
      _mat4.setPosition(item.x, 0.55, item.z);
      this.distantSwarmMesh.setMatrixAt(i, _mat4);
    }
    this.distantSwarmMesh.instanceMatrix.needsUpdate = true;
  }

  // ==========================================
  // MATCH TIME & SHRINKING ZONE
  // ==========================================
  private updateMatchTime(delta: number) {
    this.matchTimeRemaining -= delta;
    this.stats.currentMatchTime = Math.max(0, this.matchTimeRemaining);

    // PlayerBossHunter: Track active match timer and auto-teleport at 11 minutes (660s)
    if (!this.hasTeleportedToPerimeter && !this.isGameOver) {
      this.matchTimer += delta;
      if (this.matchTimer >= this.teleportUnlockTime) {
        this.trigger11MinuteTeleport();
      }
    }

    // Boss spawning logic...
    if (
      this.matchTimeRemaining <= BOSS_SPAWN_TIME_REMAINING &&
      (!this.boss || !this.boss.alive) &&
      !this.stats.bossAlive
    ) {
      this.spawnStageBoss();
    }

    // Active power-up timers
    if (this.stats.activePowerUps.magnet > 0) {
      this.stats.activePowerUps.magnet = Math.max(
        0,
        this.stats.activePowerUps.magnet - delta
      );
    }
    if (this.stats.activePowerUps.speed > 0) {
      this.stats.activePowerUps.speed = Math.max(
        0,
        this.stats.activePowerUps.speed - delta
      );
    }
    if (this.stats.activePowerUps.shield > 0) {
      this.stats.activePowerUps.shield = Math.max(
        0,
        this.stats.activePowerUps.shield - delta
      );
    }

    // Check match completion
    if (this.matchTimeRemaining <= 0 && !this.isGameOver) {
      this.triggerMatchEnd();
    }
  }

  private triggerMatchEnd() {
    this.isGameOver = true;
    const stage = STAGES.find((s) => s.id === this.stats.currentStageId) || STAGES[0];
    const bossDefeated = !this.boss || !this.boss.alive;
    this.isVictory = bossDefeated;

    if (this.isVictory) {
      stage.cleared = true;
      const nextStage = STAGES.find((s) => s.id === stage.id + 1);
      if (nextStage) {
        nextStage.unlocked = true;
      }
      soundManager.playSpinWin();
    } else {
      soundManager.playHurt();
    }

    this.onStatsUpdate({ ...this.stats });
    if (this.onMatchEnd) {
      this.onMatchEnd(this.isVictory);
    }
  }

  // ==========================================
  // CONTROLS & SNAKE STEERING
  // ==========================================
  // ==========================================
  // INPUT & STEERING CONTROLS (ULTRA-SMOOTH JOYSTICK & KEYBOARD)
  // ==========================================
  private updateControls(delta: number) {
    let dx = 0;
    let dz = 0;

    // Keyboard controls (WASD / Arrow Keys)
    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) dz -= 1;
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) dz += 1;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) dx -= 1;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) dx += 1;

    // Virtual Joystick input (Touch / Pointer)
    const joyMagnitude = Math.hypot(this.inputVector.x, this.inputVector.y);
    if (joyMagnitude > 0.04) {
      dx = this.inputVector.x;
      dz = this.inputVector.y;
    }

    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const targetHeading = Math.atan2(dz, dx);
      // Snappy shortest-arc angular interpolation
      let diff = targetHeading - this.player.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Dynamic agility: responsive turning rate that ramps with boost and tilt
      const baseAgility = this.isBoosting ? 14.5 : 11.5;
      const deflectionBonus = joyMagnitude > 0.5 ? 1.0 + (joyMagnitude - 0.5) * 0.4 : 1.0;
      const currentTurnSpeed = baseAgility * deflectionBonus;

      const maxStep = currentTurnSpeed * delta;
      if (Math.abs(diff) <= maxStep) {
        this.player.heading = targetHeading;
      } else {
        this.player.heading += Math.sign(diff) * maxStep;
      }

      while (this.player.heading < -Math.PI) this.player.heading += Math.PI * 2;
      while (this.player.heading > Math.PI) this.player.heading -= Math.PI * 2;
    }
  }

  // ==========================================
  // PLAYER SNAKE UPDATE
  // ==========================================
  private updatePlayer(delta: number) {
    if (!this.player.alive) return;

    // Speed calculation with upgrades + boost + powerup + collection perks
    const speedLevel = this.stats.upgrades.speedLevel;
    const upgradeSpeedBonus = 1 + speedLevel * 0.12;
    const speedPerk =
      1 +
      ((this.collectionPerks.speedBonus || 0) +
        (this.collectionPerks.allStatsBonus || 0)) /
        100;
    let currentSpeed = this.player.speed * upgradeSpeedBonus * speedPerk;

    if (this.stats.activePowerUps.speed > 0) {
      currentSpeed *= 2.2;
    }
    if (this.isBoosting && this.player.length > 5) {
      currentSpeed *= 1.5;
      // Slight length drain when boosting
      this.player.targetLength -= delta * 0.8;
      if (this.player.targetLength < 5) this.player.targetLength = 5;
    }

    // Move Player Head
    this.player.x += Math.cos(this.player.heading) * currentSpeed * delta;
    this.player.z += Math.sin(this.player.heading) * currentSpeed * delta;

    // Hard boundary wall collision
    if (!this.hasTeleportedToPerimeter) {
      const halfSize = this.arenaSize / 2;
      if (Math.abs(this.player.x) > halfSize - 1 || Math.abs(this.player.z) > halfSize - 1) {
        // Clamp position inside main arena
        this.player.x = Math.max(-halfSize + 1, Math.min(halfSize - 1, this.player.x));
        this.player.z = Math.max(-halfSize + 1, Math.min(halfSize - 1, this.player.z));

        // Danger zone damage!
        this.player.targetLength -= delta * 6;
        if (this.player.targetLength < 3) {
          this.eliminateSnake(this.player);
          return;
        }
      }
    } else {
      // Player is hunting the Boss outside on the outer perimeter ring!
      const outerMax = 2100;
      const dCenter = Math.hypot(this.player.x, this.player.z);
      if (dCenter > outerMax) {
        const angle = Math.atan2(this.player.z, this.player.x);
        this.player.x = Math.cos(angle) * outerMax;
        this.player.z = Math.sin(angle) * outerMax;
      }
    }

    this.player.headGroup.position.set(this.player.x, 0, this.player.z);
    this.player.headGroup.rotation.y = -this.player.heading + Math.PI / 2;

    // Dynamic head scaling based on growth (Pellets Eaten)
    const pelletGrowth = (this.stats.pelletsEaten / 50);
    const growthFactor = 1.0 + Math.min(3.0, pelletGrowth);
    
    // Snappy Snap-Open/Decay-Close Jaw Logic (Unity-inspired interpolation)
    const snapSpeed = 25;
    this.player.jawAngle = THREE.MathUtils.lerp(this.player.jawAngle || 0, this.player.targetJawAngle || 0, delta * snapSpeed);
    
    if ((this.player.targetJawAngle || 0) > 0) {
      this.player.targetJawAngle = Math.max(0, this.player.targetJawAngle! - delta * (snapSpeed * 1.5));
    }

    const jaw = this.player.headGroup.getObjectByName('jawGroup');
    if (jaw) {
      jaw.rotation.x = this.player.jawAngle!;
    }

    // Squash & Stretch based on jaw opening
    const stretch = 1.0 + (this.player.jawAngle! / 1.0) * 0.35;
    const squash = 1.0 - (this.player.jawAngle! / 1.0) * 0.2;
    this.player.headGroup.scale.set(growthFactor, growthFactor * stretch, growthFactor * squash);

    // Darting tongue animation
    if (this.player.tongueMesh) {
      this.player.tongueMesh.position.z =
        1.2 + Math.sin(this.clock.getElapsedTime() * 12) * 0.3;
    }

    // Shield Bubble Mesh
    if (this.shieldBubbleMesh) {
      const shieldActive = this.stats.activePowerUps.shield > 0;
      this.shieldBubbleMesh.visible = shieldActive;
      if (shieldActive) {
        this.shieldBubbleMesh.rotation.y += 2.0 * delta;
      }
    }

    // Record coordinate history
    this.player.history.unshift({
      x: this.player.x,
      z: this.player.z,
      heading: this.player.heading,
    });
    if (this.player.history.length > 300) {
      this.player.history.pop();
    }

    // Update trailing segments
    this.updateTailSegments(this.player, delta);

    // Stage Progress slither accumulation
    if (!this.stats.bossAlive) {
      this.stats.stageProgress = Math.min(
        100,
        (this.stats.stageProgress || 0) + delta * 1.5
      );
      if (
        this.stats.stageProgress >= 100 &&
        (!this.boss || !this.boss.alive)
      ) {
        this.spawnStageBoss();
      }
    }

    // Sync stats
    this.stats.currentLength = Math.round(this.player.length);
    this.onStatsUpdate({ ...this.stats });
  }

  // ==========================================
  // TAIL TRAILING PHYSICS & SMOOTHING
  // ==========================================
  private updateTailSegments(snake: SnakeEntity, delta: number) {
    // Smooth target length interpolation
    snake.length = THREE.MathUtils.damp(snake.length, snake.targetLength, 6, delta);
    const requiredSegments = Math.max(3, Math.min(snake.segments.length, Math.floor(snake.length)));

    // Slithering follow-chain logic: sample from history at distance intervals
    const segmentDistance = snake.isBoss ? 1.6 : 0.85;
    let accumulatedDist = 0;
    let historyIdx = 1;

    for (let i = 0; i < snake.segments.length; i++) {
      const seg = snake.segments[i];
      if (i >= requiredSegments) {
        seg.mesh.visible = false;
        continue;
      }
      seg.mesh.visible = true;

      const targetDist = (i + 1) * segmentDistance;
      while (
        historyIdx < snake.history.length - 1 &&
        accumulatedDist < targetDist
      ) {
        const p1 = snake.history[historyIdx - 1];
        const p2 = snake.history[historyIdx];
        const stepDist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        accumulatedDist += stepDist;
        historyIdx++;
      }

      const sample =
        snake.history[Math.min(historyIdx, snake.history.length - 1)] ||
        snake.history[0];

      seg.position.x = THREE.MathUtils.damp(seg.position.x, sample.x, 18, delta);
      seg.position.z = THREE.MathUtils.damp(seg.position.z, sample.z, 18, delta);
      seg.mesh.position.set(seg.position.x, snake.isBoss ? 0.9 : 0.45, seg.position.z);
      seg.mesh.rotation.y = -sample.heading + Math.PI / 2;

      // Dynamic segment scaling based on snake growth (Growth effect)
      let growthFactor = 1.0;
      if (snake.isPlayer) {
        growthFactor = 1.0 + Math.min(3.0, this.stats.pelletsEaten / 50);
      } else if (!snake.isBoss) {
        growthFactor = 1.0 + Math.min(1.5, (snake.length - 8) / 150);
      }
      
      // Natural tail taper
      const taper = Math.max(0.4, 1 - (i / snake.segments.length) * 0.45);
      const finalScale = taper * growthFactor;
      seg.mesh.scale.set(finalScale, finalScale, finalScale);
    }
  }

  // ==========================================
  // AI OPPONENTS (WANDERING, HUNTING, EVASION)
  // ==========================================
  private updateBots(delta: number) {
    this.bots.forEach((bot) => {
      if (!bot.alive) {
        if (bot.respawnTimer !== undefined && bot.respawnTimer > 0) {
          bot.respawnTimer -= delta;
          if (bot.respawnTimer <= 0) {
            this.respawnBot(bot);
          }
        }
        return;
      }

      bot.aiTimer = (bot.aiTimer || 0) - delta;
      if (bot.aiTimer <= 0) {
        bot.aiTimer = 1.5 + Math.random() * 2;

        // State Machine Decision:
        // If player is close and player is larger -> Flee
        const distToPlayer = Math.hypot(this.player.x - bot.x, this.player.z - bot.z);
        if (this.player.alive && distToPlayer < 24 && this.player.length > bot.length * 1.15) {
          bot.aiState = 'flee';
          // Run in opposite direction
          bot.aiTarget = {
            x: bot.x - (this.player.x - bot.x),
            z: bot.z - (this.player.z - bot.z),
          };
        } else if (
          this.player.alive &&
          distToPlayer < 28 &&
          bot.length > this.player.length * 1.15
        ) {
          bot.aiState = 'hunt';
          bot.aiTarget = { x: this.player.x, z: this.player.z };
        } else {
          bot.aiState = 'forage';
          // Check for nearby bots to hunt too (Aggressive AI)
          let targetBot: SnakeEntity | null = null;
          for (const other of this.bots) {
            if (other === bot || !other.alive) continue;
            const d = Math.hypot(other.x - bot.x, other.z - bot.z);
            if (d < 35 && bot.length > other.length * 1.2) {
              targetBot = other;
              break;
            }
          }

          if (targetBot) {
            bot.aiState = 'hunt';
            bot.aiTarget = { x: targetBot.x, z: targetBot.z };
          } else {
            // Find nearest cluster of pellets via spatial grid
            let nearestPellet: PelletData | null = null;
            let minDist = 999;
            const gx = Math.floor((bot.x + 1250) / this.gridSize);
            const gz = Math.floor((bot.z + 1250) / this.gridSize);
            if (gx >= 0 && gx < this.gridDim && gz >= 0 && gz < this.gridDim) {
              const gIdx = gz * this.gridDim + gx;
              const cell = this.pelletGrid[gIdx];
              if (cell && cell.length > 0) {
                const testCount = Math.min(10, cell.length);
                for (let c = 0; c < testCount; c++) {
                  const pIdx = cell[Math.floor(Math.random() * cell.length)];
                  const candidate = this.pellets[pIdx];
                  if (candidate && candidate.active) {
                    const d = Math.hypot(candidate.x - bot.x, candidate.z - bot.z);
                    if (d < minDist) {
                      minDist = d;
                      nearestPellet = candidate;
                    }
                  }
                }
              }
            }
            if (nearestPellet) {
              bot.aiTarget = { x: nearestPellet.x, z: nearestPellet.z };
            } else {
              // Roam persistently across the arena (prevent circling)
              const roamDist = 200 + Math.random() * 300;
              const angle = Math.random() * Math.PI * 2;
              bot.aiTarget = {
                x: bot.x + Math.cos(angle) * roamDist,
                z: bot.z + Math.sin(angle) * roamDist,
              };
              bot.aiTimer = 4.0 + Math.random() * 3.0; // Stay on this target longer
            }
          }
        }
      }

      // Steer towards aiTarget
      if (bot.aiTarget) {
        const targetHeading = Math.atan2(
          bot.aiTarget.z - bot.z,
          bot.aiTarget.x - bot.x
        );
        let diff = targetHeading - bot.heading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        bot.heading += diff * bot.turnSpeed * delta;
      }

      // Move bot forward
      const currentSpeed =
        bot.aiState === 'flee' ? bot.speed * 1.3 : bot.speed;
      bot.x += Math.cos(bot.heading) * currentSpeed * delta;
      bot.z += Math.sin(bot.heading) * currentSpeed * delta;

      // Arena boundary avoidance
      const halfSize = this.arenaSize / 2;
      if (Math.abs(bot.x) > halfSize - 5 || Math.abs(bot.z) > halfSize - 5) {
        bot.heading = Math.atan2(-bot.z, -bot.x) + (Math.random() - 0.5) * 0.5;
        // Also clamp them
        bot.x = Math.max(-halfSize + 1, Math.min(halfSize - 1, bot.x));
        bot.z = Math.max(-halfSize + 1, Math.min(halfSize - 1, bot.z));
      }

      bot.headGroup.position.set(bot.x, 0, bot.z);
      bot.headGroup.rotation.y = -bot.heading + Math.PI / 2;

      // Dynamic head scaling for bots
      const botGrowth = 1.0 + Math.min(1.5, (bot.length - 8) / 150);

      const snapSpeed = 25;
      bot.jawAngle = THREE.MathUtils.lerp(bot.jawAngle || 0, bot.targetJawAngle || 0, delta * snapSpeed);
      if ((bot.targetJawAngle || 0) > 0) {
        bot.targetJawAngle = Math.max(0, bot.targetJawAngle! - delta * (snapSpeed * 1.5));
      }

      const jaw = bot.headGroup.getObjectByName('jawGroup');
      if (jaw) {
        jaw.rotation.x = bot.jawAngle!;
      }

      const stretch = 1.0 + (bot.jawAngle! / 1.0) * 0.35;
      const squash = 1.0 - (bot.jawAngle! / 1.0) * 0.2;
      bot.headGroup.scale.set(botGrowth, botGrowth * stretch, botGrowth * squash);

      bot.history.unshift({ x: bot.x, z: bot.z, heading: bot.heading });
      if (bot.history.length > 400) bot.history.pop();

      this.updateTailSegments(bot, delta);
    });
  }

  private updateSnakeCoins(delta: number) {
    this.snakeCoins.forEach((sc) => {
      if (!sc.alive) return;

      sc.aiTimer = (sc.aiTimer || 0) - delta;
      if (sc.aiTimer <= 0) {
        sc.aiTimer = 1.0 + Math.random() * 2;
        sc.heading += (Math.random() - 0.5) * 2.0;
      }

      sc.x += Math.cos(sc.heading) * sc.speed * delta;
      sc.z += Math.sin(sc.heading) * sc.speed * delta;

      // Arena boundary avoidance
      const halfSize = this.arenaSize / 2;
      if (Math.abs(sc.x) > halfSize - 10 || Math.abs(sc.z) > halfSize - 10) {
        sc.heading = Math.atan2(-sc.z, -sc.x) + (Math.random() - 0.5);
      }

      sc.headGroup.position.set(sc.x, 0.45, sc.z);
      sc.headGroup.rotation.y = -sc.heading + Math.PI / 2;
      
      // Snappy jaw logic for coins
      const snapSpeed = 25;
      sc.jawAngle = THREE.MathUtils.lerp(sc.jawAngle || 0, sc.targetJawAngle || 0, delta * snapSpeed);
      if ((sc.targetJawAngle || 0) > 0) {
        sc.targetJawAngle = Math.max(0, sc.targetJawAngle! - delta * (snapSpeed * 1.5));
      }

      const jaw = sc.headGroup.getObjectByName('jawGroup');
      if (jaw) {
        jaw.rotation.x = sc.jawAngle!;
      }

      // Coins spin individually too
      sc.headGroup.children.forEach(child => {
        if (child.name !== 'jawGroup') {
          child.rotation.y += 5 * delta;
        }
      });

      sc.history.unshift({ x: sc.x, z: sc.z, heading: sc.heading });
      if (sc.history.length > 300) sc.history.pop();

      this.updateTailSegments(sc, delta);
      // Extra rotation for tail segments (coins)
      sc.segments.forEach((seg, idx) => {
        seg.mesh.rotation.y += (5 + idx * 0.5) * delta;
      });
    });
  }

  private updateChests(delta: number) {
    this.chests.forEach((chest) => {
      if (!chest.active) return;
      
      // Floating animation
      chest.meshGroup.position.y = 0.6 + Math.sin(this.clock.getElapsedTime() * 2 + parseInt(chest.id.substring(chest.id.length - 1), 36)) * 0.2;
      chest.meshGroup.rotation.y += 0.5 * delta;
    });
  }

  private updateCoinPellets(delta: number) {
    let collected = false;
    this.coinPellets.forEach((cp) => {
      if (!cp.active) return;

      // Keep the coins spinning on the arena floor (180 deg/sec = Math.PI rad/s)
      cp.mesh.rotation.y += cp.spinSpeed * delta;

      const dPlayer = Math.hypot(this.player.x - cp.x, this.player.z - cp.z);

      // Vacuum magnet effect
      if (this.stats.activePowerUps.magnet > 0 && dPlayer < 65) {
        const pullSpeed = 35 * delta;
        cp.x += ((this.player.x - cp.x) / dPlayer) * pullSpeed;
        cp.z += ((this.player.z - cp.z) / dPlayer) * pullSpeed;
        cp.mesh.position.set(cp.x, 0.45, cp.z);
      }

      // Consumed by player
      if (dPlayer < 2.2) {
        cp.active = false;
        cp.mesh.visible = false;

        // Add gold to player wallet
        this.stats.totalPermanentCoins += cp.coinValue;
        this.stats.cashEarnedThisMatch += cp.coinValue;
        collected = true;

        // Play metallic coin sound effect & spark burst
        soundManager.playCoinCollect();
        this.spawnParticleBurst(cp.x, cp.z, '#ffd700', 8, 'spark');

        this.onFloatingText({
          id: Math.random().toString(),
          text: `💰 +${cp.coinValue} COINS!`,
          color: '#fbbf24',
          x: window.innerWidth / 2,
          y: 220,
          opacity: 0.8,
        });
      }
    });

    if (collected) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  private updateDiamondPellets(delta: number) {
    let collected = false;
    this.diamondPellets.forEach((dp) => {
      if (!dp.active) return;
      dp.mesh.rotation.y += dp.spinSpeed * delta;
      dp.mesh.rotation.x += delta * 0.5;

      const dPlayer = Math.hypot(this.player.x - dp.x, this.player.z - dp.z);
      if (this.stats.activePowerUps.magnet > 0 && dPlayer < 65) {
        const pullSpeed = 35 * delta;
        dp.x += ((this.player.x - dp.x) / dPlayer) * pullSpeed;
        dp.z += ((this.player.z - dp.z) / dPlayer) * pullSpeed;
        dp.mesh.position.set(dp.x, 0.8, dp.z);
      }

      if (dPlayer < 2.2) {
        dp.active = false;
        dp.mesh.visible = false;
        this.stats.totalGems += dp.coinValue;
        this.stats.gemsEarnedThisMatch += dp.coinValue;
        collected = true;
        soundManager.playPowerup();
        this.spawnParticleBurst(dp.x, dp.z, '#22d3ee', 15, 'spark');
        this.onFloatingText({
          id: Math.random().toString(),
          text: `💎 +${dp.coinValue} DIAMOND!`,
          color: '#22d3ee',
          x: window.innerWidth / 2,
          y: 240,
          opacity: 1,
        });
      }
    });
    if (collected) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  // ==========================================
  // STAGE BOSS UPDATE (PerimeterBossPatrol)
  // ==========================================
  private updateBoss(delta: number) {
    if (!this.boss || !this.boss.alive) return;

    // Check Enraged Phase 2 (<50% HP)
    if (this.boss.hp <= this.boss.maxHp * 0.5 && this.stats.bossPhase === 1) {
      this.stats.bossPhase = 2;
      this.boss.speed *= 1.35;
      soundManager.playBossAlert();
      this.triggerScreenShake(1.4);
      this.spawnParticleBurst(this.boss.x, this.boss.z, '#ef4444', 60, 'confetti');
      this.spawnParticleBurst(this.boss.x, this.boss.z, '#fbbf24', 40, 'spark');

      this.onFloatingText({
        id: Math.random().toString(),
        text: `🔥 BOSS ENRAGED! PHASE 2 SPEED SURGE! 🔥`,
        color: '#f97316',
        x: window.innerWidth / 2,
        y: 130,
        opacity: 1,
      });
    }

    // Perimeter Settings (PerimeterBossPatrol)
    // Radius of the outer boundary wall loop (outside arena perimeter walls)
    const perimeterRadius = 1850;
    // Movement speed around the perimeter
    const patrolSpeed = this.boss.speed * 18;

    // Advance the angle along the circle loop over time: (patrolSpeed / perimeterRadius) * deltaTime
    this.bossPatrolAngle += (patrolSpeed / perimeterRadius) * delta;

    // Calculate circular coordinates outside the arena boundary
    const targetX = Math.cos(this.bossPatrolAngle) * perimeterRadius;
    const targetZ = Math.sin(this.bossPatrolAngle) * perimeterRadius;

    // Rotate boss to face movement direction along the circle (Quaternion.LookRotation equivalent)
    const moveDx = targetX - this.boss.x;
    const moveDz = targetZ - this.boss.z;
    if (Math.hypot(moveDx, moveDz) > 0.001) {
      const targetHeading = Math.atan2(moveDz, moveDx);
      let diff = targetHeading - this.boss.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.boss.heading += diff * Math.min(1, delta * 10);
    }

    // Keep boss locked to the outer perimeter ring
    this.boss.x = targetX;
    this.boss.z = targetZ;

    this.boss.headGroup.position.set(this.boss.x, 0.9, this.boss.z);
    this.boss.headGroup.rotation.y = -this.boss.heading + Math.PI / 2;

    this.boss.history.unshift({
      x: this.boss.x,
      z: this.boss.z,
      heading: this.boss.heading,
    });
    if (this.boss.history.length > 500) this.boss.history.pop();
    this.updateTailSegments(this.boss, delta);
    this.stats.bossHp = this.boss.hp;
  }

  // ==========================================
  // PELLETS & MAGNET MECHANICS
  // ==========================================
  private updatePellets(delta: number) {
    const magnetPerk =
      ((this.collectionPerks.magnetBonus || 0) +
        (this.collectionPerks.allStatsBonus || 0)) *
      0.15;
    const magnetRadius =
      (this.stats.activePowerUps.magnet > 0 ? 65 : 0) +
      5 +
      this.stats.upgrades.magnetLevel * 2.5 +
      magnetPerk;

    let matrixDirty = false;

    // Spatial Partitioning Optimization: Only check pellets in nearby grid cells
    const agents = [this.player, ...this.bots.filter(b => b.alive), ...this.snakeCoins.filter(s => s.alive)];
    const checkedPellets = new Set<number>();

    agents.forEach(agent => {
      const gx = Math.floor((agent.x + 1250) / this.gridSize);
      const gz = Math.floor((agent.z + 1250) / this.gridSize);
      
      // Check 3x3 neighborhood
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const ngx = gx + ox;
          const ngz = gz + oz;
          if (ngx >= 0 && ngx < this.gridDim && ngz >= 0 && ngz < this.gridDim) {
            const gIdx = ngz * this.gridDim + ngx;
            const cell = this.pelletGrid[gIdx];
            if (!cell) continue;

            for (let i = 0; i < cell.length; i++) {
              const pIdx = cell[i];
              if (checkedPellets.has(pIdx)) continue;
              checkedPellets.add(pIdx);

              const p = this.pellets[pIdx];
              if (!p.active) continue;

              const dAgent = Math.hypot(p.x - agent.x, p.z - agent.z);
              
              if (agent.isPlayer) {
                // Player vacuum logic
                if (dAgent < magnetRadius) {
                  const pullSpeed = 24 * delta;
                  p.x += ((agent.x - p.x) / dAgent) * pullSpeed;
                  p.z += ((agent.z - p.z) / dAgent) * pullSpeed;
                  _mat4.makeTranslation(p.x, 0.45, p.z);
                  this.pelletInstancedMesh.setMatrixAt(p.meshIndex, _mat4);
                  matrixDirty = true;
                }
                // Player eat logic
                if (dAgent < 1.4) {
                  p.active = false;
                  soundManager.playPelletEat();
                  this.eatPellet(agent, p);
                  this.respawnPellet(p);
                  matrixDirty = true;
                  continue;
                }
              } else {
                // Bot eat logic
                if (dAgent < 1.3) {
                  p.active = false;
                  agent.targetLength += 0.4;
                  agent.targetJawAngle = 1.4;
                  this.respawnPellet(p);
                  matrixDirty = true;
                  continue;
                }
              }
            }
          }
        }
      }
    });

    if (matrixDirty) {
      this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private eatPellet(snake: SnakeEntity, pellet: PelletData) {
    snake.targetLength += 0.5;
    snake.exp += 10;
    this.stats.score += 25;
    this.stats.pelletsEaten++;

    if (snake.isPlayer) {
      this.stats.totalPermanentCoins += 1;
      this.stats.cashEarnedThisMatch += 1;
    }

    // Trigger snappy munch animation
    snake.targetJawAngle = 1.4;

    if (!this.stats.bossAlive) {
      this.stats.stageProgress = Math.min(100, (this.stats.stageProgress || 0) + 1.8);
      if (this.stats.stageProgress >= 100 && (!this.boss || !this.boss.alive)) {
        this.spawnStageBoss();
      }
    }

    // Pitch-shifted combo chain audio
    this.pelletCombo++;
    this.pelletComboTimer = 0.5;
    soundManager.playPelletEatChain(this.pelletCombo);

    // Particle burst on floor
    this.spawnParticleBurst(pellet.x, pellet.z, pellet.color, 12, 'spark');

    // In-Match Evolution Level-Up Progression
    if (snake.exp >= this.stats.expForNextLevel) {
      snake.level++;
      snake.exp = 0;
      this.stats.expForNextLevel = Math.round(this.stats.expForNextLevel * 1.4);
      this.stats.level = snake.level;
      soundManager.playLevelUp();
      this.triggerScreenShake(0.6);

      // Check Evolution Tier
      const tier =
        [...EVOLUTION_TIERS].reverse().find((t) => snake.level >= t.minLevel) ||
        EVOLUTION_TIERS[0];

      this.onFloatingText({
        id: Math.random().toString(),
        text: `⚡ LEVEL UP! ${tier.title} (Lvl ${snake.level})`,
        color: '#38bdf8',
        x: window.innerWidth / 2,
        y: 180,
        opacity: 1,
      });
    }
  }

  // ==========================================
  // EVOLUTION GATES INTERACTION
  // ==========================================
  private updateGates(delta: number) {
    this.gates.forEach((gate) => {
      if (gate.cooldown > 0) {
        gate.cooldown -= delta;
        return;
      }

      // Player passing through gate
      const d = Math.hypot(gate.x - this.player.x, gate.z - this.player.z);
      if (d < 3.2 && this.player.alive) {
        gate.cooldown = 2.0; // Prevent spamming
        const isPositive = gate.type !== 'sub';
        soundManager.playGatePass(isPositive);

        if (gate.type === 'add') {
          this.player.targetLength += gate.value;
        } else if (gate.type === 'mult') {
          this.player.targetLength = Math.max(
            5,
            Math.round(this.player.targetLength * gate.value)
          );
        } else if (gate.type === 'sub') {
          this.player.targetLength = Math.max(5, this.player.targetLength - gate.value);
        }

        this.onFloatingText({
          id: Math.random().toString(),
          text: `GATE ${gate.label}!`,
          color: isPositive ? '#22d3ee' : '#ef4444',
          x: window.innerWidth / 2,
          y: 220,
          opacity: 1,
        });
      }
    });
  }

  // ==========================================
  // POWER-UPS INTERACTION
  // ==========================================
  private updatePowerups(delta: number) {
    this.powerups.forEach((pu) => {
      if (!pu.active) return;

      // Bobbing and rotating 3D animation
      pu.group.rotation.y += 2.0 * delta;
      pu.group.position.y = 1.2 + Math.sin(this.clock.getElapsedTime() * 3 + pu.id) * 0.25;

      // 1. Player collection
      const dPlayer = Math.hypot(pu.x - this.player.x, pu.z - this.player.z);
      if (dPlayer < 3.0 && this.player.alive) {
        pu.active = false;
        pu.group.visible = false;
        soundManager.playPowerupPickup();

        const duration = 12; // 12 seconds
        const typeStr = pu.type.toUpperCase();
        this.addKillFeedEntry(`You collected a ${typeStr}! 🎁`, '#22d3ee');

        if (pu.type === 'magnet') {
          this.stats.activePowerUps.magnet = duration;
        } else if (pu.type === 'speed') {
          this.stats.activePowerUps.speed = duration;
        } else if (pu.type === 'shield') {
          this.stats.activePowerUps.shield = duration;
        } else if (pu.type === 'fire') {
          this.stats.activePowerUps.fire = duration;
        }

        this.onFloatingText({
          id: Math.random().toString(),
          text: `⚡ ${typeStr} ACTIVE!`,
          color: '#fbbf24',
          x: window.innerWidth / 2,
          y: 260,
          opacity: 1,
        });

        // Trigger smooth mouth animation
        this.player.targetJawAngle = 1.4;

        this.respawnPowerup(pu);
        return;
      }

      // 2. Bot collection (they can "eat" them to prevent player from getting them)
      for (const bot of this.bots) {
        if (!bot.alive) continue;
        const dBot = Math.hypot(pu.x - bot.x, pu.z - bot.z);
        if (dBot < 2.5) {
          pu.active = false;
          pu.group.visible = false;
          bot.targetLength += 5.0; // Small reward for bots
          bot.targetJawAngle = 1.4;
          this.addKillFeedEntry(`Opponent collected ${pu.type.toUpperCase()}!`, '#94a3b8');
          this.respawnPowerup(pu);
          break;
        }
      }
    });
  }

  private respawnPowerup(pu: PowerUpItem) {
    // Respawn powerup after 25s
    setTimeout(() => {
      pu.active = true;
      pu.group.visible = true;
      const halfSize = this.arenaSize / 2 - 10;
      pu.x = (Math.random() - 0.5) * halfSize * 2;
      pu.z = (Math.random() - 0.5) * halfSize * 2;
      pu.group.position.set(pu.x, 1.2, pu.z);
    }, 25000);
  }

  private shootFireProjectile() {
    if (!this.player.alive) return;
    let targetX = this.player.x + Math.cos(this.player.heading) * 30;
    let targetZ = this.player.z + Math.sin(this.player.heading) * 30;
    let minDist = Infinity;

    this.bots.forEach((b) => {
      if (!b.alive) return;
      const d = Math.hypot(b.x - this.player.x, b.z - this.player.z);
      if (d < minDist && d < 45) {
        minDist = d;
        targetX = b.x;
        targetZ = b.z;
      }
    });

    if (this.boss && this.boss.alive) {
      const d = Math.hypot(this.boss.x - this.player.x, this.boss.z - this.player.z);
      if (d < minDist) {
        targetX = this.boss.x;
        targetZ = this.boss.z;
      }
    }

    const angle = Math.atan2(targetZ - this.player.z, targetX - this.player.x);
    const speed = 40;
    const vx = Math.cos(angle) * speed;
    const vz = Math.sin(angle) * speed;

    const mesh = new THREE.Mesh(this.sharedFireGeo, this.sharedFireMat);
    mesh.position.set(this.player.x, 1.0, this.player.z);
    this.scene.add(mesh);

    this.fireProjectiles.push({
      x: this.player.x,
      z: this.player.z,
      vx,
      vz,
      mesh,
      active: true,
    });

    soundManager.playLaserShoot();
  }

  private updateFireProjectiles(delta: number) {
    if (this.stats.activePowerUps.fire > 0) {
      this.fireShotCooldown -= delta;
      if (this.fireShotCooldown <= 0) {
        this.fireShotCooldown = 0.35;
        this.shootFireProjectile();
      }
    }

    this.fireProjectiles.forEach((p) => {
      if (!p.active) return;
      p.x += p.vx * delta;
      p.z += p.vz * delta;
      p.mesh.position.set(p.x, 1.0, p.z);
      p.mesh.rotation.y += 12 * delta;

      // Check collision with bots
      this.bots.forEach((bot) => {
        if (!bot.alive || !p.active) return;
        const d = Math.hypot(p.x - bot.x, p.z - bot.z);
        if (d < 3.0) {
          p.active = false;
          p.mesh.visible = false;
          this.scene.remove(p.mesh);
          this.eliminateSnake(bot, this.player.name);
          this.awardPlayerKill(bot);
        }
      });

      // Check collision with boss
      if (this.boss && this.boss.alive && p.active) {
        const dBoss = Math.hypot(p.x - this.boss.x, p.z - this.boss.z);
        if (dBoss < 4.5) {
          p.active = false;
          p.mesh.visible = false;
          this.scene.remove(p.mesh);
          this.boss.hp -= 45;
          soundManager.playKill();
          this.spawnParticleBurst(this.boss.x, this.boss.z, '#ef4444', 45, 'confetti');
          this.onFloatingText({
            id: Math.random().toString(),
            text: `🔥 FIREBALL HIT BOSS! -45 HP!`,
            color: '#f59e0b',
            x: window.innerWidth / 2,
            y: 160,
            opacity: 1,
          });
          if (this.boss.hp <= 0) {
            this.eliminateSnake(this.boss, this.player.name);
            this.stats.bossAlive = false;
            this.stats.score += 2500;
            this.stats.totalPermanentCoins += 500;
            this.stats.cashEarnedThisMatch += 500;
            this.stats.totalGems += 5;
            this.stats.gemsEarnedThisMatch += 5;
            soundManager.playSpinWin();
            this.onStatsUpdate({ ...this.stats });
            setTimeout(() => this.triggerMatchEnd(), 2000);
          }
        }
      }

      // Arena bounds check
      if (Math.hypot(p.x, p.z) > this.arenaSize / 2) {
        p.active = false;
        p.mesh.visible = false;
        this.scene.remove(p.mesh);
      }
    });

    this.fireProjectiles = this.fireProjectiles.filter((p) => p.active);
  }



  public tryPurchaseUpgrade(type: UpgradeType): boolean {
    const keyMap: Record<UpgradeType, keyof PlayerUpgrades> = {
      speed: 'speedLevel',
      startLength: 'startLengthLevel',
      income: 'incomeLevel',
      magnet: 'magnetLevel',
    };
    const statKey = keyMap[type];
    const currentLvl = this.stats.upgrades[statKey];
    const cost = getUpgradeCost(type, currentLvl);

    if (this.stats.totalPermanentCoins >= cost && currentLvl < 10) {
      this.stats.totalPermanentCoins -= cost;
      this.stats.upgrades[statKey]++;
      soundManager.playUpgrade();

      this.onFloatingText({
        id: Math.random().toString(),
        text: `★ UPGRADED ${UPGRADE_CONFIG[type].name} (Lvl ${this.stats.upgrades[statKey]})!`,
        color: '#10b981',
        x: window.innerWidth / 2,
        y: 200,
        opacity: 1,
      });

      this.onStatsUpdate({ ...this.stats });
      return true;
    }
    return false;
  }

  // ==========================================
  // COMBAT & COLLISION RESOLUTION (GOLDEN RULE: HEAD VS BODY)
  // ==========================================
  private updateCollisions() {
    if (!this.player.alive) return;
    const hasShield = this.stats.activePowerUps.shield > 0;

    // Obstacle collisions
    this.obstacles.forEach((obs) => {
      // Player head collision with obstacle
      const dObs = Math.hypot(this.player.x - obs.x, this.player.z - obs.z);
      if (dObs < obs.radius + 1.0 && this.player.alive) {
        const angle = Math.atan2(this.player.z - obs.z, this.player.x - obs.x);
        this.player.x = obs.x + Math.cos(angle) * (obs.radius + 1.1);
        this.player.z = obs.z + Math.sin(angle) * (obs.radius + 1.1);
        this.player.heading = angle;
      }

      // Bot collision with obstacle
      this.bots.forEach((bot) => {
        if (!bot.alive) return;
        const dBot = Math.hypot(bot.x - obs.x, bot.z - obs.z);
        if (dBot < obs.radius + 1.0) {
          const angle = Math.atan2(bot.z - obs.z, bot.x - obs.x);
          bot.x = obs.x + Math.cos(angle) * (obs.radius + 1.1);
          bot.z = obs.z + Math.sin(angle) * (obs.radius + 1.1);
          bot.heading = angle;
        }
      });
    });

    // 1. Player vs Bots (Scale-Aware Collisions)
    const playerGrowth = 1.0 + Math.min(3.0, this.stats.pelletsEaten / 50);

    this.bots.forEach((bot) => {
      if (!bot.alive) return;
      const botGrowth = 1.0 + Math.min(1.5, (bot.length - 8) / 150);

      // Head-to-Head collision (Deadly based on length/shield)
      const dHead = Math.hypot(this.player.x - bot.x, this.player.z - bot.z);
      if (dHead > 35) return; // Broadphase cull for far bots

      const headThreshold = (playerGrowth + botGrowth) * 0.9;

      if (dHead < headThreshold) {
        // Player head-on collision: AI always dies!
        this.eliminateSnake(bot, this.player.name);
        this.awardPlayerKill(bot);
      }

      // Player Head vs Bot Body Segments (Player touches bot -> bot dies!)
      const bodyThreshold = (playerGrowth + botGrowth) * 0.7;
      for (let s = 1; s < bot.segments.length; s++) {
        const seg = bot.segments[s];
        if (!seg.mesh.visible) continue;

        const dSeg = Math.hypot(
          this.player.x - seg.position.x,
          this.player.z - seg.position.z
        );

        if (dSeg < bodyThreshold) {
          this.eliminateSnake(bot, this.player.name);
          this.awardPlayerKill(bot);
          break;
        }
      }

      // Bot Head vs Player Body Segments (Bot touches player -> bot dies!)
      for (let s = 1; s < this.player.segments.length; s++) {
        const seg = this.player.segments[s];
        if (!seg.mesh.visible) continue;

        const dSeg = Math.hypot(
          bot.x - seg.position.x,
          bot.z - seg.position.z
        );
        if (dSeg < bodyThreshold) {
          // Bot hits player body -> Bot is eliminated!
          this.eliminateSnake(bot, this.player.name);
          this.awardPlayerKill(bot);
          break;
        }
      }
    });

    // 3. Bot vs Bot Combat (Scale-Aware with Proximity Culling)
    for (let i = 0; i < this.bots.length; i++) {
      const b1 = this.bots[i];
      if (!b1.alive) continue;
      const b1Growth = 1.0 + Math.min(1.5, (b1.length - 8) / 150);

      for (let j = 0; j < this.bots.length; j++) {
        if (i === j) continue;
        const b2 = this.bots[j];
        if (!b2.alive) continue;
        const b2Growth = 1.0 + Math.min(1.5, (b2.length - 8) / 150);

        // Broadphase distance cull: skip segment loop if bots are far apart
        const dHead = Math.hypot(b1.x - b2.x, b1.z - b2.z);
        if (dHead > 18) continue;

        // Head-to-Head
        const headThreshold = (b1Growth + b2Growth) * 0.8;

        if (dHead < headThreshold) {
          // Snake head-to-head collision disabled
          break;
        }

        // b1 Head vs b2 Body (Deadly Collision)
        const bodyThreshold = (b1Growth + b2Growth) * 0.6;
        for (let s = 1; s < b2.segments.length; s++) {
          const seg = b2.segments[s];
          if (!seg.mesh.visible) continue;
          
          const dSeg = Math.hypot(b1.x - seg.position.x, b1.z - seg.position.z);
          if (dSeg < bodyThreshold) {
            // Snake head-to-body collision disabled
            break;
          }
        }
      }
    }
    // 4. Snake Coin & Treasure Chest Collisions
    this.snakeCoins.forEach((sc) => {
      if (!sc.alive) return;
      const dHead = Math.hypot(this.player.x - sc.x, this.player.z - sc.z);
      if (dHead < 2.5) {
        sc.alive = false;
        // Return parts to pool
        sc.headGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.visible = false;
          } else if (child instanceof THREE.Group) {
            child.children.forEach(gc => {
              if (gc instanceof THREE.Mesh) gc.visible = false;
            });
          }
        });
        this.scene.remove(sc.headGroup);
        sc.segments.forEach(s => {
          s.mesh.visible = false;
        });
        const reward = 250 + (this.stats.upgrades.incomeLevel * 50);
        this.stats.totalPermanentCoins += reward;
        this.stats.score += 500;
        soundManager.playSpinWin();
        this.spawnParticleBurst(sc.x, sc.z, '#ffd700', 40, 'confetti');
        this.spawnParticleBurst(sc.x, sc.z, '#ffffff', 20, 'spark');
        this.onFloatingText({
          id: Math.random().toString(),
          text: `🐍💰 SNAKE COIN EATEN! +${reward} COINS`,
          color: '#fbbf24',
          x: window.innerWidth / 2,
          y: 200,
          opacity: 1
        });
      }
    });
    this.snakeCoins = this.snakeCoins.filter(sc => sc.alive);

    this.chests.forEach((chest) => {
      if (!chest.active) return;
      const dChest = Math.hypot(this.player.x - chest.x, this.player.z - chest.z);
      if (dChest < 4.0) {
        this.openTreasureChest(chest);
      }
    });
    this.chests = this.chests.filter(c => c.active);

    // 2. Boss Combat
    if (this.boss && this.boss.alive) {
      const dBossHead = Math.hypot(
        this.player.x - this.boss.x,
        this.player.z - this.boss.z
      );

      // Hit boss head or body
      if (dBossHead < 3.8) {
        if (this.canEatBoss || hasShield || this.player.length > 20) {
          // Deal damage to boss
          const dmg = this.canEatBoss ? 65 : 45;
          this.boss.hp -= dmg;
          this.player.targetJawAngle = 1.4;
          soundManager.playKill();
          this.spawnParticleBurst(this.boss.x, this.boss.z, this.boss.skinPrimary, 20, 'confetti');

          this.onFloatingText({
            id: Math.random().toString(),
            text: this.canEatBoss
              ? `🦈 CHOMPED THE BOSS HEAD! -${dmg} HP!`
              : `💥 BOSS HIT: -${dmg} HP!`,
            color: '#f59e0b',
            x: window.innerWidth / 2,
            y: 140,
            opacity: 1,
          });

          if (this.boss.hp <= 0) {
            // Defeat Boss!
            this.eliminateSnake(this.boss);
            this.stats.bossAlive = false;
            this.stats.score += 2500;
            this.stats.totalPermanentCoins += 500;
            this.stats.totalGems += 5;
            this.stats.gemsEarnedThisMatch += 5;
            soundManager.playSpinWin();
            this.onStatsUpdate({ ...this.stats });

            this.onFloatingText({
              id: Math.random().toString(),
              text: `👑 BOSS DEFEATED! STAGE CLEARED!`,
              color: '#facc15',
              x: window.innerWidth / 2,
              y: 120,
              opacity: 1,
            });
            setTimeout(() => this.triggerMatchEnd(), 2000);
          }
        } else {
          // Crushed by boss
          this.eliminateSnake(this.player);
          soundManager.playHurt();
        }
      }

      // Head vs Boss Body Segments: Consume boss tail segment safely (PlayerBossHunter)!
      for (let s = 1; s < this.boss.segments.length; s++) {
        const seg = this.boss.segments[s];
        if (!seg.mesh.visible) continue;

        const dSeg = Math.hypot(this.player.x - seg.position.x, this.player.z - seg.position.z);
        if (dSeg < 3.8) {
          const dmg = this.canEatBoss ? 35 : 25;
          this.boss.hp -= dmg;
          this.boss.targetLength = Math.max(10, this.boss.targetLength - 1.5);
          this.player.targetLength += 1.5;
          this.player.targetJawAngle = 1.4;
          soundManager.playPelletEat();
          this.spawnParticleBurst(seg.position.x, seg.position.y, this.boss.skinPrimary, 15, 'spark');

          this.onFloatingText({
            id: Math.random().toString(),
            text: this.canEatBoss
              ? `🦷 Chomped a piece of the Boss from the outside! (-${dmg} HP)`
              : `🦷 BOSS CHOMP! -${dmg} HP (+1.5 TAIL)`,
            color: '#fbbf24',
            x: window.innerWidth / 2,
            y: 155,
            opacity: 0.9,
          });

          if (this.boss.hp <= 0) {
            this.eliminateSnake(this.boss, this.player.name);
            this.stats.bossAlive = false;
            this.stats.score += 2500;
            this.stats.totalPermanentCoins += 500;
            this.stats.cashEarnedThisMatch += 500;
            this.stats.totalGems += 5;
            this.stats.gemsEarnedThisMatch += 5;
            soundManager.playSpinWin();
            this.onStatsUpdate({ ...this.stats });
            setTimeout(() => this.triggerMatchEnd(), 2000);
          }
          break;
        }
      }
    }
  }

  // ==========================================
  // KILL REWARDS & COMBAT SYSTEM
  // ==========================================
  public awardPlayerKill(victim: SnakeEntity) {
    this.stats.botsKilled++;
    
    // Collect diamonds every single time a player gets a kill!
    this.stats.totalGems += 1;
    this.stats.gemsEarnedThisMatch += 1;

    // Coins reward (bonus after 3 kills: 250 coins, otherwise 100 coins)
    const coinReward = this.stats.botsKilled > 3 ? 250 : 100;
    this.stats.totalPermanentCoins += coinReward;
    this.stats.cashEarnedThisMatch += coinReward;
    this.stats.score += 200;

    soundManager.playKill();
    this.spawnParticleBurst(victim.x, victim.z, '#22d3ee', 25, 'spark');
    this.spawnParticleBurst(victim.x, victim.z, '#ffd700', 25, 'spark');

    const skinTag = victim.customSkinName ? `[${victim.customSkinName}] ` : '';
    this.onFloatingText({
      id: `kill_${Date.now()}_${Math.random()}`,
      text: `💎 +1 DIAMOND & +${coinReward} COINS! (Eliminated ${skinTag}${victim.name})`,
      color: '#38bdf8',
      x: window.innerWidth / 2,
      y: 170,
      opacity: 1,
    });

    // Notify React immediately so coins and diamonds are updated and persisted
    this.onStatsUpdate({ ...this.stats });
  }

  // ==========================================
  // DEATH & LOOT BURST MECHANICS
  // ==========================================
  private eliminateSnake(snake: SnakeEntity, attackerName?: string) {
    snake.alive = false;
    this.scene.remove(snake.headGroup);

    // Screen Shake & Particle Explosion Burst
    this.triggerScreenShake(1.2);
    this.spawnParticleBurst(snake.x, snake.z, snake.skinPrimary, 40, 'confetti');
    this.spawnParticleBurst(snake.x, snake.z, '#ffffff', 20, 'spark');

    // Kill Feed Entry
    const killer = attackerName || (snake.isPlayer ? 'Arena Hazard' : 'A Rival Snake');
    if (snake.isPlayer) {
      this.addKillFeedEntry(`YOU WERE ELIMINATED! 💀`, '#ef4444');
    } else {
      const isPlayerKill = attackerName === 'YOU' || (this.player && attackerName === this.player.name) || !attackerName;
      const msg = isPlayerKill
        ? `YOU defeated ${snake.name}! ⚔️`
        : `${killer} defeated ${snake.name}`;
      this.addKillFeedEntry(msg, snake.skinGlow || '#f8fafc');
    }

    // Burst poop onto arena floor!
    const lootCount = Math.min(45, Math.floor(snake.length * 2));
    for (let i = 0; i < lootCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.5 + Math.random() * 8;
      const lx = snake.x + Math.cos(angle) * dist;
      const lz = snake.z + Math.sin(angle) * dist;

      // Find inactive or random pellet slot to repurpose as brown 'poop'
      const p = this.pellets[i % this.pellets.length];
      if (p) {
        p.x = lx;
        p.z = lz;
        p.active = true;
        p.value = 0; // Poop has no value
        // Use brown color for poop
        this.pelletInstancedMesh.setColorAt(p.meshIndex, new THREE.Color(0x4B3621));
        _mat4.makeTranslation(lx, 0.45, lz);
        this.pelletInstancedMesh.setMatrixAt(p.meshIndex, _mat4);
      }
    }
    if (this.pelletInstancedMesh.instanceColor) {
      this.pelletInstancedMesh.instanceColor.needsUpdate = true;
    }

    // Drop Gold Coins on death! (Requested: Coins appear after death)
    const coinLootCount = snake.isPlayer ? 15 : 5;
    for (let i = 0; i < coinLootCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.0 + Math.random() * 6;
      this.spawnCoinPellet(
        snake.x + Math.cos(angle) * dist,
        snake.z + Math.sin(angle) * dist,
        snake.isPlayer ? 25 : 15
      );
    }
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

    // Clean up segments
    if (snake.isPlayer || snake.isBoss) {
      snake.segments.forEach((seg) => {
        this.scene.remove(seg.mesh);
        seg.mesh.geometry.dispose();
      });
      snake.segments = [];
    } else {
      // For AI bots: hide segments and schedule respawn countdown
      snake.segments.forEach((seg) => {
        seg.mesh.visible = false;
      });
      snake.respawnTimer = 3.5 + Math.random() * 2;
    }

    if (snake.isPlayer) {
      this.isGameOver = true;
      this.onStatsUpdate({ ...this.stats });
      if (this.onMatchEnd) {
        this.onMatchEnd(false);
      }
    }
  }

  // ==========================================
  // CAMERA FOLLOW SYSTEM
  // ==========================================
  private updateCamera(delta: number) {
    if (!this.player) return;

    let targetCamY = 32;
    let targetCamZ = 24;

    if (this.cameraMode === 'close') {
      targetCamY = 20;
      targetCamZ = 16;
    } else if (this.cameraMode === 'isometric') {
      targetCamY = 45;
      targetCamZ = 35;
    } else {
      // Dynamic: zooms out much more when snake grows giant from pellets
      const growthFactor = Math.min(2.5, 1 + (this.player.length * 0.012) + (this.stats.pelletsEaten / 120));
      targetCamY = (32 + this.cameraZoomOffset) * growthFactor;
      targetCamZ = (24 + this.cameraZoomOffset) * growthFactor;
    }

    const camX = this.player.x;
    const camY = targetCamY;
    const camZ = this.player.z + targetCamZ;

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      camX,
      5,
      delta
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      camY,
      4,
      delta
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      camZ,
      5,
      delta
    );

    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 3.5);
    }

    _vec3A.set(this.player.x, 1.2, this.player.z);
    this.camera.lookAt(_vec3A);

    // Keep light centered near player for sharp shadows
    if (this.dirLight) {
      this.dirLight.position.set(
        this.player.x + 35,
        50,
        this.player.z + 25
      );
      this.dirLight.target.position.copy(_vec3A);
      this.dirLight.target.updateMatrixWorld();
    }
  }

  public getRadarData() {
    return {
      playerPos: { x: this.player ? this.player.x : 0, z: this.player ? this.player.z : 0 },
      botPositions: this.bots.filter((b) => b.alive).map((b) => ({ x: b.x, z: b.z })),
      bossPos: this.boss && this.boss.alive ? { x: this.boss.x, z: this.boss.z } : null,
      powerups: this.powerups.filter((p) => p.active).map((p) => ({ x: p.x, z: p.z, type: p.type })),
      currentRadius: this.arenaSize / 2,
      maxRadius: this.arenaSize / 2,
    };
  }

  public getLiveLeaderboard(): LeaderboardEntry[] {
    const rawList: {
      name: string;
      length: number;
      score: number;
      level: number;
      isPlayer: boolean;
      isBoss: boolean;
      color: string;
      customSkinName?: string;
      customSkinBadge?: string;
    }[] = [];

    // Player's dynamic rank in the 12,000,000 AI snake player arena!
    const playerGlobalRank = Math.max(
      1,
      Math.floor(TOTAL_ARENA_SNAKES - (this.stats.score * 1650) - (this.player.length * 480) - (this.stats.botsKilled * 60000))
    );

    if (this.player && this.player.alive) {
      const equipped = INITIAL_SKINS.find((s) => s.id === this.stats.equippedSkinId) || INITIAL_SKINS[0];
      rawList.push({
        name: 'YOU (' + this.player.name + ')',
        length: Math.round(this.player.length),
        score: this.stats.score,
        level: this.player.level,
        isPlayer: true,
        isBoss: false,
        color: '#10b981',
        customSkinName: equipped.name,
        customSkinBadge: `[${equipped.name}]`,
      });
    }

    this.bots.forEach((b) => {
      if (b.alive) {
        rawList.push({
          name: b.name,
          length: Math.round(b.length),
          score: Math.round(b.length * 120),
          level: b.level,
          isPlayer: false,
          isBoss: false,
          color: b.skinPrimary,
          customSkinName: b.customSkinName,
          customSkinBadge: b.hasCustomSkin ? `[${b.customSkinName}]` : undefined,
        });
      }
    });

    if (this.boss && this.boss.alive) {
      rawList.push({
        name: '⚠️ ' + this.boss.name,
        length: Math.round(this.boss.length),
        score: 50000,
        level: 15,
        isPlayer: false,
        isBoss: true,
        color: '#ef4444',
        customSkinName: 'Titan Boss Wyrm',
        customSkinBadge: '[BOSS]',
      });
    }

    rawList.sort((a, b) => b.length - a.length);

    return rawList.slice(0, 6).map((item, index) => ({
      rank: item.isPlayer ? playerGlobalRank : index + 1,
      ...item,
    }));
  }

  public triggerScreenShake(intensity: number = 0.8) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public spawnParticleBurst(
    x: number, 
    z: number, 
    colorVal: THREE.Color | string | number, 
    count: number = 18, 
    type: ParticleType = 'spark'
  ) {
    let spawned = 0;
    const color = new THREE.Color(colorVal);

    for (let i = 0; i < this.particlePool.length && spawned < count; i++) {
      const p = this.particlePool[i];
      if (p.mesh.visible || p.type !== type) continue;

      p.mesh.visible = true;
      p.mesh.position.set(x, 0.6, z);
      if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
        p.mesh.material.color.copy(color);
        p.mesh.material.opacity = 1;
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'confetti' ? 4 + Math.random() * 10 : 2 + Math.random() * 6;
      p.vx = Math.cos(angle) * speed;
      p.vy = type === 'confetti' ? 5 + Math.random() * 10 : 3 + Math.random() * 6;
      p.vz = Math.sin(angle) * speed;
      
      p.vrx = (Math.random() - 0.5) * 15;
      p.vry = (Math.random() - 0.5) * 15;
      p.vrz = (Math.random() - 0.5) * 15;

      p.life = 0;
      p.maxLife = type === 'confetti' ? 0.8 + Math.random() * 0.6 : 0.4 + Math.random() * 0.3;
      
      this.particles.push(p);
      spawned++;
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      const lifeRatio = p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;

      // Rotation for confetti
      if (p.type === 'confetti') {
        p.mesh.rotation.x += p.vrx * delta;
        p.mesh.rotation.y += p.vry * delta;
        p.mesh.rotation.z += p.vrz * delta;
        p.vy -= 22 * delta; // Heavier gravity
      } else {
        p.vy -= 12 * delta; // Lighter gravity for sparks
      }

      if (p.mesh.position.y < 0.15) {
        p.mesh.position.y = 0.15;
        p.vx *= 0.7;
        p.vz *= 0.7;
        p.vy = Math.abs(p.vy) * 0.3; // Bounce
      }

      const scale = p.type === 'spark' 
        ? Math.max(0.01, 1.0 - lifeRatio) 
        : Math.max(0.01, 1.0 - lifeRatio * 0.5);
      p.mesh.scale.set(scale, scale, scale);

      if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
        p.mesh.material.opacity = Math.max(0, 1.0 - lifeRatio);
      }
    }
  }

  public addKillFeedEntry(text: string, color: string = '#ef4444') {
    const entry: KillFeedEntry = {
      id: Math.random().toString(),
      text,
      color,
      time: Date.now(),
    };
    this.killFeed.unshift(entry);
    if (this.killFeed.length > 5) this.killFeed.pop();
  }

  public getKillFeed(): KillFeedEntry[] {
    const now = Date.now();
    return this.killFeed.filter((k) => now - k.time < 6000);
  }

  public restartMatch() {
    this.matchTimeRemaining = MATCH_DURATION_SECONDS;
    this.matchTimer = 0;
    this.hasTeleportedToPerimeter = false;
    this.canEatBoss = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    this.stats.bossAlive = false;
    this.stats.cashEarnedThisMatch = 0;
    this.stats.gemsEarnedThisMatch = 0;

    // Reset player
    if (this.player.headGroup) this.scene.remove(this.player.headGroup);
    this.player.segments.forEach((s) => this.scene.remove(s.mesh));
    this.spawnPlayer();

    // Reset bots
    this.bots.forEach((b) => {
      this.scene.remove(b.headGroup);
      b.segments.forEach((s) => {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
      });
    });
    this.bots = [];
    this.spawnBots(28);

    // Reset boss
    if (this.boss) {
      this.scene.remove(this.boss.headGroup);
      this.boss.segments.forEach((s) => this.scene.remove(s.mesh));
      this.boss = null;
    }
    this.bossPatrolAngle = 0;

    // Reset Snake Coins
    this.snakeCoins.forEach(sc => {
      this.scene.remove(sc.headGroup);
      sc.segments.forEach(s => this.scene.remove(s.mesh));
    });
    this.snakeCoins = [];

    // Reset Chests
    this.chests.forEach((c) => this.scene.remove(c.meshGroup));
    this.chests = [];

    // Reset Coin Pellets and Respawn initial batch
    this.coinPellets.forEach((cp) => {
      cp.active = false;
      cp.mesh.visible = false;
    });
    for (let i = 0; i < 200; i++) {
      const r = Math.sqrt(Math.random()) * (this.arenaSize / 2 - 80);
      const a = Math.random() * Math.PI * 2;
      this.spawnCoinPellet(Math.cos(a) * r, Math.sin(a) * r, 10);
    }

    // Reset Fire Projectiles
    this.fireProjectiles.forEach((p) => {
      this.scene.remove(p.mesh);
    });
    this.fireProjectiles = [];
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    // Cleanup bots
    this.bots.forEach((b) => {
      this.scene.remove(b.headGroup);
      b.segments.forEach((s) => {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
      });
    });
    this.bots = [];

    // Cleanup Coin Pellets
    this.coinPellets.forEach((cp) => {
      this.scene.remove(cp.mesh);
      cp.mesh.geometry.dispose();
    });
    this.coinPellets = [];

    // Cleanup entities
    this.snakeCoins.forEach(sc => {
      sc.headGroup.children.forEach(child => {
        if (child instanceof THREE.Mesh) child.visible = false;
        else if (child instanceof THREE.Group) child.children.forEach(gc => { if (gc instanceof THREE.Mesh) gc.visible = false; });
      });
      this.scene.remove(sc.headGroup);
      sc.segments.forEach(s => s.mesh.visible = false);
    });
    this.chests.forEach(c => this.scene.remove(c.meshGroup));

    if (this.distantSwarmMesh) {
      this.scene.remove(this.distantSwarmMesh);
      this.distantSwarmMesh.geometry.dispose();
      this.distantSwarmMesh = null;
    }

    if (this.renderer && this.renderer.domElement) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
