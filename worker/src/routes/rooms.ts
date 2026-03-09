import type { Env, AuthUser } from '../types';

function json(data: unknown, headers: Record<string, string>, status = 200): Response {
  return Response.json(data, { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

export async function handleRooms(
  request: Request,
  url: URL,
  env: Env,
  headers: Record<string, string>,
  user: AuthUser,
): Promise<Response> {
  const pathParts = url.pathname.replace('/api/rooms', '').split('/').filter(Boolean);
  const roomId = pathParts[0];
  const subResource = pathParts[1]; // 'snapshot' etc.

  // ゲストはルーム詳細とスナップショット取得のみ許可
  if (user.isGuest && !(request.method === 'GET' && roomId)) {
    return json({ error: 'ゲストユーザーはこの操作を実行できません' }, headers, 403);
  }

  // GET /api/rooms — ルーム一覧
  if (!roomId && request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM rooms WHERE owner_id = ? ORDER BY updated_at DESC',
    )
      .bind(user.uid)
      .all();
    return json(rows.results, headers);
  }

  // POST /api/rooms — ルーム作成
  if (!roomId && request.method === 'POST') {
    const body = (await request.json()) as {
      name: string;
      dice_system?: string;
      tags?: string[];
    };
    if (!body.name) return json({ error: 'name required' }, headers, 400);

    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO rooms (id, owner_id, name, dice_system, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        user.uid,
        body.name,
        body.dice_system ?? 'DiceBot',
        JSON.stringify(body.tags ?? []),
        now,
        now,
      )
      .run();

    return json({ id, name: body.name, owner_id: user.uid, created_at: now }, headers, 201);
  }

  if (!roomId) return new Response('Not Found', { status: 404, headers });

  // GET /api/rooms/:id/snapshot — ルームデータ取得
  if (subResource === 'snapshot' && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT data, updated_at FROM room_snapshots WHERE room_id = ?')
      .bind(roomId)
      .first<{ data: string; updated_at: number }>();
    if (!row) return json({ data: null, updated_at: 0 }, headers);
    return json({ data: JSON.parse(row.data), updated_at: row.updated_at }, headers);
  }

  // PUT /api/rooms/:id/snapshot — ルームデータ保存
  if (subResource === 'snapshot' && request.method === 'PUT') {
    // オーナーのみ
    const room = await env.DB.prepare('SELECT owner_id FROM rooms WHERE id = ?')
      .bind(roomId)
      .first<{ owner_id: string }>();
    if (!room || room.owner_id !== user.uid) {
      return json({ error: 'Forbidden' }, headers, 403);
    }

    const body = (await request.json()) as { data: unknown };
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO room_snapshots (room_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(room_id) DO UPDATE SET data = ?, updated_at = ?',
    )
      .bind(roomId, JSON.stringify(body.data), now, JSON.stringify(body.data), now)
      .run();

    // roomsのupdated_atも更新
    await env.DB.prepare('UPDATE rooms SET updated_at = ? WHERE id = ?').bind(now, roomId).run();

    return json({ ok: true, updated_at: now }, headers);
  }

  // GET /api/rooms/:id — ルーム詳細
  if (!subResource && request.method === 'GET') {
    const room = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first();
    if (!room) return json({ error: 'Not found' }, headers, 404);
    return json(room, headers);
  }

  // PATCH /api/rooms/:id — ルーム更新
  if (!subResource && request.method === 'PATCH') {
    const room = await env.DB.prepare('SELECT owner_id FROM rooms WHERE id = ?')
      .bind(roomId)
      .first<{ owner_id: string }>();
    if (!room || room.owner_id !== user.uid) {
      return json({ error: 'Forbidden' }, headers, 403);
    }

    const body = (await request.json()) as {
      name?: string;
      dice_system?: string;
      tags?: string[];
      thumbnail_url?: string;
    };
    const now = Date.now();
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now];

    if (body.name !== undefined) { sets.push('name = ?'); vals.push(body.name); }
    if (body.dice_system !== undefined) { sets.push('dice_system = ?'); vals.push(body.dice_system); }
    if (body.tags !== undefined) { sets.push('tags = ?'); vals.push(JSON.stringify(body.tags)); }
    if (body.thumbnail_url !== undefined) { sets.push('thumbnail_url = ?'); vals.push(body.thumbnail_url); }

    vals.push(roomId);
    await env.DB.prepare(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...vals)
      .run();

    return json({ ok: true }, headers);
  }

  // DELETE /api/rooms/:id — ルーム削除
  if (!subResource && request.method === 'DELETE') {
    const room = await env.DB.prepare('SELECT owner_id FROM rooms WHERE id = ?')
      .bind(roomId)
      .first<{ owner_id: string }>();
    if (!room || room.owner_id !== user.uid) {
      return json({ error: 'Forbidden' }, headers, 403);
    }

    await env.DB.prepare('DELETE FROM room_snapshots WHERE room_id = ?').bind(roomId).run();
    await env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId).run();
    return json({ ok: true }, headers);
  }

  return new Response('Not Found', { status: 404, headers });
}
