import React from 'react';
import { USER_CANDIDATES } from '../../types/discordObs.types';

interface Props {
  userId: string;
  setUserId: (v: string) => void;
  standImageUrl: string;
  setStandImageUrl: (v: string) => void;
  userName: string;
  setUserName: (v: string) => void;
}

export const UserSettings: React.FC<Props> = ({
  userId, setUserId, standImageUrl, setStandImageUrl, userName, setUserName,
}) => (
  <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
    <h3 style={{ margin: '0 0 15px 0' }}>👤 ユーザー設定</h3>

    <div style={{ marginBottom: '10px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ユーザーID</label>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="320897851515207681"
          style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              const selected = USER_CANDIDATES.find(u => u.id === e.target.value);
              if (selected) {
                setUserId(selected.id);
                setUserName(selected.name);
              }
            }
          }}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
        >
          <option value="">候補から選択</option>
          {USER_CANDIDATES.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </div>
    </div>

    <div style={{ marginBottom: '10px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>立ち絵画像URL</label>
      <input
        type="url"
        value={standImageUrl}
        onChange={(e) => setStandImageUrl(e.target.value)}
        placeholder="https://example.com/character.png"
        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
    </div>

    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px' }}>表示名（オプション）</label>
      <input
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="キャラクター名"
        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
      />
    </div>

    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px',
    }}>
      <img
        src={standImageUrl}
        alt={userName || userId}
        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <div>
        <div style={{ fontWeight: 'bold' }}>{userName || 'ユーザー'}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>ID: {userId}</div>
      </div>
    </div>
  </div>
);
