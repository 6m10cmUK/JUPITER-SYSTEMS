import { useState } from 'react';
import type { Room } from '../../types/adrastea.types';
import { AdInput, AdButton, AdModal } from './ui';

interface RoomSettingsModalProps {
  room: Room;
  onSave: (updates: Partial<Room>) => void;
  onClose: () => void;
}

export function RoomSettingsModal({ room, onSave, onClose }: RoomSettingsModalProps) {
  const [diceSystem, setDiceSystem] = useState(room.dice_system ?? 'DiceBot');

  const handleSave = () => {
    onSave({
      dice_system: diceSystem.trim() || 'DiceBot',
    });
    onClose();
  };

  return (
    <AdModal
      title="ルーム設定"
      width="400px"
      onClose={onClose}
      footer={
        <>
          <AdButton onClick={onClose}>キャンセル</AdButton>
          <AdButton variant="primary" onClick={handleSave}>保存</AdButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <AdInput
          label="ダイスシステム"
          value={diceSystem}
          onChange={(e) => setDiceSystem(e.target.value)}
          placeholder="DiceBot"
        />
      </div>
    </AdModal>
  );
}
