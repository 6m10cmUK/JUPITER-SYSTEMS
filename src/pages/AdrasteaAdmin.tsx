import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthToken } from '@convex-dev/auth/react';
import { theme } from '../styles/theme';

type TabType = 'rooms' | 'assets';

interface AssetItem {
  id: string;
  title: string;
  ownerId: string;
  size: number;
  type: string;
  createdAt: number;
}

export default function AdrasteaAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('rooms');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const rooms = useQuery(api.admin.listAllRooms);
  const deleteRoomMutation = useMutation(api.admin.deleteRoom);
  const token = useAuthToken();

  const workerUrl = import.meta.env.VITE_R2_WORKER_URL || '';

  // アセット一覧を取得
  useEffect(() => {
    if (activeTab !== 'assets' || !token) return;

    async function fetchAssets() {
      setAssetsLoading(true);
      setAssetsError(null);
      try {
        const res = await fetch(`${workerUrl}/api/admin/assets`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        setAssetsError(err instanceof Error ? err.message : 'Failed to fetch assets');
        setAssets([]);
      } finally {
        setAssetsLoading(false);
      }
    }

    fetchAssets();
  }, [activeTab, token, workerUrl]);

  // ルーム削除
  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('このルームを削除しますか？関連するすべてのデータが削除されます。')) {
      return;
    }
    try {
      await deleteRoomMutation({ roomId });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  // アセット削除
  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm('このアセットを削除しますか？')) {
      return;
    }
    try {
      const res = await fetch(`${workerUrl}/api/admin/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  };

  // アクセス権チェック
  if (isAdmin === false) {
    return (
      <div
        className="adrastea-root"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.bgBase,
          color: theme.textPrimary,
          fontSize: '1rem',
        }}
      >
        アクセス権がありません
      </div>
    );
  }

  // 読み込み中
  if (isAdmin === undefined) {
    return (
      <div
        className="adrastea-root"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.bgBase,
          color: theme.textPrimary,
          fontSize: '1rem',
        }}
      >
        読み込み中...
      </div>
    );
  }

  return (
    <div
      className="adrastea-root"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bgBase,
        color: theme.textPrimary,
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '16px 20px',
          background: theme.bgToolbar,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>管理者パネル</h1>
        <a
          href="/adrastea"
          style={{
            padding: '8px 16px',
            background: theme.accent,
            color: theme.textOnAccent,
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          戻る
        </a>
      </div>

      {/* タブ */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.border}`,
          padding: '0 20px',
          background: theme.bgSurface,
        }}
      >
        {(['rooms', 'assets'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: activeTab === tab ? theme.accent : theme.textSecondary,
              borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 500,
              transition: 'color 0.2s ease',
            }}
          >
            {tab === 'rooms' ? 'ルーム' : 'アセット'}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'rooms' && (
          <RoomsTab rooms={rooms} onDelete={handleDeleteRoom} />
        )}
        {activeTab === 'assets' && (
          <AssetsTab
            assets={assets}
            loading={assetsLoading}
            error={assetsError}
            onDelete={handleDeleteAsset}
          />
        )}
      </div>
    </div>
  );
}

function RoomsTab({
  rooms,
  onDelete,
}: {
  rooms: any[] | undefined;
  onDelete: (roomId: string) => void;
}) {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>
        ルーム一覧 {rooms && `(${rooms.length})`}
      </h2>

      {!rooms ? (
        <div style={{ color: 'var(--ad-text-secondary)' }}>読み込み中...</div>
      ) : rooms.length === 0 ? (
        <div style={{ color: 'var(--ad-text-secondary)' }}>ルームがありません</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  ルーム名
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  オーナー
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  作成日時
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room: any) => (
                <tr
                  key={room._id}
                  style={{
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}
                >
                  <td style={{ padding: '12px' }}>{room.name}</td>
                  <td style={{ padding: '12px', color: theme.textSecondary }}>
                    {room.ownerInfo?.name || room.owner_id}
                  </td>
                  <td style={{ padding: '12px', color: theme.textSecondary }}>
                    {new Date(room._creationTime).toLocaleString('ja-JP')}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <button
                      onClick={() => onDelete(room.id)}
                      style={{
                        padding: '6px 12px',
                        background: theme.danger,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AssetsTab({
  assets,
  loading,
  error,
  onDelete,
}: {
  assets: AssetItem[];
  loading: boolean;
  error: string | null;
  onDelete: (assetId: string) => void;
}) {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>
        アセット一覧 {!loading && `(${assets.length})`}
      </h2>

      {error && (
        <div
          style={{
            padding: '12px',
            background: theme.dangerBgSubtle,
            color: theme.danger,
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          エラー: {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: theme.textSecondary }}>読み込み中...</div>
      ) : assets.length === 0 ? (
        <div style={{ color: theme.textSecondary }}>アセットがありません</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  タイトル
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  オーナーID
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  サイズ
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  種別
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  作成日時
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  style={{
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}
                >
                  <td style={{ padding: '12px' }}>{asset.title}</td>
                  <td style={{ padding: '12px', color: theme.textSecondary, fontSize: '0.8rem' }}>
                    {asset.ownerId}
                  </td>
                  <td style={{ padding: '12px', color: theme.textSecondary }}>
                    {(asset.size / 1024).toFixed(1)} KB
                  </td>
                  <td style={{ padding: '12px', color: theme.textSecondary }}>
                    {asset.type}
                  </td>
                  <td style={{ padding: '12px', color: theme.textSecondary }}>
                    {new Date(asset.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <button
                      onClick={() => onDelete(asset.id)}
                      style={{
                        padding: '6px 12px',
                        background: theme.danger,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
