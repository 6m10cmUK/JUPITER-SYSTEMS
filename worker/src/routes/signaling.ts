import type { Env } from '../types';

function json(data: unknown, headers: Record<string, string>, status = 200): Response {
  return Response.json(data, { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

const SIGNAL_TTL = 300; // 5分で自動削除

export async function handleSignaling(
  request: Request,
  url: URL,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  // /signal/:roomId/:type
  const parts = url.pathname.replace('/signal/', '').split('/');
  const roomId = parts[0];
  const type = parts[1]; // 'offer' | 'answer' | 'ice' | 'peers'

  if (!roomId || !type) {
    return new Response('Bad Request', { status: 400, headers });
  }

  // KV wrapper: put/get errors are non-fatal for signaling
  const kv = env.SIGNALING;
  const kvGet = async (key: string) => {
    try { return await kv.get(key); } catch { return null; }
  };
  const kvPut = async (key: string, value: string, opts?: { expirationTtl: number }) => {
    try { await kv.put(key, value, opts); } catch { /* KV limit exceeded — continue */ }
  };

  // POST /signal/:roomId/offer — SDP offer書き込み
  if (type === 'offer' && request.method === 'POST') {
    const body = (await request.json()) as { peerId: string; sdp: string };
    if (!body.peerId || !body.sdp) return json({ error: 'peerId and sdp required' }, headers, 400);

    await kvPut(`${roomId}:offer:${body.peerId}`, body.sdp, { expirationTtl: SIGNAL_TTL });
    return json({ ok: true }, headers);
  }

  // GET /signal/:roomId/offer?peerId=xxx — SDP offer取得
  if (type === 'offer' && request.method === 'GET') {
    const peerId = url.searchParams.get('peerId');
    if (!peerId) return json({ error: 'peerId required' }, headers, 400);

    const sdp = await kvGet(`${roomId}:offer:${peerId}`);
    return json({ sdp }, headers);
  }

  // POST /signal/:roomId/answer — SDP answer書き込み
  if (type === 'answer' && request.method === 'POST') {
    const body = (await request.json()) as { peerId: string; sdp: string };
    if (!body.peerId || !body.sdp) return json({ error: 'peerId and sdp required' }, headers, 400);

    await kvPut(`${roomId}:answer:${body.peerId}`, body.sdp, { expirationTtl: SIGNAL_TTL });
    return json({ ok: true }, headers);
  }

  // GET /signal/:roomId/answer?peerId=xxx — SDP answer取得
  if (type === 'answer' && request.method === 'GET') {
    const peerId = url.searchParams.get('peerId');
    if (!peerId) return json({ error: 'peerId required' }, headers, 400);

    const sdp = await kvGet(`${roomId}:answer:${peerId}`);
    return json({ sdp }, headers);
  }

  // POST /signal/:roomId/ice — ICE候補追加
  if (type === 'ice' && request.method === 'POST') {
    const body = (await request.json()) as { peerId: string; candidate: string };
    if (!body.peerId || !body.candidate) return json({ error: 'peerId and candidate required' }, headers, 400);

    const key = `${roomId}:ice:${body.peerId}`;
    const existing = await kvGet(key);
    const candidates: string[] = existing ? JSON.parse(existing) : [];
    candidates.push(body.candidate);
    await kvPut(key, JSON.stringify(candidates), { expirationTtl: SIGNAL_TTL });
    return json({ ok: true }, headers);
  }

  // GET /signal/:roomId/ice?peerId=xxx — ICE候補取得
  if (type === 'ice' && request.method === 'GET') {
    const peerId = url.searchParams.get('peerId');
    if (!peerId) return json({ error: 'peerId required' }, headers, 400);

    const data = await kvGet(`${roomId}:ice:${peerId}`);
    const candidates: string[] = data ? JSON.parse(data) : [];
    return json({ candidates }, headers);
  }

  // POST /signal/:roomId/peers — ルームにpeer登録（ホスト検出用）
  if (type === 'peers' && request.method === 'POST') {
    const body = (await request.json()) as { peerId: string; isHost: boolean };
    if (!body.peerId) return json({ error: 'peerId required' }, headers, 400);

    const key = `${roomId}:peers`;
    const existing = await kvGet(key);
    const peers: Array<{ peerId: string; isHost: boolean; timestamp: number }> = existing
      ? JSON.parse(existing)
      : [];

    // 古いエントリ削除（5分以上前）+ 同一peerId更新
    const now = Date.now();
    const filtered = peers.filter(
      (p) => p.peerId !== body.peerId && now - p.timestamp < SIGNAL_TTL * 1000,
    );
    filtered.push({ peerId: body.peerId, isHost: body.isHost, timestamp: now });

    await kvPut(key, JSON.stringify(filtered), { expirationTtl: SIGNAL_TTL });
    return json({ ok: true }, headers);
  }

  // GET /signal/:roomId/peers — ルームのpeer一覧
  if (type === 'peers' && request.method === 'GET') {
    const data = await kvGet(`${roomId}:peers`);
    const peers: Array<{ peerId: string; isHost: boolean; timestamp: number }> = data
      ? JSON.parse(data)
      : [];
    // 古いエントリ除外
    const now = Date.now();
    const active = peers.filter((p) => now - p.timestamp < SIGNAL_TTL * 1000);
    return json({ peers: active }, headers);
  }

  return new Response('Not Found', { status: 404, headers });
}
