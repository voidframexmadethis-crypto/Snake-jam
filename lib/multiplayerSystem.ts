// Real-Time Multiplayer Networking Layer for Snake Tycoon Arena
// Combines Cross-Tab BroadcastChannel with HTTP Server Sync and Room Lobbies

export interface MultiplayerPlayer {
  id: string;
  name: string;
  skinId: string;
  customSkinName?: string;
  isHost: boolean;
  x: number;
  z: number;
  rotationY: number;
  length: number;
  score: number;
  isBoosting: boolean;
  ping: number;
  lastSeen: number;
  segments: { x: number; z: number }[];
  activeChat?: { text: string; timestamp: number };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  stageId: number;
  players: Record<string, MultiplayerPlayer>;
  chatLog: ChatMessage[];
  isGameStarted: boolean;
  createdAt: number;
}

// Generate random friendly room code (e.g., "VIPER-782")
export function generateRoomCode(): string {
  const prefixes = ['VIPER', 'COBRA', 'DRAKE', 'TITAN', 'APEX', 'NEON', 'SOLAR', 'CYBER'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

export class MultiplayerManager {
  private static instance: MultiplayerManager | null = null;

  public localPlayerId: string = '';
  public localPlayerName: string = '';
  public currentRoom: MultiplayerRoom | null = null;
  public isConnected: boolean = false;

  private broadcastChannel: BroadcastChannel | null = null;
  private syncIntervalTimer: any = null;
  private apiSyncTimer: any = null;
  private listeners: {
    onPlayersUpdate?: (players: MultiplayerPlayer[]) => void;
    onChatMessage?: (chat: ChatMessage) => void;
    onKillEvent?: (killer: string, victim: string) => void;
    onRoomStateChange?: (room: MultiplayerRoom | null) => void;
  } = {};

  private remotePlayers: Map<string, MultiplayerPlayer> = new Map();

  private constructor() {
    this.localPlayerId = `p_${Math.random().toString(36).slice(2, 9)}`;
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('MultiplayerPlayerName') : null;
    this.localPlayerName = savedName || `SnakeMaster#${Math.floor(1000 + Math.random() * 9000)}`;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('snake_arena_multiplayer_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleChannelMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment', e);
      }
    }
  }

  public static getInstance(): MultiplayerManager {
    if (!MultiplayerManager.instance) {
      MultiplayerManager.instance = new MultiplayerManager();
    }
    return MultiplayerManager.instance;
  }

  public setPlayerName(name: string) {
    this.localPlayerName = name.trim().slice(0, 20) || 'SnakePlayer';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('MultiplayerPlayerName', this.localPlayerName);
      } catch {}
    }
    if (this.currentRoom && this.currentRoom.players[this.localPlayerId]) {
      this.currentRoom.players[this.localPlayerId].name = this.localPlayerName;
      this.broadcastRoomUpdate();
    }
  }

  public registerListeners(callbacks: {
    onPlayersUpdate?: (players: MultiplayerPlayer[]) => void;
    onChatMessage?: (chat: ChatMessage) => void;
    onKillEvent?: (killer: string, victim: string) => void;
    onRoomStateChange?: (room: MultiplayerRoom | null) => void;
  }) {
    this.listeners = callbacks;
  }

  // Create a brand new room
  public createRoom(roomName: string, stageId: number = 1, skinId: string = 'emerald'): MultiplayerRoom {
    const roomId = generateRoomCode();
    const hostPlayer: MultiplayerPlayer = {
      id: this.localPlayerId,
      name: this.localPlayerName,
      skinId,
      isHost: true,
      x: 0,
      z: 0,
      rotationY: 0,
      length: 8,
      score: 0,
      isBoosting: false,
      ping: 18,
      lastSeen: Date.now(),
      segments: [],
    };

    const newRoom: MultiplayerRoom = {
      id: roomId,
      name: roomName.trim().slice(0, 30) || `${this.localPlayerName}'s Room`,
      hostId: this.localPlayerId,
      maxPlayers: 16,
      stageId,
      players: { [this.localPlayerId]: hostPlayer },
      chatLog: [
        {
          id: `msg_${Date.now()}`,
          senderId: 'SYSTEM',
          senderName: 'ARENA',
          text: `Welcome to room ${roomId}! Slither to battle!`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      isGameStarted: false,
      createdAt: Date.now(),
    };

    this.currentRoom = newRoom;
    this.isConnected = true;
    this.broadcastChannelMessage({ type: 'ROOM_CREATED', room: newRoom });
    this.syncRoomWithServer(newRoom);
    this.startHeartbeat();

    if (this.listeners.onRoomStateChange) {
      this.listeners.onRoomStateChange(this.currentRoom);
    }

    return newRoom;
  }

  // Quick match: Join first available room or create one
  public async quickMatch(skinId: string = 'emerald'): Promise<MultiplayerRoom> {
    try {
      const res = await fetch('/api/multiplayer/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.rooms && data.rooms.length > 0) {
          const target = data.rooms[0];
          return this.joinRoom(target.id, skinId);
        }
      }
    } catch {}

    // Fallback: Create a room immediately
    return this.createRoom('Global Quick Match Arena', 1, skinId);
  }

  // Join existing room by code
  public joinRoom(roomCode: string, skinId: string = 'emerald'): MultiplayerRoom {
    const cleanCode = roomCode.trim().toUpperCase();

    const joiner: MultiplayerPlayer = {
      id: this.localPlayerId,
      name: this.localPlayerName,
      skinId,
      isHost: false,
      x: (Math.random() - 0.5) * 80,
      z: (Math.random() - 0.5) * 80,
      rotationY: Math.random() * Math.PI * 2,
      length: 8,
      score: 0,
      isBoosting: false,
      ping: Math.floor(20 + Math.random() * 25),
      lastSeen: Date.now(),
      segments: [],
    };

    if (!this.currentRoom || this.currentRoom.id !== cleanCode) {
      this.currentRoom = {
        id: cleanCode,
        name: `Arena Room ${cleanCode}`,
        hostId: 'remote',
        maxPlayers: 16,
        stageId: 1,
        players: { [this.localPlayerId]: joiner },
        chatLog: [
          {
            id: `msg_${Date.now()}`,
            senderId: 'SYSTEM',
            senderName: 'ARENA',
            text: `${this.localPlayerName} joined room ${cleanCode}!`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ],
        isGameStarted: true,
        createdAt: Date.now(),
      };
    } else {
      this.currentRoom.players[this.localPlayerId] = joiner;
    }

    this.isConnected = true;
    this.broadcastChannelMessage({ type: 'PLAYER_JOINED', roomId: cleanCode, player: joiner });
    this.postServerSync('join', { roomId: cleanCode, player: joiner });
    this.startHeartbeat();

    if (this.listeners.onRoomStateChange) {
      this.listeners.onRoomStateChange(this.currentRoom);
    }

    return this.currentRoom;
  }

  public leaveRoom() {
    if (this.currentRoom) {
      this.broadcastChannelMessage({
        type: 'PLAYER_LEFT',
        roomId: this.currentRoom.id,
        playerId: this.localPlayerId,
      });
      this.postServerSync('leave', { roomId: this.currentRoom.id, playerId: this.localPlayerId });
    }
    this.stopHeartbeat();
    this.currentRoom = null;
    this.isConnected = false;
    this.remotePlayers.clear();
    if (this.listeners.onRoomStateChange) {
      this.listeners.onRoomStateChange(null);
    }
  }

  // Send local snake movement update
  public sendPositionUpdate(pos: { x: number; z: number; rotationY: number; length: number; isBoosting: boolean; segments: { x: number; z: number }[] }) {
    if (!this.currentRoom) return;

    const me = this.currentRoom.players[this.localPlayerId];
    if (me) {
      me.x = pos.x;
      me.z = pos.z;
      me.rotationY = pos.rotationY;
      me.length = pos.length;
      me.isBoosting = pos.isBoosting;
      me.segments = pos.segments.slice(0, 40); // Cap segments sent over wire
      me.lastSeen = Date.now();
    }

    this.broadcastChannelMessage({
      type: 'PLAYER_UPDATE',
      roomId: this.currentRoom.id,
      player: {
        id: this.localPlayerId,
        name: this.localPlayerName,
        skinId: me?.skinId || 'emerald',
        x: pos.x,
        z: pos.z,
        rotationY: pos.rotationY,
        length: pos.length,
        isBoosting: pos.isBoosting,
        segments: me?.segments || [],
        ping: me?.ping || 24,
        lastSeen: Date.now(),
      },
    });
  }

  // Send in-game chat or emote
  public sendChatMessage(text: string) {
    if (!this.currentRoom || !text.trim()) return;

    const chatMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      senderId: this.localPlayerId,
      senderName: this.localPlayerName,
      text: text.trim().slice(0, 100),
      timestamp: Date.now(),
    };

    if (this.currentRoom.players[this.localPlayerId]) {
      this.currentRoom.players[this.localPlayerId].activeChat = {
        text: chatMsg.text,
        timestamp: Date.now(),
      };
    }

    this.currentRoom.chatLog.push(chatMsg);
    if (this.currentRoom.chatLog.length > 30) {
      this.currentRoom.chatLog.shift();
    }

    this.broadcastChannelMessage({
      type: 'CHAT_MESSAGE',
      roomId: this.currentRoom.id,
      message: chatMsg,
    });

    this.postServerSync('chat', { roomId: this.currentRoom.id, message: chatMsg });

    if (this.listeners.onChatMessage) {
      this.listeners.onChatMessage(chatMsg);
    }
  }

  // Notify elimination of another player
  public broadcastKill(victimId: string, victimName: string) {
    if (!this.currentRoom) return;

    const sysMsg: ChatMessage = {
      id: `kill_${Date.now()}`,
      senderId: 'SYSTEM',
      senderName: 'ARENA',
      text: `👑 ${this.localPlayerName} defeated ${victimName}!`,
      timestamp: Date.now(),
      isSystem: true,
    };

    this.currentRoom.chatLog.push(sysMsg);
    this.broadcastChannelMessage({
      type: 'KILL_EVENT',
      roomId: this.currentRoom.id,
      killerId: this.localPlayerId,
      killerName: this.localPlayerName,
      victimId,
      victimName,
      message: sysMsg,
    });

    if (this.listeners.onKillEvent) {
      this.listeners.onKillEvent(this.localPlayerName, victimName);
    }
  }

  // Get active remote players for 3D rendering
  public getRemotePlayers(): MultiplayerPlayer[] {
    const now = Date.now();
    const list: MultiplayerPlayer[] = [];
    this.remotePlayers.forEach((player) => {
      // Discard ghost players inactive for over 15 seconds
      if (now - player.lastSeen < 15000) {
        list.push(player);
      }
    });
    return list;
  }

  // Internal: Broadcast message to other tabs
  private broadcastChannelMessage(data: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch {}
    }
  }

  // Internal: Handle incoming BroadcastChannel message from another browser tab
  private handleChannelMessage(data: any) {
    if (!data || !this.currentRoom || data.roomId !== this.currentRoom.id) return;

    if (data.type === 'PLAYER_UPDATE' && data.player && data.player.id !== this.localPlayerId) {
      const p = data.player;
      this.remotePlayers.set(p.id, p);
      if (this.currentRoom) {
        this.currentRoom.players[p.id] = p;
      }
      if (this.listeners.onPlayersUpdate) {
        this.listeners.onPlayersUpdate(this.getRemotePlayers());
      }
    } else if (data.type === 'CHAT_MESSAGE' && data.message) {
      if (this.currentRoom) {
        this.currentRoom.chatLog.push(data.message);
        if (this.currentRoom.players[data.message.senderId]) {
          this.currentRoom.players[data.message.senderId].activeChat = {
            text: data.message.text,
            timestamp: data.message.timestamp,
          };
        }
      }
      if (this.listeners.onChatMessage) {
        this.listeners.onChatMessage(data.message);
      }
    } else if (data.type === 'PLAYER_JOINED' && data.player && data.player.id !== this.localPlayerId) {
      this.remotePlayers.set(data.player.id, data.player);
      if (this.currentRoom) {
        this.currentRoom.players[data.player.id] = data.player;
      }
      if (this.listeners.onRoomStateChange) {
        this.listeners.onRoomStateChange(this.currentRoom);
      }
    } else if (data.type === 'PLAYER_LEFT' && data.playerId) {
      this.remotePlayers.delete(data.playerId);
      if (this.currentRoom) {
        delete this.currentRoom.players[data.playerId];
      }
      if (this.listeners.onRoomStateChange) {
        this.listeners.onRoomStateChange(this.currentRoom);
      }
    } else if (data.type === 'KILL_EVENT') {
      if (this.listeners.onKillEvent) {
        this.listeners.onKillEvent(data.killerName, data.victimName);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // High-frequency position sync for multiplayer (20 Hz = every 50ms)
    this.syncIntervalTimer = setInterval(() => {
      // Clean up stale remote players
      const now = Date.now();
      let changed = false;
      this.remotePlayers.forEach((p, id) => {
        if (now - p.lastSeen > 8000) {
          this.remotePlayers.delete(id);
          changed = true;
        }
      });
      if (changed && this.listeners.onPlayersUpdate) {
        this.listeners.onPlayersUpdate(this.getRemotePlayers());
      }
    }, 1000);

    // Periodic Server polling sync (every 1.5s) to sync players across devices
    this.apiSyncTimer = setInterval(async () => {
      if (!this.currentRoom) return;
      try {
        const me = this.currentRoom.players[this.localPlayerId];
        const res = await fetch(`/api/multiplayer/rooms/${this.currentRoom.id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            player: me,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.players) {
            Object.values(result.players as Record<string, MultiplayerPlayer>).forEach((p) => {
              if (p.id !== this.localPlayerId) {
                this.remotePlayers.set(p.id, p);
                if (this.currentRoom) {
                  this.currentRoom.players[p.id] = p;
                }
              }
            });
            if (this.listeners.onPlayersUpdate) {
              this.listeners.onPlayersUpdate(this.getRemotePlayers());
            }
          }
        }
      } catch {}
    }, 1500);
  }

  private stopHeartbeat() {
    if (this.syncIntervalTimer) clearInterval(this.syncIntervalTimer);
    if (this.apiSyncTimer) clearInterval(this.apiSyncTimer);
    this.syncIntervalTimer = null;
    this.apiSyncTimer = null;
  }

  private broadcastRoomUpdate() {
    if (this.currentRoom) {
      this.broadcastChannelMessage({ type: 'ROOM_UPDATE', room: this.currentRoom });
    }
  }

  private async syncRoomWithServer(room: MultiplayerRoom) {
    try {
      await fetch('/api/multiplayer/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room),
      });
    } catch {}
  }

  private async postServerSync(action: string, payload: any) {
    try {
      await fetch('/api/multiplayer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch {}
  }
}

export const multiplayerManager = MultiplayerManager.getInstance();
