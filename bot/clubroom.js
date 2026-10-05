// Live rooms (redesign BE0 "new DO class") – one generic Durable Object for every named live room:
// Locker Room broadcast (BE2), Dugout line-up (BE3), Tactics Studio co-editing (BE1). Same shape as ChatRoom
// (bot/chatroom.js) and WebSocket Hibernation, so an idle room costs nothing (R0.5). A room holds no state of its
// own: the source of truth stays in D1/R2, the room only fans out JSON events to whoever is connected.
//   GET  /ws?u=&n=      upgrade – the caller (bot/members.js) has already checked the session and room access
//   POST /push {…}      broadcast a JSON event to every socket in this room (optional `to: [memberIds]` = only those)
// Plain class (not `extends DurableObject`) so Node tests can import the Worker without `cloudflare:workers`.
export class ClubRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    if (globalThis.WebSocketRequestResponsePair) ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/push' && request.method === 'POST') {
      const event = await request.json().catch(() => null);
      if (!event || typeof event !== 'object') return new Response('bad event', { status: 400 });
      // `to` (optional) limits the event to those member ids, so personal changes (an unread count) reach only them.
      const { to, ...rest } = event;
      const only = Array.isArray(to) ? new Set(to.map(String)) : null;
      const data = JSON.stringify(rest);
      for (const ws of this.ctx.getWebSockets()) {
        if (only && !only.has(String(ws.deserializeAttachment()?.u ?? ''))) continue;
        try { ws.send(data); } catch { /* closing */ }
      }
      return new Response('ok');
    }
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const who = { u: url.searchParams.get('u') || '', n: (url.searchParams.get('n') || 'Member').slice(0, 40) };
      this.ctx.acceptWebSocket(server, [who.u]);
      server.serializeAttachment(who);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  // Clients may only send 'ping' (auto-answered). Everything else is ignored: rooms are broadcast-only so a member
  // can't spoof another member's event through the socket – writes go through the normal authenticated API.
  async webSocketMessage() { /* broadcast-only */ }
  async webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* already closed */ } }
  async webSocketError(ws) { try { ws.close(1011, 'error'); } catch { /* already closed */ } }
}

// Room names are the DO ids: 'locker', 'lineup:<eventId>', 'studio:<playId>'. Keep them short and bounded.
const NAME = /^(locker|lineup:\d{1,9}|studio:\d{1,9})$/;

// Fan a JSON event out to everyone in a room. Best-effort by design: no binding (local dev, tests) or a failed push
// must never fail the write that triggered it – the page still re-reads the API on its next poll.
export async function broadcastRoom(env, name, event) {
  if (!env?.CLUB_ROOM || !NAME.test(String(name))) return false;
  try {
    const stub = env.CLUB_ROOM.get(env.CLUB_ROOM.idFromName(name));
    await stub.fetch('https://room/push', { method: 'POST', body: JSON.stringify({ ...event, room: name }) });
    return true;
  } catch { return false; }
}

export { NAME as ROOM_NAME };
