import { NextRequest, NextResponse } from 'next/server';

// Server-authoritative in-memory room store
interface ServerPlayer {
  id: string;
  name: string;
  skinId: string;
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
}

interface ServerRoom {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  stageId: number;
  players: Record<string, ServerPlayer>;
  createdAt: number;
  lastActivity: number;
}

// Global server in-memory store
declare global {
  // eslint-disable-next-line no-var
  var __ARENA_MULTIPLAYER_ROOMS: Map<string, ServerRoom> | undefined;
}

function getRoomsStore(): Map<string, ServerRoom> {
  if (!global.__ARENA_MULTIPLAYER_ROOMS) {
    global.__ARENA_MULTIPLAYER_ROOMS = new Map();

    // Seed a couple of active public tournament rooms
    const seedRoom1: ServerRoom = {
      id: 'VIPER-101',
      name: 'Global Apex Championship',
      hostId: 'host_apex',
      maxPlayers: 16,
      stageId: 1,
      players: {
        bot_p1: {
          id: 'bot_p1',
          name: 'ApexViper#204',
          skinId: 'shark',
          isHost: true,
          x: 25,
          z: -30,
          rotationY: 1.2,
          length: 22,
          score: 840,
          isBoosting: false,
          ping: 24,
          lastSeen: Date.now(),
          segments: [],
        },
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    const seedRoom2: ServerRoom = {
      id: 'TITAN-550',
      name: 'High-Roller Neon Arena',
      hostId: 'host_titan',
      maxPlayers: 16,
      stageId: 2,
      players: {
        bot_p2: {
          id: 'bot_p2',
          name: 'CyberDragon#88',
          skinId: 'dragon',
          isHost: true,
          x: -40,
          z: 50,
          rotationY: 2.8,
          length: 35,
          score: 1620,
          isBoosting: true,
          ping: 32,
          lastSeen: Date.now(),
          segments: [],
        },
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    global.__ARENA_MULTIPLAYER_ROOMS.set(seedRoom1.id, seedRoom1);
    global.__ARENA_MULTIPLAYER_ROOMS.set(seedRoom2.id, seedRoom2);
  }
  return global.__ARENA_MULTIPLAYER_ROOMS;
}

// GET /api/multiplayer/rooms: Returns list of available rooms
export async function GET() {
  const store = getRoomsStore();
  const now = Date.now();
  const roomsList = [];

  for (const [id, room] of store.entries()) {
    // Purge rooms inactive for > 15 minutes
    if (now - room.lastActivity > 15 * 60 * 1000) {
      store.delete(id);
      continue;
    }
    const playerCount = Object.keys(room.players).length;
    roomsList.push({
      id: room.id,
      name: room.name,
      stageId: room.stageId,
      playerCount,
      maxPlayers: room.maxPlayers,
      createdAt: room.createdAt,
    });
  }

  return NextResponse.json({ rooms: roomsList });
}

// POST /api/multiplayer/rooms: Creates or registers a room
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const store = getRoomsStore();

    if (!data.id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
    }

    const room: ServerRoom = {
      id: data.id,
      name: data.name || `Room ${data.id}`,
      hostId: data.hostId || 'unknown',
      maxPlayers: data.maxPlayers || 16,
      stageId: data.stageId || 1,
      players: data.players || {},
      createdAt: data.createdAt || Date.now(),
      lastActivity: Date.now(),
    };

    store.set(data.id, room);
    return NextResponse.json({ success: true, room });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
