import React, { useState, useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { Video, MonitorPlay } from 'lucide-react';

interface ActiveVideoPlayerProps {
  url: string;
  poster?: string;
  title?: string;
}

const VideoJSComponent: React.FC<{ src: string; isMkv: boolean; poster?: string }> = ({ src, isMkv, poster }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered', 'vjs-fill');
      videoRef.current.appendChild(videoElement);

      playerRef.current = videojs(videoElement, {
        autoplay: false,
        controls: true,
        responsive: true,
        fill: true,
        preload: 'auto',
        poster: poster,
        sources: [{
          src,
          type: isMkv ? 'video/webm' : 'video/mp4'
        }]
      });
    } else if (playerRef.current) {
      const player = playerRef.current;
      player.src({ src, type: isMkv ? 'video/webm' : 'video/mp4' });
      if (poster) {
        player.poster(poster);
      }
    }
  }, [src, isMkv, poster]);

  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        try { player.pause(); } catch {}
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return <div ref={videoRef} style={{ width: '100%', height: '100%' }} />;
};

const PlyrComponent: React.FC<{ src: string; poster?: string }> = ({ src, poster }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (videoRef.current && !playerRef.current) {
      playerRef.current = new Plyr(videoRef.current, {
        autoplay: false,
        controls: [
          'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
        ],
      });
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        className="plyr-react plyr"
        data-poster={poster}
        controls
        crossOrigin="anonymous"
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
};

const ActiveVideoPlayer: React.FC<ActiveVideoPlayerProps> = ({ url, poster }) => {
  const [engine, setEngine] = useState<'videojs' | 'plyr'>('videojs');
  const isMkv = url.toLowerCase().endsWith('.mkv');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', height: '100%' }}>
      <style>{`
        .plyr { height: 100% !important; width: 100% !important; border-radius: 10px; }
        .plyr__video-wrapper { height: 100% !important; width: 100% !important; background: #000; }
        .plyr video { height: 100% !important; width: 100% !important; object-fit: contain !important; }
        .video-js { height: 100% !important; width: 100% !important; }
      `}</style>
      {/* 2-Engine Switcher Bar */}
      <div className="player-switcher-bar" style={{ display: 'flex', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <div className="player-switcher-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Player Engine:</span>
          <button
            onClick={() => setEngine('videojs')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: engine === 'videojs' ? 'var(--accent-color)' : 'transparent',
              border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.2s'
            }}
          >
            <Video size={16} /> v1 Player
          </button>
          <button
            onClick={() => setEngine('plyr')}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: engine === 'plyr' ? 'var(--accent-color)' : 'transparent',
              border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.2s'
            }}
          >
            <MonitorPlay size={16} /> v2 Player
          </button>
        </div>
      </div>

      {/* Video Player Box */}
      <div className="video-player-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', background: '#000', flex: 1, minHeight: 0 }}>
        {engine === 'videojs' && (
          <div key={`vjs-${url}`} style={{ width: '100%', height: '100%' }}>
            <VideoJSComponent src={url} isMkv={isMkv} poster={poster} />
          </div>
        )}

        {engine === 'plyr' && (
          <div key={`plyr-${url}`} style={{ width: '100%', height: '100%' }}>
            <PlyrComponent src={url} poster={poster} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveVideoPlayer;
