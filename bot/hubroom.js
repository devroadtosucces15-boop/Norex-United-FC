// Live presence for the Hub (roadmap BE8, board 10) – one shared Durable Object (same free SQLite-backed
// class as `ChatRoom`, P6.3b) holding "who's here right now". No history, no D1: the roster only ever
// reflects currently-open sockets.
//   GET  /ws?u=&n=&a=   upgrade – joining broadcasts 'here', closing broadcasts 'gone', and the new socket
//                        gets the current roster first so it never has to ask separately
//   POST /wave {from,to} deliver a 👋 straight to that member's open socket(s), if any are connected
//   POST /count          how many sockets are currently open (site-wide "in the Hub now" count)
// Plain class (not `extends DurableObject`) so Node tests can import the Worker without `cloudflare:workers`.
export class HubRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    if (globalThis.WebSocketRequestResponsePair) ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  roster() {
    const seen = new Set();
    const out = [];
    for (const ws of this.ctx.getWebSockets()) {
      const who = ws.deserializeAttachment();
      if (who?.u && !seen.has(who.u)) { seen.add(who.u); out.push({ u: who.u, n: who.n, a: who.a }); }
    }
    return out;
  }

  broadcast(evt, exceptWs) {
    const data = JSON.stringify(evt);
    for (const ws of this.ctx.getWebSockets()) if (ws !== exceptWs) { try { ws.send(data); } catch { /* closing */ } }
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/count' && request.method === 'POST') return new Response(JSON.stringify({ n: this.roster().length }));
    if (url.pathname === '/wave' && request.method === 'POST') {
      let from, to;
      try { ({ from, to } = JSON.parse(await request.text())); } catch { return new Response(JSON.stringify({ delivered: false })); }
      let delivered = false;
      for (const ws of this.ctx.getWebSockets(String(to))) { try { ws.send(JSON.stringify({ t: 'wave', from })); delivered = true; } catch { /* closing */ } }
      return new Response(JSON.stringify({ delivered }));
    }
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const who = { u: url.searchParams.get('u') || '', n: (url.searchParams.get('n') || 'Member').slice(0, 40), a: url.searchParams.get('a') || null };
      const already = this.roster();
      this.ctx.acceptWebSocket(server, who.u ? [who.u] : []);
      server.serializeAttachment(who);
      if (who.u) { try { server.send(JSON.stringify({ t: 'roster', who: already })); } catch { /* closing immediately */ } }
      if (who.u) this.broadcast({ t: 'here', who: { u: who.u, n: who.n, a: who.a } }, server);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }

  async webSocketClose(ws, code) {
    const who = ws.deserializeAttachment();
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* already closed */ }
    // Only announce "gone" once that member has no other open sockets (e.g. two tabs).
    if (who?.u && !this.ctx.getWebSockets(who.u).some((s) => s !== ws)) this.broadcast({ t: 'gone', u: who.u });
  }

  async webSocketError(ws) { try { ws.close(1011, 'error'); } catch { /* already closed */ } }
}
