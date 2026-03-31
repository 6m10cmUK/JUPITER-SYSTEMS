import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../styles/theme';

type TabType = 'users' | 'rooms' | 'assets';

interface AdminUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminRoom {
  id: string;
  name: string;
  owner_id: string;
  description: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
}

interface RoomMember {
  room_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users: { display_name: string | null; avatar_url: string | null };
}

interface AssetItem {
  id: string;
  title: string;
  ownerId: string;
  size: number;
  type: string;
  createdAt: number;
}

export default function AdrasteaAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, token } = useAuth();
  const workerUrl = import.meta.env.VITE_R2_WORKER_URL || '';

  const adminFetch = async (path: string, options?: RequestInit) => {
    const res = await fetch(`${workerUrl}/api/admin${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  // admin 判定とデータ初期読み込み
  useEffect(() => {
    async function checkAdminAndLoad() {
      if (!user || !token) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // admin 判定 兼 ルーム一覧取得
        const roomsData = await adminFetch('/rooms');
        setIsAdmin(true);
        setRooms(Array.isArray(roomsData) ? roomsData : []);

        // ユーザー一覧を読み込む
        const usersData = await adminFetch('/users');
        setUsers(Array.isArray(usersData) ? usersData : []);

        // アセット一覧を読み込む
        const assetsData = await adminFetch('/assets');
        setAssets(Array.isArray(assetsData) ? assetsData : []);

        setError(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Failed to load admin data';
        if (errMsg.includes('HTTP 403')) {
          setIsAdmin(false);
        } else {
          setError(errMsg);
          setIsAdmin(true); // admin だがエラーが発生
        }
      } finally {
        setLoading(false);
      }
    }

    checkAdminAndLoad();
  }, [user, token, workerUrl]);

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
        {(['users', 'rooms', 'assets'] as const).map((tab) => (
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
            {tab === 'users' ? 'ユーザー' : tab === 'rooms' ? 'ルーム' : 'アセット'}
          </button>
        ))}
      </div>

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            padding: '12px 20px',
            background: theme.dangerBgSubtle,
            color: theme.danger,
            borderBottom: `1px solid ${theme.border}`,
            fontSize: '0.875rem',
          }}
        >
          エラー: {error}
        </div>
      )}

      {/* コンテンツ */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ color: theme.textSecondary }}>読み込み中...</div>
        ) : (
          <>
            {activeTab === 'users' && <UsersTab users={users} adminFetch={adminFetch} setUsers={setUsers} />}
            {activeTab === 'rooms' && <RoomsTab rooms={rooms} adminFetch={adminFetch} setRooms={setRooms} />}
            {activeTab === 'assets' && <AssetsTab assets={assets} adminFetch={adminFetch} setAssets={setAssets} />}
          </>
        )}
      </div>
    </div>
  );
}

function UsersTab({
  users,
  adminFetch,
  setUsers,
}: {
  users: AdminUser[];
  adminFetch: (path: string, options?: RequestInit) => Promise<any>;
  setUsers: (users: AdminUser[]) => void;
}) {
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('このユーザーを削除しますか？')) {
      return;
    }
    try {
      await adminFetch(`/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>
        ユーザー一覧 ({users.length})
      </h2>

      {users.length === 0 ? (
        <div style={{ color: theme.textSecondary }}>ユーザーがありません</div>
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
                  表示名
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  ID
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: theme.textSecondary,
                  }}
                >
                  アバター
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}
                >
                  <td style={{ padding: '12px' }}>{user.display_name || 'N/A'}</td>
                  <td style={{ padding: '12px', color: theme.textSecondary, fontSize: '0.8rem' }}>
                    <span title={user.id}>{user.id.slice(0, 8)}...</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="avatar"
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td style={{ padding: '12px', color: theme.textSecondary }}>
                    {new Date(user.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <button
                      onClick={() => handleDeleteUser(user.id)}
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

function RoomsTab({
  rooms,
  adminFetch,
  setRooms,
}: {
  rooms: AdminRoom[];
  adminFetch: (path: string, options?: RequestInit) => Promise<any>;
  setRooms: (rooms: AdminRoom[]) => void;
}) {
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [membersCache, setMembersCache] = useState<Record<string, RoomMember[]>>({});
  const [membersLoading, setMembersLoading] = useState<string | null>(null);

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('このルームを削除しますか？関連するすべてのデータが削除されます。')) {
      return;
    }
    try {
      await adminFetch(`/rooms/${roomId}`, { method: 'DELETE' });
      setRooms(rooms.filter((r) => r.id !== roomId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  const handleExpandRoom = async (roomId: string) => {
    if (expandedRoomId === roomId) {
      setExpandedRoomId(null);
      return;
    }

    setExpandedRoomId(roomId);

    if (membersCache[roomId]) return;

    setMembersLoading(roomId);
    try {
      const members = await adminFetch(`/rooms/${roomId}/members`);
      setMembersCache((prev) => ({ ...prev, [roomId]: Array.isArray(members) ? members : [] }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setMembersLoading(null);
    }
  };

  const handleRoleChange = async (roomId: string, userId: string, newRole: string) => {
    try {
      await adminFetch(`/rooms/${roomId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      setMembersCache((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)),
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update member role');
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>
        ルーム一覧 ({rooms.length})
      </h2>

      {rooms.length === 0 ? (
        <div style={{ color: theme.textSecondary }}>ルームがありません</div>
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
                  アーカイブ
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
              {rooms.map((room) => (
                <React.Fragment key={room.id}>
                  <tr
                    onClick={() => handleExpandRoom(room.id)}
                    style={{
                      borderBottom: `1px solid ${theme.borderSubtle}`,
                      cursor: 'pointer',
                      background: expandedRoomId === room.id ? theme.bgInput : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px' }}>{room.name}</td>
                    <td style={{ padding: '12px', color: theme.textSecondary, fontSize: '0.8rem' }}>
                      <span title={room.owner_id}>{room.owner_id.slice(0, 8)}...</span>
                    </td>
                    <td style={{ padding: '12px', color: theme.textSecondary }}>
                      {room.archived ? 'はい' : 'いいえ'}
                    </td>
                    <td style={{ padding: '12px', color: theme.textSecondary }}>
                      {new Date(room.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
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

                  {expandedRoomId === room.id && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <div
                          style={{
                            background: theme.bgInput,
                            padding: '12px 12px 12px 40px',
                            borderBottom: `1px solid ${theme.borderSubtle}`,
                          }}
                        >
                          {membersLoading === room.id ? (
                            <div style={{ color: theme.textSecondary }}>メンバー読み込み中...</div>
                          ) : (membersCache[room.id] || []).length === 0 ? (
                            <div style={{ color: theme.textSecondary }}>メンバーがいません</div>
                          ) : (
                            <table
                              style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.85rem',
                              }}
                            >
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}>
                                  <th style={{ padding: '8px', textAlign: 'left', color: theme.textSecondary }}>
                                    表示名
                                  </th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: theme.textSecondary }}>
                                    ユーザーID
                                  </th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: theme.textSecondary }}>
                                    ロール
                                  </th>
                                  <th style={{ padding: '8px', textAlign: 'left', color: theme.textSecondary }}>
                                    参加日時
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(membersCache[room.id] || []).map((member) => (
                                  <tr
                                    key={member.user_id}
                                    style={{ borderBottom: `1px solid ${theme.borderSubtle}` }}
                                  >
                                    <td style={{ padding: '8px', color: theme.textPrimary }}>
                                      {member.users?.display_name || 'N/A'}
                                    </td>
                                    <td style={{ padding: '8px', color: theme.textSecondary, fontSize: '0.75rem' }}>
                                      <span title={member.user_id}>{member.user_id.slice(0, 8)}...</span>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <select
                                        value={member.role}
                                        onChange={(e) =>
                                          handleRoleChange(room.id, member.user_id, e.target.value)
                                        }
                                        style={{
                                          background: theme.bgInput,
                                          color: theme.textPrimary,
                                          border: `1px solid ${theme.borderInput}`,
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.85rem',
                                        }}
                                      >
                                        <option value="owner">owner</option>
                                        <option value="sub_owner">sub_owner</option>
                                        <option value="user">user</option>
                                        <option value="guest">guest</option>
                                      </select>
                                    </td>
                                    <td style={{ padding: '8px', color: theme.textSecondary }}>
                                      {new Date(member.joined_at).toLocaleString('ja-JP')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
  adminFetch,
  setAssets,
}: {
  assets: AssetItem[];
  adminFetch: (path: string, options?: RequestInit) => Promise<any>;
  setAssets: (assets: AssetItem[]) => void;
}) {
  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm('このアセットを削除しますか？')) {
      return;
    }
    try {
      await adminFetch(`/assets/${assetId}`, { method: 'DELETE' });
      setAssets(assets.filter((a) => a.id !== assetId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>
        アセット一覧 ({assets.length})
      </h2>

      {assets.length === 0 ? (
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
                    <span title={asset.ownerId}>{asset.ownerId.slice(0, 8)}...</span>
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
                      onClick={() => handleDeleteAsset(asset.id)}
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
