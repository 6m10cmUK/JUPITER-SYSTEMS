import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { theme } from '../../styles/theme';
import { SortableListPanel, SortableListItem, ConfirmModal } from './ui';
import { DropdownMenu } from './ui/DropdownMenu';
import type { BgmTrack } from '../../types/adrastea.types';
import {
  Play, Pause, Square, Trash2, Plus, Music,
  Volume2, VolumeX,
} from 'lucide-react';
import { AssetLibraryModal } from './AssetLibraryModal';

const extractVideoId = (url: string): string => {
  const match = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
  return match ? match[1] : url;
};

/** Dropbox / Google Drive の共有URLを直接再生可能なURLに変換する */
const normalizeAudioUrl = (url: string): string => {
  // Dropbox: ?dl=0 → ?dl=1（なければ追加）
  if (url.includes('dropbox.com/')) {
    const u = new URL(url);
    u.searchParams.set('dl', '1');
    return u.toString();
  }
  // Google Drive: /file/d/FILE_ID/view → uc?export=download&id=FILE_ID
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  // Google Drive: open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?.*id=([^&]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  }
  return url;
};

// --- Volume Fader (OBS-style) ---
function VolumeFader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);

  return (
    <div style={{ position: 'relative', width: '100%', height: '16px' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: theme.bgInput,
        border: `1px solid ${theme.border}`,
      }} />
      <div style={{
        position: 'absolute', top: 1, bottom: 1, left: 1,
        width: `${pct}%`,
        background: theme.accent,
        opacity: 0.7,
        transition: 'width 0.05s',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: '4px', fontSize: '9px', color: theme.textMuted,
        pointerEvents: 'none',
      }}>
        {pct}%
      </div>
      <input
        type="range"
        min="0" max="1" step="0.01"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', margin: 0,
        }}
      />
    </div>
  );
}

// --- BgmTrackRow ---
interface BgmTrackRowProps {
  track: BgmTrack;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onUpdate: (id: string, data: Partial<BgmTrack>) => void;
  onRemove: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  renamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

function BgmTrackRow({
  track, isEditing, onEdit, onUpdate, onRemove, onContextMenu,
  renamingId, renameValue, onRenameChange, onRenameSubmit, onRenameCancel,
}: BgmTrackRowProps) {
  const [localMuted, setLocalMuted] = useState(false);

  const iconBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  };

  const effectiveVolume = localMuted ? 0 : track.bgm_volume;

  return (
    <div onContextMenu={onContextMenu ? (e) => onContextMenu(e, track.id) : undefined}>
      <SortableListItem id={track.id} onClick={() => onEdit(track.id)} isSelected={isEditing}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          marginBottom: '4px', fontSize: '11px',
        }}>
          {/* Play/Pause */}
          <button
            style={{ ...iconBtn, color: track.is_playing && !track.is_paused ? theme.accent : theme.textSecondary }}
            onClick={(e) => {
              e.stopPropagation();
              if (!track.is_playing) {
                onUpdate(track.id, { is_playing: true, is_paused: false });
              } else if (track.is_paused) {
                onUpdate(track.id, { is_paused: false });
              } else {
                onUpdate(track.id, { is_paused: true });
              }
            }}
            title={track.is_playing && !track.is_paused ? '一時停止' : '再生'}
          >
            {track.is_playing && !track.is_paused ? <Pause size={13} /> : <Play size={13} />}
          </button>

          {/* Stop */}
          <button
            style={{ ...iconBtn, color: !track.is_playing ? theme.accent : theme.textSecondary }}
            onClick={(e) => { e.stopPropagation(); onUpdate(track.id, { is_playing: false, is_paused: false }); }}
            title="停止"
            disabled={!track.is_playing}
          >
            <Square size={11} />
          </button>

          {/* Track name */}
          {renamingId === track.id ? (
            <input
              autoFocus
              value={renameValue ?? ''}
              onChange={(e) => onRenameChange?.(e.target.value)}
              onBlur={() => onRenameSubmit?.()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit?.();
                else if (e.key === 'Escape') onRenameCancel?.();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1, minWidth: 0,
                background: theme.bgDeep, border: `1px solid ${theme.border}`,
                color: theme.textPrimary, fontSize: '11px', padding: '1px 4px',
                outline: 'none',
              }}
            />
          ) : (
            <span
              style={{
                flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: theme.textPrimary, fontSize: '11px',
              }}
            >
              {track.name}
            </span>
          )}

          {/* Remove from scene */}
          <button
            style={{ ...iconBtn, color: theme.danger }}
            onClick={(e) => { e.stopPropagation(); onRemove(track.id); }}
            title="このシーンから除去"
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Fader row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            style={{
              ...iconBtn,
              color: localMuted ? theme.danger : theme.textSecondary,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setLocalMuted(!localMuted);
              onUpdate(track.id, { bgm_volume: localMuted ? track.bgm_volume : 0 });
            }}
            title={localMuted ? 'ミュート解除' : 'ミュート'}
          >
            {localMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <div style={{ flex: 1 }}>
            <VolumeFader
              value={effectiveVolume}
              onChange={(v) => {
                if (localMuted && v > 0) setLocalMuted(false);
                onUpdate(track.id, { bgm_volume: v });
              }}
            />
          </div>
        </div>
      </div>
    </SortableListItem>
    </div>
  );
}

// --- BgmPanel ---
export function BgmPanel() {
  const { bgms, addBgm, updateBgm, removeBgm, reorderBgms, activeScene, editingBgmId, setEditingBgmId, clearAllEditing } = useAdrasteaContext();

  // 現在のシーンに属する or 再生中のBGMを表示
  const currentSceneId = activeScene?.id ?? '';
  const filteredBgms = useMemo(
    () => bgms
      .filter(b => b.scene_ids.includes(currentSceneId))
      .sort((a, b) => a.sort_order - b.sort_order),
    [bgms, currentSceneId]
  );

  // ローカルstate で楽観的UI更新
  const [localBgms, setLocalBgms] = useState<BgmTrack[]>([]);
  const prevFilteredRef = useRef<BgmTrack[]>([]);

  useEffect(() => {
    if (prevFilteredRef.current !== filteredBgms) {
      prevFilteredRef.current = filteredBgms;
      setLocalBgms(filteredBgms);
    }
  }, [filteredBgms]);

  const handleEdit = useCallback((id: string) => {
    clearAllEditing();
    setEditingBgmId(id);
  }, [clearAllEditing, setEditingBgmId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localBgms.findIndex(b => b.id === active.id);
    const newIndex = localBgms.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(localBgms, oldIndex, newIndex);
    setLocalBgms(reordered);
    reorderBgms(reordered.map(b => b.id));
  }, [localBgms, reorderBgms]);

  const hasPlaying = localBgms.some(b => b.is_playing && !b.is_paused);
  const hasPaused = localBgms.some(b => b.is_playing && b.is_paused);
  const hasAnyPlaying = localBgms.some(b => b.is_playing);

  const handleBulkPlay = useCallback(() => {
    localBgms.forEach(b => {
      if (!b.is_playing || b.is_paused) updateBgm(b.id, { is_playing: true, is_paused: false });
    });
  }, [localBgms, updateBgm]);

  const handleBulkPause = useCallback(() => {
    localBgms.forEach(b => {
      if (b.is_playing && !b.is_paused) updateBgm(b.id, { is_paused: true });
    });
  }, [localBgms, updateBgm]);

  const handleBulkStop = useCallback(() => {
    localBgms.forEach(b => {
      if (b.is_playing) updateBgm(b.id, { is_playing: false, is_paused: false });
    });
  }, [localBgms, updateBgm]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; trackId: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleContextMenu = useCallback((e: React.MouseEvent, trackId: string) => {
    e.preventDefault();
    clearAllEditing();
    setEditingBgmId(trackId); // 右クリックで選択を移す
    setContextMenu({ x: e.clientX, y: e.clientY, trackId });
  }, [clearAllEditing, setEditingBgmId]);

  const handleRenameSubmit = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      updateBgm(renamingId, { name: renameValue.trim() });
    }
    setRenamingId(null);
  }, [renamingId, renameValue, updateBgm]);

  const handleDuplicate = useCallback(async () => {
    if (!contextMenu) return;
    const track = bgms.find(b => b.id === contextMenu.trackId);
    if (!track) return;
    const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = track as any;
    await addBgm({ ...rest, name: `${track.name} (複製)` });
    setContextMenu(null);
  }, [contextMenu, bgms, addBgm]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    await removeBgm(pendingDeleteId);
    setPendingDeleteId(null);
  }, [pendingDeleteId, removeBgm]);

  const handleAddFromPicker = useCallback(async (url: string, _assetId?: string, assetTitle?: string) => {
    if (!activeScene) return;
    const normalizedUrl = normalizeAudioUrl(url);
    const videoId = extractVideoId(normalizedUrl);
    const isYoutube = videoId !== normalizedUrl;
    const source = isYoutube ? videoId : normalizedUrl;

    // 同じソースの既存トラックがあれば scene_ids に追加するだけ
    const existing = bgms.find(b => b.bgm_source === source);
    if (existing) {
      if (!existing.scene_ids.includes(activeScene.id)) {
        updateBgm(existing.id, {
          scene_ids: [...existing.scene_ids, activeScene.id],
          auto_play_scene_ids: [...existing.auto_play_scene_ids, activeScene.id],
        });
      }
      setShowAddPicker(false);
      return;
    }

    if (isYoutube) {
      let title = assetTitle || videoId;
      if (!assetTitle) {
        try {
          const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          const data = await res.json();
          if (data.title) title = data.title;
        } catch {
          // タイトル取得失敗時はvideoIdのまま
        }
      }
      addBgm({ name: title, bgm_type: 'youtube', bgm_source: videoId, scene_ids: [activeScene.id], auto_play_scene_ids: [activeScene.id] });
    } else {
      const name = assetTitle
        || decodeURIComponent(normalizedUrl.split('/').pop()?.split('?')[0] || '新規BGM').replace(/^\d+_/, '');
      addBgm({ name, bgm_type: 'url', bgm_source: normalizedUrl, scene_ids: [activeScene.id], auto_play_scene_ids: [activeScene.id] });
    }
    setShowAddPicker(false);
  }, [addBgm, updateBgm, bgms, activeScene]);

  return (
    <>
      <SortableListPanel
        title="BGM"
        titleIcon={<Music size={14} />}
        headerActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={handleBulkPlay}
              disabled={localBgms.length === 0}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '2px',
                color: hasPlaying ? theme.accent : theme.textSecondary,
                opacity: localBgms.length === 0 ? 0.3 : 1,
              }}
              title="全て再生"
            >
              <Play size={13} />
            </button>
            <button
              onClick={handleBulkPause}
              disabled={!hasPlaying}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '2px',
                color: hasPaused ? theme.accent : theme.textSecondary,
                opacity: !hasPlaying ? 0.3 : 1,
              }}
              title="全て一時停止"
            >
              <Pause size={13} />
            </button>
            <button
              onClick={handleBulkStop}
              disabled={!hasAnyPlaying}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '2px',
                color: theme.textSecondary,
                opacity: !hasAnyPlaying ? 0.3 : 1,
              }}
              title="全て停止"
            >
              <Square size={11} />
            </button>
            <button
              onClick={() => setShowAddPicker(true)}
              style={{
                background: 'transparent', border: 'none',
                color: theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center',
                padding: '2px',
              }}
              title="トラック追加"
            >
              <Plus size={15} />
            </button>
          </div>
        }
        items={localBgms}
        onDragEnd={handleDragEnd}
        emptyMessage="トラックがありません"
      >
        {localBgms.map(track => (
          <BgmTrackRow
            key={track.id}
            track={track}
            isEditing={editingBgmId === track.id}
            onEdit={handleEdit}
            onUpdate={updateBgm}
            onContextMenu={handleContextMenu}
            renamingId={renamingId}
            renameValue={renameValue}
            onRenameChange={setRenameValue}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={() => setRenamingId(null)}
            onRemove={(id) => {
              const track = bgms.find(b => b.id === id);
              if (!track || !currentSceneId) return;
              updateBgm(id, {
                scene_ids: track.scene_ids.filter(s => s !== currentSceneId),
                auto_play_scene_ids: track.auto_play_scene_ids.filter(s => s !== currentSceneId),
                is_playing: false,
                is_paused: false,
              });
            }}
          />
        ))}
      </SortableListPanel>

      {contextMenu && (
        <DropdownMenu
          mode="context"
          open={true}
          onOpenChange={(open) => { if (!open) setContextMenu(null); }}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          items={[
            {
              label: '複製',
              onClick: handleDuplicate,
            },
            'separator',
            {
              label: '削除',
              danger: true,
              onClick: () => {
                setContextMenu(null);
                setPendingDeleteId(contextMenu.trackId);
              },
            },
          ]}
        />
      )}

      {pendingDeleteId && (() => {
        const delTrack = bgms.find(b => b.id === pendingDeleteId);
        return (
          <ConfirmModal
            message={`「${delTrack?.name ?? 'BGM'}」を削除しますか？（全シーンから削除されます）`}
            confirmLabel="削除"
            danger
            onConfirm={handleConfirmDelete}
            onCancel={() => setPendingDeleteId(null)}
          />
        );
      })()}

      {showAddPicker && (
        <AssetLibraryModal
          initialTab="audio"
          onClose={() => setShowAddPicker(false)}
          onSelect={handleAddFromPicker}
        />
      )}
    </>
  );
}
