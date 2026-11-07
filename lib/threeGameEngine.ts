import * as THREE from 'three';
import { soundManager } from './audio';
import {
  GameStats,
  MATCH_DURATION_SECONDS,
  BOSS_SPAWN_TIME_REMAINING,
  STAGES,
  INITIAL_SKINS,
  EVOLUTION_TIERS,
  UPGRADE_CONFIG,
  UpgradeType,
  PlayerUpgrades,
  SkinModelType,
  COLLECTION_SETS,
  getUpgradeCost,
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
  type: 'magnet' | 'speed' | 'shield';
  x: number;
  z: number;
  group: THREE.Group;
  active: boolean;
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
  shieldActive?: boolean;
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
  private pellets: PelletData[] = [];
  private pelletInstancedMesh!: THREE.InstancedMesh;
  private gates: GateData[] = [];
  private powerups: PowerUpItem[] = [];
  private dropOffZoneGroup!: THREE.Group;
  private upgradePads: UpgradePadData[] = [];
  private obstacles: ObstacleData[] = [];
  private obstacleGroup!: THREE.Group;
  private shieldBubbleMesh!: THREE.Mesh;

  // Arena & Match State
  public matchTimeRemaining: number = MATCH_DURATION_SECONDS;
  public arenaRadius: number = 90;
  public currentShrinkRadius: number = 90;
  public minShrinkRadius: number = 28;
  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;

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
  private onStatsUpdate: (stats: GameStats) => void;
  private onFloatingText: (text: FloatingText) => void;
  private onMatchEnd: (isVictory: boolean) => void;
  public stats: GameStats;

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
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    const currentStage = STAGES.find((s) => s.id === this.stats.currentStageId) || STAGES[0];
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
    this.buildDropOffZone();
    this.buildUpgradePads();

    // 7. Spawn Player & Bots
    this.spawnPlayer();
    this.spawnBots(6);

    // 8. Bind Input Listeners
    this.bindInputs();

    // 9. Start Main Loop
    this.tick = this.tick.bind(this);
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
    if (!this.isSoftwareGl) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 160;
      const d = 60;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
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

    const floorGeo = new THREE.PlaneGeometry(240, 240);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    this.groundMesh = new THREE.Mesh(floorGeo, floorMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.groundMesh);

    // Shrinking Danger Ring Barrier (Force Field)
    const ringGeo = new THREE.CylinderGeometry(
      this.arenaRadius,
      this.arenaRadius,
      12,
      64,
      1,
      true
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    this.ringBarrierMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringBarrierMesh.position.y = 6;
    this.scene.add(this.ringBarrierMesh);

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
      const dist = this.arenaRadius + 6 + (Math.sin(i * 3.7) * 4);
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
  }

  // ==========================================
  // PELLETS & CONSUMABLES
  // ==========================================
  private buildPellets() {
    const count = 300;
    const sphereGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const pelletMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x111111,
    });

    this.pelletInstancedMesh = new THREE.InstancedMesh(sphereGeo, pelletMat, count);
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

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (this.arenaRadius - 8);
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
    }

    if (this.pelletInstancedMesh.instanceColor) {
      this.pelletInstancedMesh.instanceColor.needsUpdate = true;
    }
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.pelletInstancedMesh);
  }

  private respawnPellet(p: PelletData) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (this.currentShrinkRadius - 5);
    p.x = Math.cos(angle) * r;
    p.z = Math.sin(angle) * r;
    p.active = true;

    _mat4.makeTranslation(p.x, 0.45, p.z);
    this.pelletInstancedMesh.setMatrixAt(p.meshIndex, _mat4);
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;
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
    const types: ('magnet' | 'speed' | 'shield')[] = [
      'magnet',
      'speed',
      'shield',
      'magnet',
      'speed',
    ];
    types.forEach((type, i) => {
      const group = new THREE.Group();
      const angle = (i / types.length) * Math.PI * 2 + 0.5;
      const r = 25 + Math.random() * 25;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      group.position.set(x, 1.2, z);

      let color = 0x3b82f6; // Magnet blue
      if (type === 'speed') color = 0x06b6d4; // Speed cyan
      if (type === 'shield') color = 0xf59e0b; // Shield gold

      // 3-part Powerup Icon
      // 1. Core Gem / Octahedron
      const geo = new THREE.OctahedronGeometry(1.0, 0);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
        metalness: 0.9,
        roughness: 0.1,
      });
      const core = new THREE.Mesh(geo, mat);
      core.castShadow = !this.isSoftwareGl;
      group.add(core);

      // 2. Rotating Halo Ring
      const ringGeo = new THREE.TorusGeometry(1.6, 0.1, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color, wireframe: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

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
  // DROP-OFF BASE ZONE (CASH-IN)
  // ==========================================
  private buildDropOffZone() {
    this.dropOffZoneGroup = new THREE.Group();
    this.dropOffZoneGroup.position.set(0, 0.05, 0); // Center safe zone

    // Outer Glowing Ring Pad
    const padGeo = new THREE.RingGeometry(0.1, 7.5, 48);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP-OFF', 128, 100);
    ctx.fillText('BANK', 128, 160);

    const padTex = new THREE.CanvasTexture(canvas);
    padTex.colorSpace = THREE.SRGBColorSpace;

    const padMat = new THREE.MeshBasicMaterial({
      map: padTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.rotation.x = -Math.PI / 2;
    this.dropOffZoneGroup.add(padMesh);

    // Floating 3D Holographic Coin
    const coinGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.35, 24);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xca8a04,
      emissiveIntensity: 0.4,
    });
    const coinMesh = new THREE.Mesh(coinGeo, coinMat);
    coinMesh.position.set(0, 4.5, 0);
    coinMesh.rotation.x = Math.PI / 2;
    this.dropOffZoneGroup.add(coinMesh);

    this.scene.add(this.dropOffZoneGroup);
  }

  // ==========================================
  // IN-WORLD UPGRADE PADS (TYCOON LOOP)
  // ==========================================
  private buildUpgradePads() {
    const padConfigs: {
      type: 'speed' | 'startLength' | 'income' | 'magnet';
      label: string;
      x: number;
      z: number;
      color: number;
    }[] = [
      { type: 'speed', label: 'SPEED', x: -14, z: -14, color: 0x06b6d4 },
      { type: 'startLength', label: 'LENGTH', x: 14, z: -14, color: 0x10b981 },
      { type: 'income', label: 'INCOME', x: -14, z: 14, color: 0xf59e0b },
      { type: 'magnet', label: 'MAGNET', x: 14, z: 14, color: 0xa855f7 },
    ];

    padConfigs.forEach((conf) => {
      const group = new THREE.Group();
      group.position.set(conf.x, 0.06, conf.z);

      // Floor disc
      const discGeo = new THREE.CircleGeometry(3.5, 32);
      const discMat = new THREE.MeshBasicMaterial({
        color: conf.color,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      group.add(disc);

      // Ring border
      const ringGeo = new THREE.RingGeometry(3.2, 3.6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: conf.color,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);

      // 3D Pedestal Icon
      const pedGeo = new THREE.CylinderGeometry(0.6, 0.9, 1.4, 16);
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.8,
      });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.set(0, 0.7, 0);
      group.add(ped);

      // Floating Orb on Pedestal
      const orbGeo = new THREE.DodecahedronGeometry(0.5, 1);
      const orbMat = new THREE.MeshStandardMaterial({
        color: conf.color,
        emissive: conf.color,
        emissiveIntensity: 0.8,
        metalness: 0.9,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(0, 1.8, 0);
      group.add(orb);

      this.scene.add(group);

      this.upgradePads.push({
        type: conf.type,
        label: conf.label,
        x: conf.x,
        z: conf.z,
        radius: 3.5,
        color: conf.color,
        group,
        charging: 0,
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

    // Pre-populate history
    for (let i = 0; i < 200; i++) {
      this.player.history.push({
        x: this.player.x,
        z: this.player.z + i * 0.5,
        heading: this.player.heading,
      });
    }

    // Build initial tail segments
    for (let i = 0; i < initialLen; i++) {
      const segMesh = this.createSegmentMesh(
        equippedSkin.primaryColor,
        equippedSkin.secondaryColor,
        equippedSkin.glowColor,
        i,
        modelType,
        false
      );
      this.scene.add(segMesh);
      this.player.segments.push({
        mesh: segMesh,
        position: new THREE.Vector3(this.player.x, 0.45, this.player.z + (i + 1) * 0.8),
        rotation: new THREE.Euler(0, this.player.heading, 0),
      });
    }
  }

  private spawnBots(count: number) {
    const botNames = [
      'CyberViper',
      'NeonFang',
      'GigaCobra',
      'QuantumWorm',
      'ShadowPython',
      'SolarDrake',
    ];
    const botSkins = [
      { p: '#06b6d4', s: '#0284c7', g: '#38bdf8' },
      { p: '#f97316', s: '#c2410c', g: '#fbbf24' },
      { p: '#a855f7', s: '#7e22ce', g: '#c084fc' },
      { p: '#ec4899', s: '#be185d', g: '#f472b6' },
      { p: '#3b82f6', s: '#1d4ed8', g: '#60a5fa' },
      { p: '#eab308', s: '#ca8a04', g: '#fde047' },
    ];
    const botModelTypes: SkinModelType[] = [
      'robot',
      'dragon',
      'cat',
      'food',
      'celestial',
      'classic',
    ];

    for (let i = 0; i < count; i++) {
      const skin = botSkins[i % botSkins.length];
      const name = botNames[i % botNames.length];
      const modelType = botModelTypes[i % botModelTypes.length];
      const angle = (i / count) * Math.PI * 2 + 0.3;
      const dist = 30 + Math.random() * 25;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const { headGroup, tongueMesh } = this.createSnakeHead(
        skin.p,
        skin.s,
        skin.g,
        modelType,
        false
      );
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
        skinPrimary: skin.p,
        skinSecondary: skin.s,
        skinGlow: skin.g,
        skinModelType: modelType,
        headGroup,
        tongueMesh,
        segments: [],
        history: [],
        aiState: 'forage',
        aiTimer: Math.random() * 3,
      };

      for (let h = 0; h < 200; h++) {
        bot.history.push({ x: bot.x, z: bot.z, heading: bot.heading });
      }

      for (let s = 0; s < botLength; s++) {
        const segMesh = this.createSegmentMesh(
          skin.p,
          skin.s,
          skin.g,
          s,
          modelType,
          false
        );
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

  // ==========================================
  // STAGE BOSS SPAWN (STAGE PROGRESSION)
  // ==========================================
  private spawnStageBoss() {
    if (this.boss && this.boss.alive) return;
    const stage = STAGES.find((s) => s.id === this.stats.currentStageId) || STAGES[0];

    soundManager.playBossAlert();
    this.onFloatingText({
      id: Math.random().toString(),
      text: `⚠️ WARNING: ${stage.bossName} SPAWNED!`,
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
    const bossDist = 45;
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
      heading: bossAngle + Math.PI,
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

    for (let s = 0; s < bossLen; s++) {
      const segMesh = this.createSegmentMesh(
        bossColor,
        '#1e293b',
        '#fbbf24',
        s,
        'dragon',
        true
      );
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
  }

  // ==========================================
  // INPUT HANDLING
  // ==========================================
  private bindInputs() {
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
  private tick() {
    if (this.isDestroyed) return;
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isPaused && !this.isGameOver) {
      this.updateMatchTime(delta);
      this.updateControls(delta);
      this.updatePlayer(delta);
      this.updateBots(delta);
      if (this.boss && this.boss.alive) {
        this.updateBoss(delta);
      }
      this.updatePellets(delta);
      this.updateGates(delta);
      this.updatePowerups(delta);
      this.updateDropOffAndPads(delta);
      this.updateCollisions();
      this.updateCamera(delta);
    }

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  }

  // ==========================================
  // MATCH TIME & SHRINKING ZONE
  // ==========================================
  private updateMatchTime(delta: number) {
    this.matchTimeRemaining -= delta;
    this.stats.currentMatchTime = Math.max(0, this.matchTimeRemaining);

    // Shrinking Battle Royale Danger Ring
    const progress = 1 - this.matchTimeRemaining / MATCH_DURATION_SECONDS;
    this.currentShrinkRadius =
      this.arenaRadius - progress * (this.arenaRadius - this.minShrinkRadius);

    if (this.ringBarrierMesh) {
      const s = this.currentShrinkRadius / this.arenaRadius;
      this.ringBarrierMesh.scale.set(s, 1, s);
    }

    // Spawn Boss at 40s remaining
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
  private updateControls(delta: number) {
    let dx = 0;
    let dz = 0;

    // Keyboard controls
    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) dz -= 1;
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) dz += 1;
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) dx -= 1;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) dx += 1;

    // Virtual Joystick input
    if (Math.abs(this.inputVector.x) > 0.05 || Math.abs(this.inputVector.y) > 0.05) {
      dx = this.inputVector.x;
      dz = this.inputVector.y;
    }

    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      const targetHeading = Math.atan2(dz, dx);
      // Snappy angular interpolation
      let diff = targetHeading - this.player.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const maxStep = this.player.turnSpeed * delta;
      if (Math.abs(diff) <= maxStep) {
        this.player.heading = targetHeading;
      } else {
        this.player.heading += Math.sign(diff) * maxStep;
      }
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
      currentSpeed *= 1.45;
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

    // Clamp to arena
    const distFromCenter = Math.hypot(this.player.x, this.player.z);
    if (distFromCenter > this.currentShrinkRadius) {
      // Danger zone damage!
      this.player.targetLength -= delta * 3;
      if (this.player.targetLength < 3) {
        this.eliminateSnake(this.player);
        return;
      }
    }

    this.player.headGroup.position.set(this.player.x, 0, this.player.z);
    this.player.headGroup.rotation.y = -this.player.heading + Math.PI / 2;

    // Darting tongue animation
    if (this.player.tongueMesh) {
      this.player.tongueMesh.position.z =
        1.2 + Math.sin(this.clock.getElapsedTime() * 12) * 0.3;
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
    const requiredSegments = Math.max(3, Math.floor(snake.length));

    // Add segments if needed
    while (snake.segments.length < requiredSegments) {
      const idx = snake.segments.length;
      const mesh = this.createSegmentMesh(
        snake.skinPrimary,
        snake.skinSecondary,
        snake.skinGlow,
        idx,
        snake.skinModelType || 'classic',
        snake.isBoss
      );
      this.scene.add(mesh);
      const lastPos =
        snake.segments.length > 0
          ? snake.segments[snake.segments.length - 1].position
          : new THREE.Vector3(snake.x, 0.45, snake.z);
      snake.segments.push({
        mesh,
        position: lastPos.clone(),
        rotation: new THREE.Euler(0, snake.heading, 0),
      });
    }

    // Remove excess segments
    while (snake.segments.length > requiredSegments) {
      const removed = snake.segments.pop();
      if (removed) {
        this.scene.remove(removed.mesh);
        removed.mesh.geometry.dispose();
      }
    }

    // Slithering follow-chain logic: sample from history at distance intervals
    const segmentDistance = snake.isBoss ? 1.6 : 0.85;
    let accumulatedDist = 0;
    let historyIdx = 1;

    for (let i = 0; i < snake.segments.length; i++) {
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

      const seg = snake.segments[i];
      seg.position.x = THREE.MathUtils.damp(seg.position.x, sample.x, 18, delta);
      seg.position.z = THREE.MathUtils.damp(seg.position.z, sample.z, 18, delta);
      seg.mesh.position.set(seg.position.x, snake.isBoss ? 0.9 : 0.45, seg.position.z);
      seg.mesh.rotation.y = -sample.heading + Math.PI / 2;

      // Natural tail taper
      const taper = Math.max(0.4, 1 - (i / snake.segments.length) * 0.45);
      seg.mesh.scale.set(taper, taper, taper);
    }
  }

  // ==========================================
  // AI OPPONENTS (WANDERING, HUNTING, EVASION)
  // ==========================================
  private updateBots(delta: number) {
    this.bots.forEach((bot) => {
      if (!bot.alive) return;

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
          // Find nearest gate or cluster of pellets
          let nearestPellet: PelletData | null = null;
          let minDist = 999;
          for (let p = 0; p < 25; p++) {
            const candidate = this.pellets[Math.floor(Math.random() * this.pellets.length)];
            if (candidate && candidate.active) {
              const d = Math.hypot(candidate.x - bot.x, candidate.z - bot.z);
              if (d < minDist) {
                minDist = d;
                nearestPellet = candidate;
              }
            }
          }
          if (nearestPellet) {
            bot.aiTarget = { x: nearestPellet.x, z: nearestPellet.z };
          } else {
            bot.aiTarget = {
              x: (Math.random() - 0.5) * 50,
              z: (Math.random() - 0.5) * 50,
            };
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
      const dist = Math.hypot(bot.x, bot.z);
      if (dist > this.currentShrinkRadius - 5) {
        bot.heading = Math.atan2(-bot.z, -bot.x) + (Math.random() - 0.5) * 0.5;
      }

      bot.headGroup.position.set(bot.x, 0, bot.z);
      bot.headGroup.rotation.y = -bot.heading + Math.PI / 2;

      bot.history.unshift({ x: bot.x, z: bot.z, heading: bot.heading });
      if (bot.history.length > 400) bot.history.pop();

      this.updateTailSegments(bot, delta);
    });
  }

  // ==========================================
  // STAGE BOSS UPDATE
  // ==========================================
  private updateBoss(delta: number) {
    if (!this.boss || !this.boss.alive) return;

    // Boss aggressively pursues player or roams destructively
    const distToPlayer = Math.hypot(
      this.player.x - this.boss.x,
      this.player.z - this.boss.z
    );

    let targetHeading = this.boss.heading;
    if (this.player.alive && distToPlayer < 65) {
      targetHeading = Math.atan2(
        this.player.z - this.boss.z,
        this.player.x - this.boss.x
      );
    } else {
      // Circular patrol
      targetHeading += 0.4 * delta;
    }

    let diff = targetHeading - this.boss.heading;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.boss.heading += diff * this.boss.turnSpeed * delta;

    this.boss.x += Math.cos(this.boss.heading) * this.boss.speed * delta;
    this.boss.z += Math.sin(this.boss.heading) * this.boss.speed * delta;

    this.boss.headGroup.position.set(this.boss.x, 0, this.boss.z);
    this.boss.headGroup.rotation.y = -this.boss.heading + Math.PI / 2;

    this.boss.history.unshift({
      x: this.boss.x,
      z: this.boss.z,
      heading: this.boss.heading,
    });
    if (this.boss.history.length > 500) this.boss.history.pop();

    this.updateTailSegments(this.boss, delta);

    // Sync boss stats
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
      (this.stats.activePowerUps.magnet > 0 ? 32 : 0) +
      5 +
      this.stats.upgrades.magnetLevel * 2.5 +
      magnetPerk;

    let matrixDirty = false;

    this.pellets.forEach((p) => {
      if (!p.active) return;

      // Check Player magnet pull
      const dPlayer = Math.hypot(p.x - this.player.x, p.z - this.player.z);
      if (dPlayer < magnetRadius && this.player.alive) {
        // Physically vacuum pellet towards head
        const pullSpeed = 24 * delta;
        p.x += ((this.player.x - p.x) / dPlayer) * pullSpeed;
        p.z += ((this.player.z - p.z) / dPlayer) * pullSpeed;
        _mat4.makeTranslation(p.x, 0.45, p.z);
        this.pelletInstancedMesh.setMatrixAt(p.meshIndex, _mat4);
        matrixDirty = true;
      }

      // Check collision with Player
      if (dPlayer < 1.4 && this.player.alive) {
        p.active = false;
        soundManager.playPelletEat();
        this.eatPellet(this.player, p);
        this.respawnPellet(p);
        matrixDirty = true;
        return;
      }

      // Check collision with Bots
      this.bots.forEach((bot) => {
        if (!bot.alive) return;
        const dBot = Math.hypot(p.x - bot.x, p.z - bot.z);
        if (dBot < 1.3) {
          p.active = false;
          bot.targetLength += 0.4;
          this.respawnPellet(p);
          matrixDirty = true;
        }
      });
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

    // In-Match Evolution Level-Up Progression
    if (snake.exp >= this.stats.expForNextLevel) {
      snake.level++;
      snake.exp = 0;
      this.stats.expForNextLevel = Math.round(this.stats.expForNextLevel * 1.4);
      this.stats.level = snake.level;
      soundManager.playLevelUp();

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

      const d = Math.hypot(pu.x - this.player.x, pu.z - this.player.z);
      if (d < 2.0 && this.player.alive) {
        pu.active = false;
        pu.group.visible = false;
        soundManager.playPowerup();

        const duration = 12; // 12 seconds
        if (pu.type === 'magnet') {
          this.stats.activePowerUps.magnet = duration;
          this.onFloatingText({
            id: Math.random().toString(),
            text: '🧲 MAGNET VACUUM ACTIVE (12s)!',
            color: '#3b82f6',
            x: window.innerWidth / 2,
            y: 260,
            opacity: 1,
          });
        } else if (pu.type === 'speed') {
          this.stats.activePowerUps.speed = duration;
          this.onFloatingText({
            id: Math.random().toString(),
            text: '⚡ HYPER SPEED SURGE (12s)!',
            color: '#06b6d4',
            x: window.innerWidth / 2,
            y: 260,
            opacity: 1,
          });
        } else if (pu.type === 'shield') {
          this.stats.activePowerUps.shield = duration;
          this.onFloatingText({
            id: Math.random().toString(),
            text: '🛡️ INVINCIBILITY SHIELD (12s)!',
            color: '#fbbf24',
            x: window.innerWidth / 2,
            y: 260,
            opacity: 1,
          });
        }

        // Respawn powerup after 25s
        setTimeout(() => {
          pu.active = true;
          pu.group.visible = true;
          const angle = Math.random() * Math.PI * 2;
          const r = 15 + Math.random() * 30;
          pu.x = Math.cos(angle) * r;
          pu.z = Math.sin(angle) * r;
          pu.group.position.set(pu.x, 1.2, pu.z);
        }, 25000);
      }
    });
  }

  // ==========================================
  // DROP-OFF BASE & IN-WORLD UPGRADE PADS
  // ==========================================
  private updateDropOffAndPads(delta: number) {
    // 1. Drop-off Zone (Center Base)
    if (this.dropOffZoneGroup) {
      this.dropOffZoneGroup.children[1].rotation.y += 1.5 * delta;
      const d = Math.hypot(this.player.x, this.player.z);
      if (d < 7.0 && this.player.alive && this.player.targetLength > 6) {
        // Bank segments into permanent coins!
        const segmentsToBank = Math.min(
          this.player.targetLength - 5,
          Math.ceil(12 * delta)
        );
        if (segmentsToBank > 0) {
          this.player.targetLength -= segmentsToBank;
          const incomePerk =
            1 +
            ((this.collectionPerks.incomeBonus || 0) +
              (this.collectionPerks.allStatsBonus || 0)) /
              100;
          const incomeMult =
            (1 + this.stats.upgrades.incomeLevel * 0.25) * incomePerk;
          const earned = Math.round(segmentsToBank * 15 * incomeMult);
          this.stats.cashEarnedThisMatch += earned;
          this.stats.totalPermanentCoins += earned;
          soundManager.playCashOut();

          this.onFloatingText({
            id: Math.random().toString(),
            text: `+$${earned} BANKED!`,
            color: '#facc15',
            x: window.innerWidth / 2,
            y: 300,
            opacity: 1,
          });
        }
      }
    }

    // 2. In-World Tycoon Upgrade Pads
    this.upgradePads.forEach((pad) => {
      // Rotating orb on pedestal
      pad.group.children[3].rotation.y += 2.0 * delta;

      const d = Math.hypot(pad.x - this.player.x, pad.z - this.player.z);
      if (d < pad.radius && this.player.alive) {
        pad.charging += delta * 1.5;
        if (pad.charging >= 1.0) {
          pad.charging = 0;
          this.tryPurchaseUpgrade(pad.type);
        }
      } else {
        pad.charging = Math.max(0, pad.charging - delta * 2);
      }
    });
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
  // COMBAT & COLLISION RESOLUTION
  // ==========================================
  private updateCollisions() {
    if (!this.player.alive) return;
    const hasShield = this.stats.activePowerUps.shield > 0;

    // 1. Player vs Bots
    this.bots.forEach((bot) => {
      if (!bot.alive) return;

      // Head-to-Head collision
      const dHead = Math.hypot(this.player.x - bot.x, this.player.z - bot.z);
      if (dHead < 1.8) {
        if (hasShield || this.player.length >= bot.length) {
          // Player destroys Bot!
          this.eliminateSnake(bot);
          this.stats.botsKilled++;
          this.stats.score += 200;
          this.stats.totalPermanentCoins += 50;
          soundManager.playKill();
          this.onFloatingText({
            id: Math.random().toString(),
            text: `⚔️ DEFEATED ${bot.name} (+200 PTS)!`,
            color: '#10b981',
            x: window.innerWidth / 2,
            y: 150,
            opacity: 1,
          });
        } else {
          // Bot destroys Player!
          this.eliminateSnake(this.player);
          soundManager.playHurt();
          return;
        }
      }

      // Player Head vs Bot Body Segments
      if (!hasShield) {
        for (let s = 1; s < bot.segments.length; s++) {
          const seg = bot.segments[s];
          const dSeg = Math.hypot(
            this.player.x - seg.position.x,
            this.player.z - seg.position.z
          );
          if (dSeg < 1.2) {
            // Player crashed into bot's body!
            this.eliminateSnake(this.player);
            soundManager.playHurt();
            return;
          }
        }
      }

      // Bot Head vs Player Body Segments
      for (let s = 1; s < this.player.segments.length; s++) {
        const seg = this.player.segments[s];
        const dSeg = Math.hypot(
          bot.x - seg.position.x,
          bot.z - seg.position.z
        );
        if (dSeg < 1.2) {
          // Bot crashed into player's body!
          this.eliminateSnake(bot);
          this.stats.botsKilled++;
          this.stats.score += 150;
          soundManager.playKill();
          this.onFloatingText({
            id: Math.random().toString(),
            text: `💥 ${bot.name} CRASHED INTO YOUR TAIL!`,
            color: '#38bdf8',
            x: window.innerWidth / 2,
            y: 160,
            opacity: 1,
          });
          break;
        }
      }
    });

    // 2. Boss Combat
    if (this.boss && this.boss.alive) {
      const dBossHead = Math.hypot(
        this.player.x - this.boss.x,
        this.player.z - this.boss.z
      );

      // Hit boss head or body
      if (dBossHead < 3.0) {
        if (hasShield || this.player.length > 20) {
          // Deal damage to boss
          const dmg = 45;
          this.boss.hp -= dmg;
          soundManager.playKill();

          this.onFloatingText({
            id: Math.random().toString(),
            text: `💥 BOSS HIT: -${dmg} HP!`,
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
            soundManager.playSpinWin();

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
    }
  }

  // ==========================================
  // DEATH & LOOT BURST MECHANICS
  // ==========================================
  private eliminateSnake(snake: SnakeEntity) {
    snake.alive = false;
    this.scene.remove(snake.headGroup);

    // Burst loot onto arena floor!
    const lootCount = Math.min(45, Math.floor(snake.length * 2));
    for (let i = 0; i < lootCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.5 + Math.random() * 8;
      const lx = snake.x + Math.cos(angle) * dist;
      const lz = snake.z + Math.sin(angle) * dist;

      // Find inactive or random pellet slot to repurpose as high-value loot
      const p = this.pellets[i % this.pellets.length];
      if (p) {
        p.x = lx;
        p.z = lz;
        p.active = true;
        p.value = 3; // High value loot
        _mat4.makeTranslation(lx, 0.45, lz);
        this.pelletInstancedMesh.setMatrixAt(p.meshIndex, _mat4);
      }
    }
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

    // Clean up segments
    snake.segments.forEach((seg) => {
      this.scene.remove(seg.mesh);
      seg.mesh.geometry.dispose();
    });
    snake.segments = [];

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
      // Dynamic: zooms out slightly when snake grows longer
      const growthFactor = Math.min(1.8, 1 + this.player.length * 0.015);
      targetCamY = 30 * growthFactor;
      targetCamZ = 22 * growthFactor;
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
      currentRadius: this.currentShrinkRadius,
      maxRadius: this.arenaRadius,
    };
  }

  public restartMatch() {
    this.matchTimeRemaining = MATCH_DURATION_SECONDS;
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    this.stats.bossAlive = false;

    // Reset player
    if (this.player.headGroup) this.scene.remove(this.player.headGroup);
    this.player.segments.forEach((s) => this.scene.remove(s.mesh));
    this.spawnPlayer();

    // Reset bots
    this.bots.forEach((b) => {
      this.scene.remove(b.headGroup);
      b.segments.forEach((s) => this.scene.remove(s.mesh));
    });
    this.bots = [];
    this.spawnBots(6);

    // Reset boss
    if (this.boss) {
      this.scene.remove(this.boss.headGroup);
      this.boss.segments.forEach((s) => this.scene.remove(s.mesh));
      this.boss = null;
    }
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer && this.renderer.domElement) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
