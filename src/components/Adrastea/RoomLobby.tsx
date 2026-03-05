import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { theme } from '../../styles/theme';

interface RoomLobbyProps {
  onRoomCreated: (roomId: string) => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ onRoomCreated }) => {
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    const name = roomName.trim();
    if (!name) return;

    setIsCreating(true);
    try {
      // ルーム作成
      const roomRef = await addDoc(collection(db, 'rooms'), {
        name,
        active_scene_id: null,
        dice_system: 'DiceBot',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // デフォルトシーン作成
      const sceneRef = await addDoc(collection(db, 'rooms', roomRef.id, 'scenes'), {
        name: 'メインシーン',
        background_url: null,
        foreground_url: null,
        foreground_opacity: 0.5,
        bgm_type: null,
        bgm_source: null,
        bgm_volume: 0.5,
        bgm_loop: true,
        sort_order: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // デフォルトシーンに背景オブジェクト（濃いグレー）
      await addDoc(collection(db, 'rooms', roomRef.id, 'scenes', sceneRef.id, 'objects'), {
        type: 'background',
        name: '背景',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        visible: true,
        opacity: 1,
        sort_order: 0,
        locked: true,
        image_url: null,
        background_color: '#333333',
        image_fit: 'cover',
        text_content: null,
        font_size: 16,
        text_color: '#ffffff',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // デフォルトシーンに前景オブジェクト（薄いグレー）
      await addDoc(collection(db, 'rooms', roomRef.id, 'scenes', sceneRef.id, 'objects'), {
        type: 'foreground',
        name: '前景',
        x: 26,
        y: 36,
        width: 48,
        height: 27,
        visible: true,
        opacity: 1,
        sort_order: 100,
        locked: false,
        image_url: null,
        background_color: '#666666',
        image_fit: 'cover',
        text_content: null,
        font_size: 16,
        text_color: '#ffffff',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // デフォルトシーンをアクティブに
      await updateDoc(doc(db, 'rooms', roomRef.id), {
        active_scene_id: sceneRef.id,
      });

      onRoomCreated(roomRef.id);
    } catch (error) {
      console.error('ルーム作成に失敗しました:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        background: theme.bgSurface,
        borderRadius: 0,
        padding: '24px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}>
        <h2 style={{
          color: theme.textPrimary,
          margin: '0 0 8px 0',
          fontSize: '1.2rem',
          textAlign: 'center',
        }}>
          Adrastea
        </h2>
        <p style={{
          color: theme.textMuted,
          margin: '0 0 24px 0',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}>
          TRPG盤面共有ツール
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: theme.textSecondary,
            fontSize: '0.85rem',
            marginBottom: '6px',
          }}>
            ルーム名
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            placeholder="例: 第1回セッション"
            style={{
              width: '100%',
              padding: '8px 10px',
              background: theme.bgInput,
              border: `1px solid ${theme.borderInput}`,
              borderRadius: 0,
              color: theme.textPrimary,
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={!roomName.trim() || isCreating}
          style={{
            width: '100%',
            padding: '8px',
            background: roomName.trim() && !isCreating ? theme.accent : theme.borderInput,
            color: roomName.trim() && !isCreating ? theme.textOnAccent : theme.textMuted,
            border: 'none',
            borderRadius: 0,
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: roomName.trim() && !isCreating ? 'pointer' : 'not-allowed',
          }}
        >
          {isCreating ? '作成中...' : 'ルームを作成'}
        </button>

        <p style={{
          color: theme.textMuted,
          fontSize: '0.75rem',
          textAlign: 'center',
          marginTop: '20px',
        }}>
          ルームURLを共有すれば他の参加者が直接参加できます
        </p>
      </div>
    </div>
  );
};

export default RoomLobby;
