import { useRef, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import type { BgmTrack } from '../../types/adrastea.types';

interface BgmTrackPlayerProps {
  track: BgmTrack;
  fadeState: 'none' | 'in' | 'out';
}

export function BgmTrackPlayer({ track, fadeState }: BgmTrackPlayerProps) {
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
    const clamped = Math.max(0, Math.min(1, vol));
    if (audioRef.current) audioRef.current.volume = clamped;
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.setVolume(clamped * 100); } catch {}
    }
  }, []);

  // フェード処理
  useEffect(() => {
    clearFadeInterval();

    if (fadeState === 'none') {
      setVolume(track.bgm_volume);
      return;
    }

    const step = 0.05;
    const intervalMs = (track.fade_duration * step) / 1;
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
  }, [track.bgm_volume, fadeState, setVolume]);

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
                autoplay: 1,
                loop: track.bgm_loop ? 1 : 0,
                playlist: track.bgm_loop ? videoId : undefined,
              },
            }}
            onReady={(e) => {
              ytPlayerRef.current = e.target;
              e.target.setVolume(track.bgm_volume * 100);
            }}
          />
        </div>
      )}
      {(track.bgm_type === 'url' || track.bgm_type === 'upload') && (
        <audio
          ref={audioRef}
          src={track.bgm_source}
          autoPlay
          loop={track.bgm_loop}
          style={{ display: 'none' }}
        />
      )}
    </>
  );
}
