import { useRef, useEffect, useState, useCallback } from 'react';
import YouTube from 'react-youtube';
import { theme } from '../../styles/theme';
import type { Scene } from '../../types/adrastea.types';

interface BgmPlayerProps {
  scene: Scene | null;
}

export function BgmPlayer({ scene }: BgmPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const fadeIntervalRef = useRef<number | null>(null);

  const bgmType = scene?.bgm_type ?? null;
  const bgmSource = scene?.bgm_source ?? null;
  const bgmVolume = scene?.bgm_volume ?? 0.5;
  const bgmLoop = scene?.bgm_loop ?? true;

  // フェードアウト→フェードイン
  const fadeOut = useCallback((onComplete: () => void) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    let vol = currentVolume;
    fadeIntervalRef.current = window.setInterval(() => {
      vol -= 0.05;
      if (vol <= 0) {
        vol = 0;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        onComplete();
      }
      setCurrentVolume(vol);
      if (audioRef.current) audioRef.current.volume = Math.max(0, vol);
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.setVolume(Math.max(0, vol * 100));
        } catch {}
      }
    }, 50);
  }, [currentVolume]);

  const fadeIn = useCallback(() => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    let vol = 0;
    setCurrentVolume(0);
    fadeIntervalRef.current = window.setInterval(() => {
      vol += 0.05;
      if (vol >= bgmVolume) {
        vol = bgmVolume;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      }
      setCurrentVolume(vol);
      if (audioRef.current) audioRef.current.volume = vol;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.setVolume(vol * 100);
        } catch {}
      }
    }, 50);
  }, [bgmVolume]);

  // シーン切り替え時のフェード処理
  const prevSourceRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSourceRef.current === bgmSource) return;
    const prev = prevSourceRef.current;
    prevSourceRef.current = bgmSource;

    if (prev && bgmSource) {
      // フェードアウト→フェードイン
      fadeOut(() => {
        setIsPlaying(true);
        setTimeout(fadeIn, 100);
      });
    } else if (bgmSource) {
      setIsPlaying(true);
      fadeIn();
    } else {
      fadeOut(() => setIsPlaying(false));
    }
  }, [bgmSource, fadeOut, fadeIn]);

  // ボリューム変更
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = bgmVolume;
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(bgmVolume * 100);
      } catch {}
    }
    setCurrentVolume(bgmVolume);
  }, [bgmVolume]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  if (!bgmType || !bgmSource) return null;

  const togglePlay = () => {
    if (bgmType === 'youtube') {
      if (ytPlayerRef.current) {
        try {
          if (isPlaying) {
            ytPlayerRef.current.pauseVideo();
          } else {
            ytPlayerRef.current.playVideo();
          }
        } catch {}
      }
    } else {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* 再生/停止ボタン */}
      <button
        onClick={togglePlay}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.accent,
          fontSize: '1.2rem',
          cursor: 'pointer',
          padding: '2px 6px',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* 曲名 */}
      <span
        style={{
          color: theme.textPrimary,
          fontSize: '0.8rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '150px',
        }}
      >
        {scene?.name ?? 'BGM'}
      </span>

      {/* ボリューム */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={currentVolume}
        onChange={(e) => {
          const vol = Number(e.target.value);
          setCurrentVolume(vol);
          if (audioRef.current) audioRef.current.volume = vol;
          if (ytPlayerRef.current) {
            try {
              ytPlayerRef.current.setVolume(vol * 100);
            } catch {}
          }
        }}
        style={{ width: '80px' }}
      />

      {/* YouTube Player（非表示） */}
      {bgmType === 'youtube' && bgmSource && (
        <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          <YouTube
            videoId={bgmSource}
            opts={{
              width: '1',
              height: '1',
              playerVars: {
                autoplay: 1,
                loop: bgmLoop ? 1 : 0,
                playlist: bgmLoop ? bgmSource : undefined,
              },
            }}
            onReady={(e) => {
              ytPlayerRef.current = e.target;
              e.target.setVolume(bgmVolume * 100);
            }}
            onEnd={() => {
              if (!bgmLoop) setIsPlaying(false);
            }}
          />
        </div>
      )}

      {/* Audio Player */}
      {(bgmType === 'url' || bgmType === 'upload') && bgmSource && (
        <audio
          ref={audioRef}
          src={bgmSource}
          autoPlay
          loop={bgmLoop}
          onEnded={() => {
            if (!bgmLoop) setIsPlaying(false);
          }}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}
