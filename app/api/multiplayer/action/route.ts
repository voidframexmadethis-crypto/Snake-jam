import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, roomId, player, playerId, message } = body;

    if (!global.__ARENA_MULTIPLAYER_ROOMS) {
      return NextResponse.json({ success: true });
    }

    const room = global.__ARENA_MULTIPLAYER_ROOMS.get(roomId);
    if (!room) {
      return NextResponse.json({ success: true });
    }

    room.lastActivity = Date.now();

    if (action === 'join' && player) {
      room.players[player.id] = { ...player, lastSeen: Date.now() };
    } else if (action === 'leave' && playerId) {
      delete room.players[playerId];
    } else if (action === 'chat' && message) {
      // Chat message stored in memory
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
