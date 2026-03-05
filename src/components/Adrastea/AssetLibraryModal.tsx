import React, { useState, useRef, useCallback } from 'react';
import { theme } from '../../styles/theme';
import { useAssets } from '../../hooks/useAssets';
import { X } from 'lucide-react';

interface AssetLibraryModalProps {
  onClose: () => void;
}

export function AssetLibraryModal({ onClose }: AssetLibraryModalProps) {
  const { assets, loading, uploadAsset, deleteAsset, updateAssetTags } = useAssets();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = assets.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.filename.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        await uploadAsset(file);
      } catch (err) {
        console.error('アップロード失敗:', err);
      } finally {
        setUploading(false);
      }
    },
    [uploadAsset]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleDelete = useCallback(
    async (assetId: string, r2Key: string) => {
      await deleteAsset(assetId, r2Key);
      setConfirmDeleteId(null);
    },
    [deleteAsset]
  );

  const handleSaveTags = useCallback(
    async (assetId: string) => {
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await updateAssetTags(assetId, tags);
      setEditingTagsId(null);
      setTagInput('');
    },
    [tagInput, updateAssetTags]
  );

  const modalStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface, border: `1px solid ${theme.border}`,
    borderRadius: 0, padding: '12px', width: '90vw', maxWidth: '900px',
    height: '80vh', color: theme.textPrimary,
    display: 'flex', flexDirection: 'column',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: theme.bgInput, border: `1px solid ${theme.borderInput}`,
    borderRadius: 0, color: theme.textPrimary,
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>アセットライブラリ</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 検索バー + アップロードボタン */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ファイル名・タグで検索..."
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '8px 16px', background: theme.accent, color: theme.textOnAccent,
              border: 'none', borderRadius: 0, cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* ドラッグ&ドロップエリア */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? theme.accent : theme.borderInput}`,
            borderRadius: 0, padding: '8px', textAlign: 'center',
            marginBottom: '8px', fontSize: '12px', color: theme.textSecondary,
            background: dragging ? 'rgba(137,180,250,0.1)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          ここにドラッグ&ドロップでアップロード
        </div>

        {/* アセットグリッド */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: theme.textMuted, padding: '24px 0' }}>
              読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: '0.85rem', padding: '24px 0' }}>
              {search ? '該当するアセットがありません' : 'アセットがありません'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    border: `1px solid ${theme.border}`, borderRadius: 0,
                    overflow: 'hidden', background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '4px' }}>
                    {/* ファイル名 */}
                    <div style={{
                      fontSize: '0.75rem', color: theme.textPrimary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: '4px',
                    }}>
                      {asset.filename}
                    </div>

                    {/* タグ */}
                    {editingTagsId === asset.id ? (
                      <div style={{ marginBottom: '4px' }}>
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTags(asset.id); }}
                          placeholder="タグ（カンマ区切り）"
                          autoFocus
                          style={{
                            ...inputStyle, fontSize: '0.7rem', padding: '4px 6px', marginBottom: '4px',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleSaveTags(asset.id)}
                            style={{
                              flex: 1, padding: '2px 6px', fontSize: '0.7rem',
                              background: theme.accent, color: theme.textOnAccent,
                              border: 'none', borderRadius: 0, cursor: 'pointer',
                            }}
                          >
                            保存
                          </button>
                          <button
                            onClick={() => { setEditingTagsId(null); setTagInput(''); }}
                            style={{
                              flex: 1, padding: '2px 6px', fontSize: '0.7rem',
                              background: theme.bgInput, color: theme.textPrimary,
                              border: 'none', borderRadius: 0, cursor: 'pointer',
                            }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setEditingTagsId(asset.id); setTagInput(asset.tags.join(', ')); }}
                        style={{
                          fontSize: '0.65rem', color: theme.textMuted, cursor: 'pointer',
                          marginBottom: '4px', minHeight: '16px',
                        }}
                      >
                        {asset.tags.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                            {asset.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  background: 'rgba(137,180,250,0.15)', padding: '1px 4px',
                                  borderRadius: 0, fontSize: '0.6rem',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic' }}>タグを追加...</span>
                        )}
                      </div>
                    )}

                    {/* 削除ボタン */}
                    {confirmDeleteId === asset.id ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleDelete(asset.id, asset.r2_key)}
                          style={{
                            flex: 1, padding: '4px', fontSize: '0.7rem',
                            background: theme.danger, color: theme.textOnAccent,
                            border: 'none', borderRadius: 0, cursor: 'pointer',
                          }}
                        >
                          削除する
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            flex: 1, padding: '4px', fontSize: '0.7rem',
                            background: theme.bgInput, color: theme.textPrimary,
                            border: 'none', borderRadius: 0, cursor: 'pointer',
                          }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(asset.id)}
                        style={{
                          width: '100%', padding: '4px', fontSize: '0.7rem',
                          background: 'transparent', color: theme.danger,
                          border: `1px solid ${theme.danger}`, borderRadius: 0, cursor: 'pointer',
                        }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
