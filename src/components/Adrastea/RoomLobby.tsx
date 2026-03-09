import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../../config/api';
import { theme } from '../../styles/theme';
import { useRooms, type Room } from '../../hooks/useRooms';
import { useAuth } from '../../contexts/AuthContext';
import { getAvailableSystems } from '../../services/diceRoller';
import { AdModal, AdInput, AdButton, AdTagInput } from './ui/AdComponents';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, X, Share2, Copy } from 'lucide-react';

interface RoomLobbyProps {
  onRoomCreated: (roomId: string) => void;
}

// ── ダイスシステムキャッシュ ──
let cachedSystems: { id: string; name: string }[] | null = null;
let systemsPromise: Promise<{ id: string; name: string }[]> | null = null;

function loadSystems(): Promise<{ id: string; name: string }[]> {
  if (cachedSystems) return Promise.resolve(cachedSystems);
  if (!systemsPromise) {
    systemsPromise = getAvailableSystems().then((s) => {
      cachedSystems = s;
      return s;
    }).catch((err) => {
      systemsPromise = null; // リトライ可能にする
      throw err;
    });
  }
  return systemsPromise;
}

// ── ダイスシステム検索付きドロップダウン ──
function DiceSystemPicker({
  value,
  onChange,
  systems,
}: {
  value: string;
  onChange: (id: string) => void;
  systems: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return systems.slice(0, 50);
    const lower = search.toLowerCase();
    return systems.filter(
      (s) => s.name.toLowerCase().includes(lower) || s.id.toLowerCase().includes(lower),
    ).slice(0, 50);
  }, [systems, search]);

  // 検索変更時にカーソルをリセット
  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // ハイライト行をスクロールに追従
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const selectedLabel = systems.find((s) => s.id === value)?.name ?? value;

  const select = (s: { id: string; name: string }) => {
    onChange(s.id);
    setOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (composingRef.current) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIndex]) select(filtered[highlightIndex]);
        break;
      case 'Escape':
        setOpen(false);
        setSearch('');
        break;
    }
  };

  // ドロップダウン位置計算
  const getDropdownPos = () => {
    if (!btnRef.current) return { top: 0, left: 0, width: 0 };
    const rect = btnRef.current.getBoundingClientRect();
    return { top: rect.bottom, left: rect.left, width: rect.width };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <label style={{ fontSize: '12px', color: theme.textSecondary }}>ダイスシステム</label>
      <button
        className="ad-btn"
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          height: '28px',
          padding: '2px 8px',
          fontSize: '12px',
          background: theme.bgInput,
          border: `1px solid ${theme.borderInput}`,
          borderRadius: 0,
          color: theme.textPrimary,
          textAlign: 'left',
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
      >
        {selectedLabel}
      </button>
      {open && (() => {
        const pos = getDropdownPos();
        return createPortal(
        <div
          ref={dropRef}
          className="adrastea-root"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            background: theme.bgSurface,
            border: `1px solid ${theme.border}`,
            maxHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            placeholder="システム名で検索..."
            autoFocus
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: theme.bgInput,
              border: 'none',
              borderBottom: `1px solid ${theme.border}`,
              color: theme.textPrimary,
              outline: 'none',
            }}
          />
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map((s, i) => (
              <div
                key={s.id}
                onClick={() => select(s)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  background: i === highlightIndex ? theme.accentHighlight : 'transparent',
                  color: theme.textPrimary,
                }}
              >
                {s.name}
                <span style={{ color: theme.textMuted, marginLeft: '6px', fontSize: '10px' }}>
                  {s.id}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: theme.textMuted, textAlign: 'center' }}>
                {systems.length === 0 ? '読み込み中...' : '該当なし'}
              </div>
            )}
          </div>
        </div>,
        document.body,
      );
      })()}
    </div>
  );
}

// ── Sortable ルームカード ──
function SortableRoomCard({
  room,
  diceSystemName,
  onEnter,
  onEdit,
  onDelete,
  onShare,
}: {
  room: Room;
  diceSystemName: string | null;
  onEnter: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: room.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'border-color 0.15s, box-shadow 0.15s',
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging
      ? '0 4px 16px rgba(0,0,0,0.4)'
      : hovered
        ? '0 4px 16px rgba(0,0,0,0.35)'
        : '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.bgSurface,
        border: `1px solid ${hovered ? theme.accentHover : theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'grab',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
      {...attributes}
      {...listeners}
    >
      {/* サムネイル */}
      <div
        onClick={onEnter}
        style={{
          height: '120px',
          background: room.thumbnail_url
            ? `url(${room.thumbnail_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${theme.accentGradientFrom} 0%, ${theme.accentGradientTo} 100%)`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {!room.thumbnail_url && (
          <span style={{ fontSize: '28px', color: theme.textMuted, opacity: 0.3 }}>🎲</span>
        )}
      </div>

      {/* 情報エリア */}
      <div
        onClick={onEnter}
        style={{ padding: '10px 12px', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: theme.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {room.name}
        </div>

        {(diceSystemName || room.tags.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {diceSystemName && (
              <span
                style={{
                  padding: '0 5px',
                  fontSize: '10px',
                  background: theme.greenBgSubtle,
                  color: theme.green,
                  border: `1px solid ${theme.greenBorderSubtle}`,
                }}
              >
                {diceSystemName}
              </span>
            )}
            {room.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '0 5px',
                  fontSize: '10px',
                  background: theme.accentBgSubtle,
                  color: theme.accent,
                  border: `1px solid ${theme.accentBorderSubtle}`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize: '10px', color: theme.textMuted, marginTop: 'auto' }}>
          {new Date(room.updated_at).toLocaleDateString('ja-JP')}
        </div>
      </div>

      {/* アクションボタン */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '2px',
        }}
      >
        <button
          className="ad-btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          title="共有"
          style={{
            width: '24px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            color: theme.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          }}
        >
          <Share2 size={12} />
        </button>
        <button
          className="ad-btn-icon"
          onClick={onEdit}
          title="編集"
          style={{
            width: '24px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            color: theme.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          }}
        >
          <Pencil size={12} />
        </button>
        <button
          className="ad-btn-icon ad-btn-icon--danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="削除"
          style={{
            width: '24px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            color: theme.danger,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── メイン ──
const RoomLobby: React.FC<RoomLobbyProps> = ({ onRoomCreated }) => {
  const { user } = useAuth();
  const { rooms, loading, deleteRoom, updateRoom, reorderRooms } = useRooms(user?.uid);
  const [diceSystems, setDiceSystems] = useState<{ id: string; name: string }[]>(cachedSystems ?? []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shareRoom, setShareRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);

  // マウント時にダイスシステム一覧を先行ロード
  useEffect(() => {
    loadSystems().then(setDiceSystems).catch(console.error);
  }, []);

  // 作成フォーム state
  const [createName, setCreateName] = useState('');
  const [createDice, setCreateDice] = useState('DiceBot');
  const [createTags, setCreateTags] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // 編集フォーム state
  const [editName, setEditName] = useState('');
  const [editDice, setEditDice] = useState('DiceBot');
  const [editTags, setEditTags] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ダイスシステム id → name のマップ（O(1)参照用）
  const diceSystemNameMap = useMemo(() => new Map(diceSystems.map((s) => [s.id, s.name])), [diceSystems]);

  // 全ルームの既存タグ一覧（使用回数順）
  const allExistingTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rooms) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [rooms]);

  // フィルター済みルーム（名前・タグ・ダイスシステムで検索）
  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.dice_system.toLowerCase().includes(q) ||
      (diceSystemNameMap.get(r.dice_system)?.toLowerCase().includes(q) ?? false),
    );
  }, [rooms, searchQuery, diceSystemNameMap]);

  // ── 作成 ──
  const creatingRef = useRef(false);
  const handleCreate = async () => {
    const name = createName.trim();
    if (!name || creatingRef.current) return;
    creatingRef.current = true;
    setIsCreating(true);
    try {
      const res = await apiFetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          dice_system: createDice,
          tags: createTags,
        }),
      });
      if (!res.ok) throw new Error(`ルーム作成に失敗: ${res.status}`);
      const { id } = await res.json();

      onRoomCreated(id);
    } catch (error) {
      console.error('ルーム作成に失敗しました:', error);
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  // ── 削除 ──
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteRoom(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── 編集モーダル開く ──
  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setEditName(room.name);
    setEditDice(room.dice_system);
    setEditTags([...room.tags]);
  };

  // ── 編集保存 ──
  const handleEditSave = async () => {
    if (!editingRoom) return;
    try {
      await updateRoom(editingRoom.id, {
        name: editName.trim() || editingRoom.name,
        dice_system: editDice,
        tags: editTags,
      });
      setEditingRoom(null);
    } catch (err) {
      console.error('ルーム更新に失敗:', err);
    }
  };

  // ── DnD ──
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = filteredRooms.map((r) => r.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newIds = arrayMove(ids, oldIndex, newIndex);
    // 検索中でないときだけ全体の並び順を保存
    if (!searchQuery.trim()) {
      reorderRooms(newIds);
    } else {
      // 検索中はフィルターされてない room の位置を維持しつつ並び替え
      const allIds = rooms.map((r) => r.id);
      const filtered = new Set(filteredRooms.map((r) => r.id));
      const result: string[] = [];
      let fi = 0;
      for (const id of allIds) {
        if (filtered.has(id)) {
          result.push(newIds[fi++]);
        } else {
          result.push(id);
        }
      }
      reorderRooms(result);
    }
  };

  const handleCreateDiceChange = (id: string) => {
    setCreateDice(id);
  };

  const handleEditDiceChange = (id: string) => {
    setEditDice(id);
  };

  return (
    <div
      className="adrastea-root"
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.bgBase,
        color: theme.textPrimary,
        overflow: 'auto',
      }}
    >
      {/* ヘッダー */}
      <div style={{ padding: '24px 32px 0', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          Adrastea
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: theme.textMuted }}>
          TRPG盤面共有ツール
        </p>
      </div>

      {/* 検索 */}
      <div style={{ padding: '0 32px 12px', maxWidth: '400px', margin: '0 auto' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ルーム名・タグで検索..."
          style={{
            width: '100%',
            height: '28px',
            padding: '2px 10px',
            fontSize: '12px',
            background: theme.bgInput,
            border: `1px solid ${theme.borderInput}`,
            borderRadius: 0,
            color: theme.textPrimary,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* カードグリッド */}
      <div style={{ padding: '0 32px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted, fontSize: '13px' }}>
            読み込み中...
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredRooms.map((r) => r.id)} strategy={rectSortingStrategy}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                {/* 新規作成カード */}
                <div
                  className="ad-card-create"
                  onClick={() => {
                    setCreateName('');
                    setCreateDice('DiceBot');
                    setCreateTags([]);
                    setShowCreateModal(true);
                  }}
                  style={{
                    border: `2px dashed ${theme.border}`,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    minHeight: '100px',
                    color: theme.textMuted,
                    fontSize: '13px',
                  }}
                >
                  <Plus size={24} />
                  ルームを作成
                </div>

                {/* ルームカード */}
                {filteredRooms.map((room) => (
                  <SortableRoomCard
                    key={room.id}
                    room={room}
                    diceSystemName={
                      room.dice_system !== 'DiceBot'
                        ? (diceSystemNameMap.get(room.dice_system) ?? room.dice_system)
                        : null
                    }
                    onEnter={() => onRoomCreated(room.id)}
                    onEdit={() => openEditModal(room)}
                    onDelete={() => setDeleteTarget(room)}
                    onShare={() => { setShareRoom(room); setCopied(false); }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 作成モーダル */}
      {showCreateModal && (
        <AdModal
          title="ルームを作成"
          width="400px"
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <AdButton onClick={() => setShowCreateModal(false)}>キャンセル</AdButton>
              <AdButton
                variant="primary"
                disabled={!createName.trim() || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? '作成中...' : '作成'}
              </AdButton>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AdInput
              label="ルーム名"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="例: 第1回セッション"
              autoFocus
            />
            <DiceSystemPicker value={createDice} onChange={handleCreateDiceChange} systems={diceSystems} />
            <AdTagInput tags={createTags} onChange={setCreateTags} existingTags={allExistingTags} />
          </div>
        </AdModal>
      )}

      {/* 編集モーダル */}
      {editingRoom && (
        <AdModal
          title="ルームを編集"
          width="400px"
          onClose={() => setEditingRoom(null)}
          footer={
            <>
              <AdButton onClick={() => setEditingRoom(null)}>キャンセル</AdButton>
              <AdButton variant="primary" onClick={handleEditSave}>
                保存
              </AdButton>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AdInput
              label="ルーム名"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <DiceSystemPicker value={editDice} onChange={handleEditDiceChange} systems={diceSystems} />
            <AdTagInput tags={editTags} onChange={setEditTags} existingTags={allExistingTags} />
          </div>
        </AdModal>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <AdModal
          title="ルームを削除"
          width="360px"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <AdButton onClick={() => setDeleteTarget(null)}>キャンセル</AdButton>
              <AdButton variant="danger" onClick={confirmDelete}>削除</AdButton>
            </>
          }
        >
          <div style={{ fontSize: '13px', color: theme.textSecondary, padding: '8px 0' }}>
            「{deleteTarget.name}」を削除しますか？この操作は取り消せません。
          </div>
        </AdModal>
      )}

      {/* 共有モーダル */}
      {shareRoom && (
        <AdModal
          title={`「${shareRoom.name}」を共有`}
          width="480px"
          onClose={() => setShareRoom(null)}
          footer={
            <AdButton onClick={() => setShareRoom(null)}>閉じる</AdButton>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
            <div
              style={{
                padding: '8px 12px',
                background: theme.bgInput,
                border: `1px solid ${theme.borderInput}`,
                fontSize: '12px',
                color: theme.textPrimary,
                wordBreak: 'break-all',
                userSelect: 'all',
              }}
            >
              {`${window.location.origin}/adrastea/${shareRoom.id}`}
            </div>
            <AdButton
              variant="primary"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/adrastea/${shareRoom.id}`);
                setCopied(true);
              }}
            >
              <Copy size={12} />
              {copied ? 'コピーしました' : 'リンクをコピー'}
            </AdButton>
          </div>
        </AdModal>
      )}
    </div>
  );
};

export default RoomLobby;
