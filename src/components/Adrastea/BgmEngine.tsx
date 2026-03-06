import { useState, useEffect, useRef } from 'react';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { BgmTrackPlayer } from './BgmTrackPlayer';

export function BgmEngine() {
  const { bgms, activeScene } = useAdrasteaContext();

  const prevSceneIdRef = useRef<string | null>(null);
  const [fadeStates, setFadeStates] = useState<Map<string, 'none' | 'in' | 'out'>>(new Map());

  // シーン切替検知
  useEffect(() => {
    const currentSceneId = activeScene?.id ?? null;
    if (prevSceneIdRef.current === currentSceneId) return;
    const prevSceneId = prevSceneIdRef.current;
    prevSceneIdRef.current = currentSceneId;

    if (prevSceneId && currentSceneId) {
      // シーン切替: フェードアウト → フェードイン
      const newFadeStates = new Map<string, 'none' | 'in' | 'out'>();
      bgms.filter(t => t.is_playing).forEach(t => {
        newFadeStates.set(t.id, t.fade_out ? 'out' : 'none');
      });
      setFadeStates(newFadeStates);

      const maxOutDuration = Math.max(
        ...bgms.filter(t => t.is_playing && t.fade_out).map(t => t.fade_duration),
        0
      );
      setTimeout(() => {
        setFadeStates(prev => {
          const next = new Map(prev);
          bgms.filter(t => t.is_playing).forEach(t => {
            next.set(t.id, t.fade_in ? 'in' : 'none');
          });
          return next;
        });

        const maxInDuration = Math.max(
          ...bgms.filter(t => t.is_playing && t.fade_in).map(t => t.fade_duration),
          0
        );
        setTimeout(() => {
          setFadeStates(new Map());
        }, maxInDuration + 100);
      }, maxOutDuration + 100);
    } else if (currentSceneId) {
      // 新シーン: フェードイン
      const newFadeStates = new Map<string, 'none' | 'in' | 'out'>();
      bgms.filter(t => t.is_playing).forEach(t => {
        newFadeStates.set(t.id, t.fade_in ? 'in' : 'none');
      });
      setFadeStates(newFadeStates);

      const maxInDuration = Math.max(
        ...bgms.filter(t => t.is_playing && t.fade_in).map(t => t.fade_duration),
        0
      );
      setTimeout(() => setFadeStates(new Map()), maxInDuration + 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id]);

  const playingTracks = bgms.filter(t => t.is_playing);

  return (
    <>
      {playingTracks.map(track => (
        <BgmTrackPlayer
          key={track.id}
          track={track}
          fadeState={fadeStates.get(track.id) ?? 'none'}
        />
      ))}
    </>
  );
}
