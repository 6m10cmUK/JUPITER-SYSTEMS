import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { theme } from '../../styles/theme';
import { Music, Square } from 'lucide-react';

export function BgmMiniPlayer() {
  const { bgms, updateBgm } = useAdrasteaContext();
  const playingCount = bgms.filter(t => t.is_playing).length;

  if (playingCount === 0) return null;

  const handleStopAll = () => {
    bgms.filter(t => t.is_playing).forEach(t => {
      updateBgm(t.id, { is_playing: false });
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Music size={14} style={{ color: theme.accent }} />
      <span style={{ color: theme.textPrimary, fontSize: '0.75rem' }}>
        {playingCount}再生中
      </span>
      <button
        onClick={handleStopAll}
        title="全停止"
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textSecondary,
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Square size={12} />
      </button>
    </div>
  );
}
