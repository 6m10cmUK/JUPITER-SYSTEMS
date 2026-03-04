import React, { useState } from 'react';
import type { Room } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

interface RoomSettingsModalProps {
  room: Room;
  onSave: (updates: Partial<Room>) => void;
  onClose: () => void;
}

export function RoomSettingsModal({ room, onSave, onClose }: RoomSettingsModalProps) {
  const [backgroundUrl, setBackgroundUrl] = useState(room.background_url ?? '');
  const [diceSystem, setDiceSystem] = useState(room.dice_system ?? 'DiceBot');


  const handleSave = () => {
    onSave({
      background_url: backgroundUrl.trim() || null,
      dice_system: diceSystem.trim() || 'DiceBot',
    });
    onClose();
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    border: `1px solid ${theme.border}`,
    borderRadius: 0,
    padding: '24px',
    width: '400px',
    color: theme.textPrimary,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: theme.bgInput,
    border: `1px solid ${theme.borderInput}`,
    borderRadius: 0,
    color: theme.textPrimary,
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: theme.textSecondary,
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>ルーム設定</h3>

        <div style={{ marginBottom: '12px' }}>
          <AssetPicker
            label="背景画像"
            currentUrl={backgroundUrl || null}
            onSelect={(url) => setBackgroundUrl(url)}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>ダイスシステム</label>
          <input style={inputStyle} value={diceSystem}
            onChange={(e) => setDiceSystem(e.target.value)}
            placeholder="DiceBot" />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', background: theme.bgInput, color: theme.textPrimary,
            border: 'none', borderRadius: 0, cursor: 'pointer',
          }}>キャンセル</button>
          <button onClick={handleSave} style={{
            padding: '8px 16px', background: theme.accent, color: theme.textOnAccent,
            border: 'none', borderRadius: 0, fontWeight: 600, cursor: 'pointer',
          }}>保存</button>
        </div>
      </div>
    </div>
  );
}
