import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { BgmTrackPlayer } from './BgmTrackPlayer';

export function BgmEngine() {
  const { bgms, updateBgm, activeScene, masterVolume, bgmMuted } = useAdrasteaContext();

  const debugLog = useCallback((_msg: string) => {
    // noop: デバッグログ無効化
  }, []);

  const prevSceneIdRef = useRef<string | null>(null);
  const sceneTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [fadeStates, setFadeStates] = useState<Map<string, 'none' | 'in' | 'out'>>(new Map());
  const [fadeDurations, setFadeDurations] = useState<Map<string, number>>(new Map());

  const bgmsRef = useRef(bgms);
  bgmsRef.current = bgms;

  // シーン切替検知: 停止/自動再生/継続を管理
  useEffect(() => {
    sceneTimersRef.current.forEach(id => clearTimeout(id));
    sceneTimersRef.current = [];

    const currentSceneId = activeScene?.id ?? null;
    if (prevSceneIdRef.current === currentSceneId) return;
    const prevSceneId = prevSceneIdRef.current;
    prevSceneIdRef.current = currentSceneId;

    if (!currentSceneId) return;

    const currentBgms = bgmsRef.current;

    if (prevSceneId) {
      // === シーン切替 ===
      const newFadeStates = new Map<string, 'none' | 'in' | 'out'>();

      const tracksToStop = currentBgms.filter(
        t => t.is_playing && t.scene_ids.includes(prevSceneId) && !t.scene_ids.includes(currentSceneId)
      );

      const tracksToStart = currentBgms.filter(
        t => !t.is_playing && t.auto_play_scene_ids.includes(currentSceneId)
      );

      const maxFadeInDuration = Math.max(
        ...tracksToStart.filter(t => t.fade_in).map(t => t.fade_in_duration),
        0
      );

      tracksToStop.forEach(t => {
        newFadeStates.set(t.id, maxFadeInDuration > 0 ? 'out' : 'none');
      });

      const newDurations = new Map<string, number>();
      tracksToStop.forEach(t => {
        if (maxFadeInDuration > 0) newDurations.set(t.id, maxFadeInDuration);
      });
      tracksToStart.forEach(t => {
        if (t.fade_in) newDurations.set(t.id, t.fade_in_duration);
      });
      setFadeDurations(newDurations);

      tracksToStart.forEach(t => {
        newFadeStates.set(t.id, t.fade_in ? 'in' : 'none');
      });
      setFadeStates(newFadeStates);

      tracksToStart.forEach(t => {
        updateBgm(t.id, { is_playing: true, is_paused: false });
      });

      // フェードイン完了タイマー
      const inTimer = setTimeout(() => {
        setFadeStates(prev => {
          const next = new Map(prev);
          tracksToStart.forEach(t => next.delete(t.id));
          return next;
        });
        setFadeDurations(prev => {
          const next = new Map(prev);
          tracksToStart.forEach(t => next.delete(t.id));
          return next;
        });
      }, maxFadeInDuration + 100);
      sceneTimersRef.current.push(inTimer);

      // フェードアウト完了タイマー
      const outTimer = setTimeout(() => {
        tracksToStop.forEach(t => {
          updateBgm(t.id, { is_playing: false, is_paused: false });
        });
        setFadeDurations(prev => {
          const next = new Map(prev);
          tracksToStop.forEach(t => next.delete(t.id));
          return next;
        });
      }, maxFadeInDuration + 100);
      sceneTimersRef.current.push(outTimer);
    } else {
      // === 初回シーン読み込み ===
      const tracksToStart = currentBgms.filter(
        t => !t.is_playing && t.auto_play_scene_ids.includes(currentSceneId)
      );

      tracksToStart.forEach(t => {
        updateBgm(t.id, { is_playing: true, is_paused: false });
      });

      const newFadeStates = new Map<string, 'none' | 'in' | 'out'>();
      const newDurations = new Map<string, number>();
      tracksToStart.forEach(t => {
        newFadeStates.set(t.id, t.fade_in ? 'in' : 'none');
        if (t.fade_in) newDurations.set(t.id, t.fade_in_duration);
      });
      setFadeStates(newFadeStates);
      setFadeDurations(newDurations);

      const maxInDuration = Math.max(
        ...tracksToStart.filter(t => t.fade_in).map(t => t.fade_in_duration),
        0
      );
      const initTimer = setTimeout(() => {
        setFadeStates(new Map());
        setFadeDurations(new Map());
      }, maxInDuration + 100);
      sceneTimersRef.current.push(initTimer);
    }

    return () => {
      sceneTimersRef.current.forEach(id => clearTimeout(id));
      sceneTimersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id]);

  // 孤立トラック自動停止
  useEffect(() => {
    bgmsRef.current.forEach(t => {
      if (t.scene_ids.length === 0 && t.is_playing) {
        updateBgm(t.id, { is_playing: false, is_paused: false });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id]);

  const handleTrackEnded = useCallback((trackId: string) => {
    updateBgm(trackId, { is_playing: false, is_paused: false });
  }, [updateBgm]);

  const playingTracks = bgms.filter(t => t.is_playing);

  return (
    <>
      {playingTracks.map(track => (
        <BgmTrackPlayer
          key={track.id}
          track={track}
          fadeState={fadeStates.get(track.id) ?? 'none'}
          fadeDuration={fadeDurations.get(track.id) ?? 0}
          masterVolume={bgmMuted ? 0 : masterVolume}
          onEnded={handleTrackEnded}
          debugLog={debugLog}
        />
      ))}
    </>
  );
}
