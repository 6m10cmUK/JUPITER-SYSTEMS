"""
Adrastea シグナリングサーバー（独立版）
WebRTC P2P 接続のシグナリングと SSE プッシュ通知を提供する
"""
import asyncio
import json as _json
from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

app = FastAPI(title="Adrastea Signaling Server")


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(_cleanup_task())


async def _cleanup_task():
    """定期的に期限切れピアを検出してSSEで通知する"""
    while True:
        await asyncio.sleep(15)  # 15秒ごとにチェック
        try:
            await _notify_expired_peers()
        except Exception:
            pass


async def _notify_expired_peers():
    """期限切れピアをSSEでpeer_leftとして通知し、ストアから削除する"""
    now = datetime.now()
    for room_id in list(_sse_connections.keys()):
        store_key = f"{room_id}:store"
        if store_key not in _signal_store:
            continue
        data = _signal_store[store_key]
        expired_peers = []
        for key in list(data.keys()):
            if not key.startswith("peer:"):
                continue
            peer_data = data[key]
            if "expires_at" not in peer_data:
                continue
            expires_at = peer_data["expires_at"]
            if isinstance(expires_at, str):
                try:
                    expires_at = datetime.fromisoformat(expires_at)
                except Exception:
                    continue
            if now > expires_at:
                expired_peers.append(key[5:])  # "peer:" を除いたpeerIdを取得
        for peer_id in expired_peers:
            await _push_to_room(room_id, "peer_left", {"peerId": peer_id})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# シグナリングデータ保存: room_id:store -> {offer:peer_id, answer:peer_id, ice:peer_id, peers, ...}
_signal_store: dict[str, dict[str, Any]] = {}
_signal_ttl_seconds = 90  # 90秒に短縮（ハートビートで更新するので実用的）

# SSE接続管理: room_id -> {peer_id -> asyncio.Queue}
_sse_connections: dict[str, dict[str, asyncio.Queue]] = {}


async def _push_to_room(room_id: str, event_type: str, data: dict, target_peer_id: str | None = None):
    """SSEイベントをルームのクライアントにプッシュ"""
    if room_id not in _sse_connections:
        return
    for peer_id, queue in list(_sse_connections[room_id].items()):
        if target_peer_id is None or peer_id == target_peer_id:
            try:
                await queue.put({"event": event_type, "data": data})
            except Exception:
                pass


def _cleanup_expired_signal_entries(room_id: str) -> None:
    """期限切れエントリを削除、および空になったルームを削除"""
    now = datetime.now()
    store_key = f"{room_id}:store"
    if store_key in _signal_store:
        data = _signal_store[store_key]
        for key in list(data.keys()):
            if "expires_at" in data[key]:
                expires_at = data[key]["expires_at"]
                if isinstance(expires_at, str):
                    try:
                        expires_at = datetime.fromisoformat(expires_at)
                    except:
                        continue
                if now > expires_at:
                    del data[key]

        # ルーム内のエントリが全て期限切れになった場合、ルームごと削除
        if len(data) == 0:
            del _signal_store[store_key]



def _get_expiration_time() -> datetime:
    """TTL付き有効期限を返す"""
    return datetime.now() + timedelta(seconds=_signal_ttl_seconds)


def _get_signal_data(room_id: str) -> dict[str, Any]:
    """ルームのシグナリングデータを取得（なければ作成）"""
    store_key = f"{room_id}:store"
    _cleanup_expired_signal_entries(room_id)
    if store_key not in _signal_store:
        _signal_store[store_key] = {}
    return _signal_store[store_key]


@app.post("/signal/{room_id}/peers")
async def register_peer(room_id: str, body: dict[str, Any]):
    """POST /signal/{room_id}/peers - peer登録"""
    peer_id = body.get("peerId")
    joined_at = body.get("joinedAt")  # ミリ秒タイムスタンプ
    public_key = body.get("publicKey")  # base64エンコード済みECDSA公開鍵

    if not peer_id:
        return {"error": "peerId required"}, 400

    data = _get_signal_data(room_id)
    if "peers" not in data:
        data["peers"] = []

    # 同じpeerIdのみ削除（再登録・ハートビート）。同じuserの別タブは共存させる
    is_existing = any(p["peerId"] == peer_id for p in data["peers"])
    data["peers"] = [
        p for p in data["peers"]
        if p["peerId"] != peer_id
    ]

    data["peers"].append({
        "peerId": peer_id,
        "joinedAt": joined_at,
        "publicKey": public_key,
        "timestamp": datetime.now().isoformat(),
        "expires_at": _get_expiration_time().isoformat(),
    })

    # 新規ピアのみSSEで通知（既存peerIdの更新=ハートビートは通知しない）
    if not is_existing:
        await _push_to_room(room_id, "peer_joined", {
            "peerId": peer_id,
            "joinedAt": joined_at,
            "publicKey": public_key,
        })

    return {"ok": True}


@app.get("/signal/{room_id}/peers")
async def get_peers(room_id: str):
    """GET /signal/{room_id}/peers - peer一覧取得"""
    data = _get_signal_data(room_id)
    peers = data.get("peers", [])

    now = datetime.now()
    sse_connected = set(_sse_connections.get(room_id, {}).keys())
    active_peers = []
    for p in peers:
        # TTLチェック
        if "expires_at" in p:
            try:
                expires_at = datetime.fromisoformat(p["expires_at"])
                if now > expires_at:
                    continue
            except:
                pass
        # SSEに繋いでいないピアは除外（ゴーストホスト防止）
        if sse_connected and p["peerId"] not in sse_connected:
            continue
        active_peers.append(p)

    return {"peers": active_peers}


@app.post("/signal/{room_id}/offer")
async def send_offer(room_id: str, body: dict[str, str]):
    """POST /signal/{room_id}/offer - SDP offer書き込み"""
    from_peer = body.get("fromPeer", "")
    to_peer = body.get("toPeer", "")
    sdp = body.get("sdp")

    if not to_peer or not sdp:
        return {"error": "toPeer and sdp required"}

    data = _get_signal_data(room_id)
    data[f"offer:{to_peer}"] = {
        "sdp": sdp,
        "from_peer": from_peer,
        "expires_at": _get_expiration_time().isoformat()
    }

    # SSEで宛先ピアに通知
    await _push_to_room(room_id, "offer", {"fromPeer": from_peer, "toPeer": to_peer, "sdp": sdp}, target_peer_id=to_peer)

    return {"ok": True}


@app.get("/signal/{room_id}/offer")
async def get_offer(room_id: str, peerId: str = None):
    """GET /signal/{room_id}/offer?peerId=xxx - SDP offer取得"""
    if not peerId:
        return {"error": "peerId required"}, 400

    data = _get_signal_data(room_id)
    offer_data = data.get(f"offer:{peerId}")

    if not offer_data:
        return {"sdp": None}

    # 有効期限チェック
    now = datetime.now()
    if "expires_at" in offer_data:
        try:
            expires_at = datetime.fromisoformat(offer_data["expires_at"])
            if now > expires_at:
                return {"sdp": None}
        except:
            pass

    return {"sdp": offer_data.get("sdp")}


@app.post("/signal/{room_id}/answer")
async def send_answer(room_id: str, body: dict[str, str]):
    """POST /signal/{room_id}/answer - SDP answer書き込み"""
    from_peer = body.get("fromPeer", "")
    to_peer = body.get("toPeer", "")
    sdp = body.get("sdp")

    if not to_peer or not sdp:
        return {"error": "toPeer and sdp required"}

    data = _get_signal_data(room_id)
    data[f"answer:{to_peer}"] = {
        "sdp": sdp,
        "from_peer": from_peer,
        "expires_at": _get_expiration_time().isoformat()
    }

    # SSEで宛先ピアに通知
    await _push_to_room(room_id, "answer", {"fromPeer": from_peer, "toPeer": to_peer, "sdp": sdp}, target_peer_id=to_peer)

    return {"ok": True}


@app.get("/signal/{room_id}/answer")
async def get_answer(room_id: str, peerId: str = None):
    """GET /signal/{room_id}/answer?peerId=xxx - SDP answer取得"""
    if not peerId:
        return {"error": "peerId required"}, 400

    data = _get_signal_data(room_id)
    answer_data = data.get(f"answer:{peerId}")

    if not answer_data:
        return {"sdp": None}

    # 有効期限チェック
    now = datetime.now()
    if "expires_at" in answer_data:
        try:
            expires_at = datetime.fromisoformat(answer_data["expires_at"])
            if now > expires_at:
                return {"sdp": None}
        except:
            pass

    return {"sdp": answer_data.get("sdp")}


@app.post("/signal/{room_id}/ice")
async def send_ice_candidate(room_id: str, body: dict[str, str]):
    """POST /signal/{room_id}/ice - ICE候補追加"""
    from_peer = body.get("fromPeer", "")
    to_peer = body.get("toPeer", "")
    candidate = body.get("candidate")

    if not to_peer or not candidate:
        return {"error": "toPeer and candidate required"}

    data = _get_signal_data(room_id)
    key = f"ice:{to_peer}"

    if key not in data:
        data[key] = {
            "candidates": [],
            "expires_at": _get_expiration_time().isoformat()
        }

    data[key]["candidates"].append(candidate)
    data[key]["expires_at"] = _get_expiration_time().isoformat()

    # SSEで宛先ピアに通知
    await _push_to_room(room_id, "ice", {"fromPeer": from_peer, "toPeer": to_peer, "candidate": candidate}, target_peer_id=to_peer)

    return {"ok": True}


@app.get("/signal/{room_id}/ice")
async def get_ice_candidates(room_id: str, peerId: str = None):
    """GET /signal/{room_id}/ice?peerId=xxx - ICE候補取得"""
    if not peerId:
        return {"error": "peerId required"}, 400

    data = _get_signal_data(room_id)
    ice_data = data.get(f"ice:{peerId}")

    if not ice_data:
        return {"candidates": []}

    # 有効期限チェック
    now = datetime.now()
    if "expires_at" in ice_data:
        try:
            expires_at = datetime.fromisoformat(ice_data["expires_at"])
            if now > expires_at:
                return {"candidates": []}
        except:
            pass

    return {"candidates": ice_data.get("candidates", [])}


@app.get("/signal/{room_id}/events")
async def signal_events(room_id: str, peerId: str):
    """GET /signal/{room_id}/events?peerId=xxx - SSEストリーム"""
    queue: asyncio.Queue = asyncio.Queue()

    if room_id not in _sse_connections:
        _sse_connections[room_id] = {}
    _sse_connections[room_id][peerId] = queue

    # 接続時に現在のピアリストを送信（SSEに繋いでいないピアは除外）
    data = _get_signal_data(room_id)
    # この時点でSSEに繋いでいるピアのみを含める（自分のキューはまだ追加済み）
    sse_now = set(_sse_connections.get(room_id, {}).keys())
    current_peers = [
        p for p in data.get("peers", [])
        if p.get("peerId") != peerId and p.get("peerId") in sse_now
    ]

    async def event_generator():
        # 既存ピアを初期通知
        for p in current_peers:
            msg = f"event: peer_joined\ndata: {_json.dumps({'peerId': p['peerId'], 'joinedAt': p.get('joinedAt', 0), 'publicKey': p.get('publicKey', '')})}\n\n"
            yield msg

        # 接続前に保存済みの offer/answer/ice を即座に配信（catch-up）
        pending_offer = data.get(f"offer:{peerId}")
        if pending_offer and "from_peer" in pending_offer:
            yield f"event: offer\ndata: {_json.dumps({'fromPeer': pending_offer['from_peer'], 'toPeer': peerId, 'sdp': pending_offer['sdp']})}\n\n"

        pending_answer = data.get(f"answer:{peerId}")
        if pending_answer and "from_peer" in pending_answer:
            yield f"event: answer\ndata: {_json.dumps({'fromPeer': pending_answer['from_peer'], 'toPeer': peerId, 'sdp': pending_answer['sdp']})}\n\n"

        pending_ice = data.get(f"ice:{peerId}")
        if pending_ice and "candidates" in pending_ice:
            for candidate in pending_ice.get("candidates", []):
                yield f"event: ice\ndata: {_json.dumps({'fromPeer': pending_ice.get('from_peer', ''), 'toPeer': peerId, 'candidate': candidate})}\n\n"

        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=30.0)
                    if item is None:
                        break
                    yield f"event: {item['event']}\ndata: {_json.dumps(item['data'])}\n\n"
                except asyncio.TimeoutError:
                    # keepalive ping
                    yield f"event: ping\ndata: {{}}\n\n"
        finally:
            if room_id in _sse_connections:
                _sse_connections[room_id].pop(peerId, None)
                if not _sse_connections[room_id]:
                    del _sse_connections[room_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.delete("/signal/{room_id}/peers/{peer_id}")
async def unregister_peer_endpoint(room_id: str, peer_id: str):
    """DELETE /signal/{room_id}/peers/{peer_id} - peer登録解除"""
    data = _get_signal_data(room_id)
    data["peers"] = [p for p in data.get("peers", []) if p["peerId"] != peer_id]
    await _push_to_room(room_id, "peer_left", {"peerId": peer_id})
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
