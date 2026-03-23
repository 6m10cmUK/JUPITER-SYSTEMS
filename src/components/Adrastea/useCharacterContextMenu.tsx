import { useState, useCallback } from 'react';
import type React from 'react';
import type { DropdownMenuEntry } from './ui/DropdownMenu';
import { shortcutLabel } from './ui/DropdownMenu';
import type { Character } from '../../types/adrastea.types';
import { usePermission } from '../../hooks/usePermission';
import { hasRole } from '../../config/permissions';
import { characterToClipboardJson } from '../../utils/clipboardImport';
import { ConfirmModal } from './ui';

interface UseCharacterContextMenuOptions {
  currentUserId: string;
  onClose: () => void;
  onDuplicate?: (char: Character) => void;
  onRemove?: (charId: string) => void;
  onPaste?: () => void;
}

interface UseCharacterContextMenuResult {
  items: DropdownMenuEntry[];
  confirmModal: React.ReactNode;
}

/**
 * キャラクター右クリックメニューのロジック。
 * 複製・削除・コピー・貼り付けを権限チェック付きで提供する。
 */
export function useCharacterContextMenu(
  char: Character | null,
  { currentUserId, onClose, onDuplicate, onRemove, onPaste }: UseCharacterContextMenuOptions
): UseCharacterContextMenuResult {
  const { can, roomRole } = usePermission();
  const [pendingRemove, setPendingRemove] = useState(false);

  const canEditChar = can('character_edit');
  const isMyChar = char?.owner_id === currentUserId;
  const isSubOwnerPlus = hasRole(roomRole, 'sub_owner');
  // 自分のキャラクター、または sub_owner 以上なら操作可能
  const canModify = canEditChar && (isMyChar || isSubOwnerPlus);

  const items: DropdownMenuEntry[] = [];

  // コピー（常に有効、char が存在すれば）
  items.push({
    label: 'コピー',
    shortcut: shortcutLabel('C'),
    disabled: !char,
    onClick: () => {
      if (char) navigator.clipboard.writeText(characterToClipboardJson(char));
      onClose();
    },
  });

  // 複製
  items.push({
    label: '複製',
    disabled: !char || !canModify,
    onClick: () => {
      if (char && onDuplicate) onDuplicate(char);
      onClose();
    },
  });

  // 削除
  items.push({
    label: '削除',
    danger: true,
    disabled: !char || !canModify,
    onClick: () => {
      setPendingRemove(true);
      onClose();
    },
  });

  items.push('separator');

  // 貼り付け
  items.push({
    label: '貼り付け',
    shortcut: shortcutLabel('V'),
    disabled: !onPaste || !canEditChar,
    onClick: () => {
      onPaste?.();
      onClose();
    },
  });

  const handleConfirmRemove = useCallback(() => {
    if (char) {
      onRemove?.(char.id);
    }
    setPendingRemove(false);
  }, [char, onRemove]);

  const confirmModal = pendingRemove && char ? (
    <ConfirmModal
      message={`キャラクター「${char.name}」を削除しますか？`}
      confirmLabel="削除"
      danger
      onConfirm={handleConfirmRemove}
      onCancel={() => setPendingRemove(false)}
    />
  ) : null;

  return { items, confirmModal };
}
