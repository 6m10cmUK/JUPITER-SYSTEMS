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

  // シーン切替検知: 停止/自動再生/継続を管理
  useEffect(() => {
    // 前回のタイマーをすべてクリア（高速シーン切替対策）
    sceneTimersRef.current.forEach(id => clearTimeout(id));
    sceneTimersRef.current = [];

    const currentSceneId = activeScene?.id ?? null;
    if (prevSceneIdRef.current === currentSceneId) return;
    const prevSceneId = prevSceneIdRef.current;
    prevSceneIdRef.current = currentSceneId;

    if (!currentSceneId) return;

    if (prevSceneId) {
      // === シーン切替 ===
      const newFadeStates = new Map<string, 'none' | 'in' | 'out'>();

      // 旧シーンにだけ属する再生中トラック → フェードアウト→停止
      const tracksToStop = bgms.filter(
        t => t.is_playing && t.scene_ids.includes(prevSceneId) && !t.scene_ids.includes(currentSceneId)
      );
      tracksToStop.forEach(t => {
        newFadeStates.set(t.id, t.fade_out ? 'out' : 'none');
      });

      // 両シーンに属する再生中トラック → 何もしない（継続再生）

      // 新シーンの auto_play トラックで未再生のもの → フェードイン→再生
      const tracksToStart = bgms.filter(
        t => !t.is_playing && t.auto_play_scene_ids.includes(currentSceneId)
      );

      setFadeStates(newFadeStates);

      const maxOutDuration = Math.max(
        ...tracksToStop.filter(t => t.fade_out).map(t => t.fade_duration),
        0
      );

      const outTimer = setTimeout(() => {
        // フェードアウト完了 → 停止をFirestoreに書き込み
        tracksToStop.forEach(t => {
          updateBgm(t.id, { is_playing: false, is_paused: false });
        });

        // 新シーンの自動再生トラックを開始
        tracksToStart.forEach(t => {
          updateBgm(t.id, { is_playing: true, is_paused: false });
        });

        // フェードイン設定
        setFadeStates(_prev => {
          const next = new Map<string, 'none' | 'in' | 'out'>();
          // 停止トラックは 'out' を維持（is_playing=false でアンマウントされるまでボリューム戻しを防ぐ）
          tracksToStop.forEach(t => {
            if (t.fade_out) next.set(t.id, 'out');
          });
          // 開始トラックはフェードイン
          tracksToStart.forEach(t => {
            next.set(t.id, t.fade_in ? 'in' : 'none');
          });
          return next;
        });

        const maxInDuration = Math.max(
          ...tracksToStart.filter(t => t.fade_in).map(t => t.fade_duration),
          0
        );
        const inTimer = setTimeout(() => {
          // 'in' 状態のトラックだけクリア（'out' は is_playing=false → アンマウントまで維持）
          setFadeStates(prev => {
            const next = new Map(prev);
            tracksToStart.forEach(t => next.delete(t.id));
            return next;
          });
        }, maxInDuration + 100);
        sceneTimersRef.current.push(inTimer);
      }, maxOutDuration + 100);
      sceneTimersRef.current.push(outTimer);
    } else {
      // === 初回シーン読み込み: auto_play トラックをフェードイン ===
      const tracksToStart = bgms.filter(
        t => !t.is_playing && t.auto_play_scene_ids.includes(currentSceneId)
      );

      tracksToStart.forEach(t => {
        updateBgm(t.id, { is_playing: true, is_paused: false });
      });

      const newFadeStates = new Map<string, 'none' | 'in' | 'out'>();
      tracksToStart.forEach(t => {
        newFadeStates.set(t.id, t.fade_in ? 'in' : 'none');
      });
      setFadeStates(newFadeStates);

      const maxInDuration = Math.max(
        ...tracksToStart.filter(t => t.fade_in).map(t => t.fade_duration),
        0
      );
      const initTimer = setTimeout(() => setFadeStates(new Map()), maxInDuration + 100);
      sceneTimersRef.current.push(initTimer);
    }

    return () => {
      sceneTimersRef.current.forEach(id => clearTimeout(id));
      sceneTimersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id]);

  // 孤立トラック（どのシーンにも属さない）を自動停止
  // NOTE: bgms を依存配列に入れると updateBgm → setBgms → 再トリガーの無限ループになるため、
  // シーン切替時（activeScene?.id 変化時）のみチェックする
  const bgmsRef = useRef(bgms);
  bgmsRef.current = bgms;
  useEffect(() => {
    bgmsRef.current.forEach(t => {
      if (t.scene_ids.length === 0 && t.is_playing) {
        updateBgm(t.id, { is_playing: false, is_paused: false });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScene?.id]);

  const playingTracks = bgms.filter(t => t.is_playing);

  // デバッグ: 全トラックの状態をログ
  const prevBgmSnapshotRef = useRef('');
  useEffect(() => {
    const snapshot = bgms.map(t =>
      `${t.name}: type=${t.bgm_type}, source=${t.bgm_source ? '✓' : '✗'}, playing=${t.is_playing}, paused=${t.is_paused}`
    ).join('\n');
    if (snapshot !== prevBgmSnapshotRef.current) {
      prevBgmSnapshotRef.current = snapshot;
      debugLog(`--- BGM一覧 (${bgms.length}件, 再生中${playingTracks.length}件) ---\n${snapshot}`);
    }
  }, [bgms, playingTracks.length, debugLog]);

  return (
    <>
      {playingTracks.map(track => (
        <BgmTrackPlayer
          key={track.id}
          track={track}
          fadeState={fadeStates.get(track.id) ?? 'none'}
          masterVolume={bgmMuted ? 0 : masterVolume}
          debugLog={debugLog}
        />
      ))}
    </>
  );
}
