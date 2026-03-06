import React, { useState, useRef, useCallback } from 'react';
import { theme } from '../../styles/theme';
import { useAssets } from '../../hooks/useAssets';
import { X, Plus, Upload, Link } from 'lucide-react';
import type { Asset } from '../../types/adrastea.types';

interface AssetLibraryModalProps {
  onClose: () => void;
  onSelect?: (url: string) => void;
  initialTab?: 'image' | 'audio';
}

type AddMode = null | 'pick' | 'url';

export function AssetLibraryModal({ onClose, onSelect, initialTab = 'image' }: AssetLibraryModalProps) {
  const { assets, loading, uploadAsset, uploadAudioAsset, addAssetByUrl, deleteAsset, updateAssetTags, updateAssetTitle } = useAssets();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'audio'>(initialTab);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = assets.filter((a) => {
    if (a.asset_type !== activeTab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.filename.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        if (activeTab === 'audio') {
          await uploadAudioAsset(file);
        } else {
          await uploadAsset(file);
        }
      } catch (err) {
        console.error('アップロード失敗:', err);
      } finally {
        setUploading(false);
        setAddMode(null);
      }
    },
    [activeTab, uploadAsset, uploadAudioAsset]
  );

  const handleAddByUrl = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    if (onSelect) {
      onSelect(url);
      onClose();
    } else {
      await addAssetByUrl(url, activeTab);
    }
    setUrlInput('');
    setAddMode(null);
  }, [urlInput, onSelect, onClose, activeTab, addAssetByUrl]);

  const handleDelete = useCallback(
    async (assetId: string, r2Key: string) => {
      try {
        await deleteAsset(assetId, r2Key);
      } catch (err) {
        console.error('アセット削除失敗:', err);
        setError('アセットの削除に失敗しました');
      } finally {
        setConfirmDeleteId(null);
      }
    },
    [deleteAsset]
  );

  const handleSaveTags = useCallback(
    async (assetId: string) => {
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      try {
        await updateAssetTags(assetId, tags);
      } catch (err) {
        console.error('タグ保存失敗:', err);
        setError('タグの保存に失敗しました');
      } finally {
        setEditingTagsId(null);
        setTagInput('');
      }
    },
    [tagInput, updateAssetTags]
  );

  const handleSaveTitle = useCallback(
    async (assetId: string) => {
      const title = titleInput.trim();
      if (title) {
        try {
          await updateAssetTitle(assetId, title);
        } catch (err) {
          console.error('タイトル保存失敗:', err);
        }
      }
      setEditingTitleId(null);
      setTitleInput('');
    },
    [titleInput, updateAssetTitle]
  );

  const handleAssetClick = useCallback(
    (url: string) => {
      if (onSelect) {
        onSelect(url);
        onClose();
      }
    },
    [onSelect, onClose]
  );

  const modalStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: theme.bgOverlay,
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

  const tabStyle = (tab: 'image' | 'audio'): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: activeTab === tab ? 600 : 400,
    background: 'transparent',
    color: activeTab === tab ? theme.textPrimary : theme.textSecondary,
    border: 'none',
    borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : '2px solid transparent',
    borderRadius: 0,
    cursor: 'pointer',
  });

  const renderTagSection = (asset: Asset) => {
    if (editingTagsId === asset.id) {
      return (
        <div style={{ marginBottom: '4px' }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTags(asset.id); }}
            placeholder="タグ（カンマ区切り）"
            autoFocus
            style={{ ...inputStyle, fontSize: '0.7rem', padding: '4px 6px', marginBottom: '4px' }}
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
      );
    }
    return (
      <div
        onClick={(e) => { e.stopPropagation(); setEditingTagsId(asset.id); setTagInput(asset.tags.join(', ')); }}
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
                  background: theme.accentBgSubtle, padding: '1px 4px',
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
    );
  };

  const renderDeleteSection = (asset: Asset) => {
    if (confirmDeleteId === asset.id) {
      return (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(asset.id, asset.r2_key); }}
            style={{
              flex: 1, padding: '4px', fontSize: '0.7rem',
              background: theme.danger, color: theme.textOnAccent,
              border: 'none', borderRadius: 0, cursor: 'pointer',
            }}
          >
            削除する
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
            style={{
              flex: 1, padding: '4px', fontSize: '0.7rem',
              background: theme.bgInput, color: theme.textPrimary,
              border: 'none', borderRadius: 0, cursor: 'pointer',
            }}
          >
            取消
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(asset.id); }}
        style={{
          width: '100%', padding: '4px', fontSize: '0.7rem',
          background: 'transparent', color: theme.danger,
          border: `1px solid ${theme.danger}`, borderRadius: 0, cursor: 'pointer',
        }}
      >
        削除
      </button>
    );
  };

  const addCardStyle: React.CSSProperties = {
    border: `2px dashed ${theme.borderInput}`,
    borderRadius: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: theme.textSecondary,
    transition: 'border-color 0.2s, color 0.2s',
  };

  const subModalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: theme.bgOverlay,
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200,
  };

  const subModalPanel: React.CSSProperties = {
    background: theme.bgSurface, border: `1px solid ${theme.border}`,
    borderRadius: 0, padding: '16px', width: '360px', maxWidth: '90vw',
    color: theme.textPrimary, display: 'flex', flexDirection: 'column', gap: '12px',
  };

  const menuBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 14px', fontSize: '0.85rem',
    background: 'transparent', color: theme.textPrimary,
    border: `1px solid ${theme.border}`, borderRadius: 0,
    cursor: 'pointer', width: '100%',
    transition: 'background 0.15s',
  };

  const renderAddSubModal = () => {
    if (!addMode) return null;

    if (addMode === 'url') {
      return (
        <div style={subModalOverlay} onClick={(e) => { e.stopPropagation(); setAddMode(null); setUrlInput(''); }}>
          <div style={subModalPanel} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>URLから追加</h4>
              <button
                onClick={() => { setAddMode(null); setUrlInput(''); }}
                style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddByUrl(); }}
              placeholder={activeTab === 'audio' ? 'https://... または YouTube URL' : 'https://...'}
              autoFocus
              style={inputStyle}
            />
            {activeTab === 'audio' && (
              <div style={{ fontSize: '0.7rem', color: theme.textMuted }}>
                YouTube URLにも対応しています
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setAddMode(null); setUrlInput(''); }}
                style={{
                  padding: '6px 14px', fontSize: '0.8rem',
                  background: 'transparent', color: theme.textSecondary,
                  border: `1px solid ${theme.border}`, borderRadius: 0, cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddByUrl}
                disabled={!urlInput.trim()}
                style={{
                  padding: '6px 14px', fontSize: '0.8rem',
                  background: theme.accent, color: theme.textOnAccent,
                  border: 'none', borderRadius: 0,
                  cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      );
    }

    // addMode === 'pick'
    return (
      <div style={subModalOverlay} onClick={(e) => { e.stopPropagation(); setAddMode(null); }}>
        <div style={subModalPanel} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>
              {activeTab === 'audio' ? '音声' : '画像'}を追加
            </h4>
            <button
              onClick={() => setAddMode(null)}
              style={{ background: 'none', border: 'none', color: theme.textSecondary, cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
          <button
            style={menuBtnStyle}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            {uploading ? 'アップロード中...' : 'ファイルを選択'}
          </button>
          <button style={menuBtnStyle} onClick={() => setAddMode('url')}>
            <Link size={14} />
            URLから追加
          </button>
        </div>
      </div>
    );
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

        {/* タブ */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, marginBottom: '8px' }}>
          <button style={tabStyle('image')} onClick={() => { setActiveTab('image'); setAddMode(null); }}>画像</button>
          <button style={tabStyle('audio')} onClick={() => { setActiveTab('audio'); setAddMode(null); }}>音声</button>
        </div>

        {/* 検索バー */}
        <div style={{ marginBottom: '8px' }}>
          <input
            style={inputStyle}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ファイル名・タグで検索..."
          />
        </div>

        {/* エラーバナー */}
        {error && (
          <div
            style={{
              padding: '6px 10px',
              marginBottom: '8px',
              background: theme.danger,
              color: theme.textOnAccent,
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: theme.textOnAccent, cursor: 'pointer', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={activeTab === 'audio' ? 'audio/*' : 'image/*'}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />

        {/* アセット一覧 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: theme.textMuted, padding: '24px 0' }}>
              読み込み中...
            </div>
          ) : activeTab === 'image' ? (
            /* 画像: グリッド表示 */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
              {/* ＋パネル */}
              <div
                style={{ ...addCardStyle, aspectRatio: '1', flexDirection: 'column', gap: '4px' }}
                onClick={() => setAddMode('pick')}
              >
                <Plus size={28} />
                <span style={{ fontSize: '0.75rem' }}>追加</span>
              </div>
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    border: `1px solid ${theme.border}`, borderRadius: 0,
                    overflow: 'hidden', background: 'rgba(0,0,0,0.2)',
                    cursor: onSelect ? 'pointer' : undefined,
                  }}
                  onClick={() => handleAssetClick(asset.url)}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '4px' }}>
                    <div style={{
                      fontSize: '0.75rem', color: theme.textPrimary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: '4px',
                    }}>
                      {asset.title || asset.filename}
                    </div>
                    {renderTagSection(asset)}
                    {renderDeleteSection(asset)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 音声: リスト表示 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* ＋パネル */}
              <div
                style={{ ...addCardStyle, padding: '16px', gap: '8px' }}
                onClick={() => setAddMode('pick')}
              >
                <Plus size={20} />
                <span style={{ fontSize: '0.8rem' }}>追加</span>
              </div>
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    border: `1px solid ${theme.border}`, borderRadius: 0,
                    background: 'rgba(0,0,0,0.2)', padding: '8px',
                    cursor: onSelect ? 'pointer' : undefined,
                  }}
                  onClick={() => handleAssetClick(asset.url)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    {editingTitleId === asset.id ? (
                      <input
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        onBlur={() => handleSaveTitle(asset.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(asset.id); if (e.key === 'Escape') { setEditingTitleId(null); setTitleInput(''); } }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1, minWidth: 0, padding: '2px 6px', fontSize: '0.8rem',
                          background: theme.bgInput, border: `1px solid ${theme.borderInput}`,
                          borderRadius: 0, color: theme.textPrimary, outline: 'none',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: '0.8rem', color: theme.textPrimary, flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          cursor: 'text',
                        }}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingTitleId(asset.id); setTitleInput(asset.title || asset.filename); }}
                      >
                        {asset.title || asset.filename}
                      </div>
                    )}
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    controls
                    src={asset.url}
                    style={{ width: '100%', height: '32px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
                      {renderTagSection(asset)}
                    </div>
                    <div style={{ flexShrink: 0, width: '80px' }} onClick={(e) => e.stopPropagation()}>
                      {renderDeleteSection(asset)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 追加サブモーダル */}
      {renderAddSubModal()}
    </div>
  );
}
