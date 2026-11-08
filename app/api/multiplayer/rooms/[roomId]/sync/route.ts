import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { player } = await req.json();

    if (!global.__ARENA_MULTIPLAYER_ROOMS) {
      return NextResponse.json({ players: {} });
    }

    const room = global.__ARENA_MULTIPLAYER_ROOMS.get(roomId);
    if (!room) {
      return NextResponse.json({ players: {} });
    }

    room.lastActivity = Date.now();

    if (player && player.id) {
      room.players[player.id] = {
        ...player,
        lastSeen: Date.now(),
      };
    }

    // Clean up players inactive for > 10 seconds
    const now = Date.now();
    for (const [pid, p] of Object.entries(room.players)) {
      if (now - p.lastSeen > 10000) {
        delete room.players[pid];
      }
    }

    return NextResponse.json({
      players: room.players,
      serverTime: now,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
