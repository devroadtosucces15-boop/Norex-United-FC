// Real-time chat rooms (roadmap P6.3b) – one Durable Object per chat, WebSocket Hibernation API so idle
// rooms cost nothing (R0.5). The room holds no history: messages still live in D1 (bot/chat.js); the room
// only fans out "new message" / "removed" / "chat changed" pushes and relays typing pings between members.
//   GET  /ws?u=&n=&ro=   upgrade (bot/chat.js has already checked the session + membership)
//   POST /push {…}       broadcast a JSON event to every socket in the room
// Client → room: 'ping' (auto-answered 'pong' without waking the room) and {"t":"typing"}.
// Plain class (not `extends DurableObject`) so Node tests can import the Worker without `cloudflare:workers`.
export class ChatRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    if (globalThis.WebSocketRequestResponsePair) ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/push' && request.method === 'POST') {
      const data = await request.text();
      for (const ws of this.ctx.getWebSockets()) { try { ws.send(data); } catch { /* closing */ } }
      return new Response('ok');
    }
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const who = { u: url.searchParams.get('u') || '', n: (url.searchParams.get('n') || 'Member').slice(0, 40), ro: url.searchParams.get('ro') === '1' };
      this.ctx.acceptWebSocket(server, [who.u]);
      server.serializeAttachment(who);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    const who = ws.deserializeAttachment() || {};
    if (msg?.t !== 'typing' || who.ro || !who.u) return; // read-only (owner view) sockets never show as typing
    const out = JSON.stringify({ t: 'typing', u: who.u, n: who.n });
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) { try { other.send(out); } catch { /* closing */ } }
    }
  }

  async webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* already closed */ } }
  async webSocketError(ws) { try { ws.close(1011, 'error'); } catch { /* already closed */ } }
}
