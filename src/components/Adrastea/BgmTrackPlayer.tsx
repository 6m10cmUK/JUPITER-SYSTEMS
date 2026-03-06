import { useRef, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import type { BgmTrack } from '../../types/adrastea.types';

interface BgmTrackPlayerProps {
  track: BgmTrack;
  fadeState: 'none' | 'in' | 'out';
  masterVolume: number;
}

export function BgmTrackPlayer({ track, fadeState, masterVolume }: BgmTrackPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const effective = Math.max(0, Math.min(1, vol * masterVolume));
    if (audioRef.current) audioRef.current.volume = effective;
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(effective * 100); } catch {}
    }
  }, [masterVolume]);

  // フェード処理
  useEffect(() => {
    clearFadeInterval();

    if (fadeState === 'none') {
      setVolume(track.bgm_volume);
      return;
    }

    const step = 0.05;
    // フェード全体をfade_duration msで完了するためのインターバル計算
    const totalSteps = Math.ceil(1 / step);
    const stepInterval = Math.max(10, track.fade_duration / totalSteps);

    if (fadeState === 'in') {
      let vol = 0;
      setVolume(0);
      fadeIntervalRef.current = window.setInterval(() => {
        vol += step;
        if (vol >= track.bgm_volume) {
          vol = track.bgm_volume;
          clearFadeInterval();
        }
        setVolume(vol);
      }, stepInterval);
    } else if (fadeState === 'out') {
      let vol = track.bgm_volume;
      fadeIntervalRef.current = window.setInterval(() => {
        vol -= step;
        if (vol <= 0) {
          vol = 0;
          clearFadeInterval();
        }
        setVolume(vol);
      }, stepInterval);
    }

    return clearFadeInterval;
  }, [fadeState, track.bgm_volume, track.fade_duration, setVolume, clearFadeInterval]);

  // ボリューム変更（フェード中でないとき）
  useEffect(() => {
    if (fadeState === 'none') {
      setVolume(track.bgm_volume);
    }
  }, [track.bgm_volume, masterVolume, fadeState, setVolume]);

  // YouTube ready状態を追跡（refだとuseEffectが検知できないため）
  const ytReadyRef = useRef(false);
  const pendingPauseRef = useRef<boolean | null>(null);

  // 一時停止/再開制御
  useEffect(() => {
    if (track.is_paused) {
      if (audioRef.current) audioRef.current.pause();
      if (ytPlayerRef.current && ytReadyRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      } else {
        // YTプレイヤーがまだreadyでない場合、保留
        pendingPauseRef.current = true;
      }
    } else {
      if (audioRef.current && audioRef.current.paused && audioRef.current.src) {
        audioRef.current.play().catch(() => {});
      }
      if (ytPlayerRef.current && ytReadyRef.current) {
        try { ytPlayerRef.current.playVideo(); } catch {}
      } else {
        pendingPauseRef.current = false;
      }
    }
  }, [track.is_paused]);

  // クリーンアップ
  useEffect(() => {
    return clearFadeInterval;
  }, [clearFadeInterval]);

  const extractVideoId = (source: string): string => {
    const match = source.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
    return match ? match[1] : source;
  };

  if (!track.bgm_type || !track.bgm_source) return null;

  const videoId = track.bgm_type === 'youtube' ? extractVideoId(track.bgm_source) : '';

  return (
    <>
      {track.bgm_type === 'youtube' && (
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          <YouTube
            videoId={videoId}
            opts={{
              width: '1',
              height: '1',
              playerVars: {
                autoplay: track.is_paused ? 0 : 1,
                loop: track.bgm_loop ? 1 : 0,
                playlist: track.bgm_loop ? videoId : undefined,
              },
            }}
            onReady={(e) => {
              ytPlayerRef.current = e.target;
              ytReadyRef.current = true;
              e.target.setVolume(track.bgm_volume * masterVolume * 100);
              // onReadyより前に来たpause/play指示を反映
              if (pendingPauseRef.current === true) {
                try { e.target.pauseVideo(); } catch {}
              } else if (pendingPauseRef.current === false) {
                try { e.target.playVideo(); } catch {}
              }
              pendingPauseRef.current = null;
            }}
          />
        </div>
      )}
      {(track.bgm_type === 'url' || track.bgm_type === 'upload') && (
        <audio
          ref={audioRef}
          src={track.bgm_source}
          autoPlay={!track.is_paused}
          loop={track.bgm_loop}
          style={{ display: 'none' }}
        />
      )}
    </>
  );
}
