import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Film, Play, X, ArrowLeft, Image as ImageIcon, File, Download } from 'lucide-react';
import { fetchDirectory, resolveThumbnails, isVideo, isImage, proxyUrl, type MediaItem, LIBRARIES } from '../api/mediaApi';
import ActiveVideoPlayer from '../play/ActiveVideoPlayer';

interface CardData {
  item: MediaItem;
  thumbs: string[];
  videoItem: MediaItem | null;
}

const Library: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const currentPath = location.state?.path || queryParams.get('path');

  const [items, setItems] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<CardData | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPath) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setItems([]);

    fetchDirectory(currentPath)
      .then(async (fetchedItems) => {
        if (cancelled) return;
        
        const initial: CardData[] = fetchedItems.map(item => ({
          item,
          thumbs: [],
          videoItem: null
        }));
        setItems(initial);
        setLoading(false);

        // Load thumbnails staggeringly
        fetchedItems.forEach(async (item, i) => {
          const delay = i < 12 ? 0 : (i - 11) * 80;
          await new Promise(r => setTimeout(r, delay));
          if (cancelled) return;

          const thumbs = await resolveThumbnails(item).catch(() => []);
          
          let videoItem: MediaItem | null = null;
          if (isVideo(item)) {
            videoItem = item;
          } else if (item.isFolder) {
            // Peek inside the folder to find a playable video
            try {
              const folderUrl = new URL(item.href);
              const children = await fetchDirectory(folderUrl.pathname);
              videoItem = children.find(isVideo) ?? null;
            } catch { /* ignore */ }
          }

          if (!cancelled) {
            setItems(prev => prev.map(c => c.item.href === item.href ? { ...c, thumbs, videoItem } : c));
          }
        });
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentPath]);

  if (!currentPath) {
    return (
      <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>
        <h2>No library path selected.</h2>
        <button onClick={() => navigate('/explore')} style={{ padding: '10px 16px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}>
          Go to Explore
        </button>
      </div>
    );
  }

  // Find library info for accent color
  const libInfo = LIBRARIES.find(l => currentPath.startsWith(l.path)) || { label: 'Library', accentColor: '#6366f1' };
  
  // Format the title from the path
  const pathParts = currentPath.split('/').filter(Boolean);
  const folderName = pathParts.length > 0 ? decodeURIComponent(pathParts[pathParts.length - 1]) : 'Root';

  const handleGoBack = () => {
    const isTopLevel = LIBRARIES.some(l => l.path === currentPath);
    if (isTopLevel) {
      navigate('/explore');
      return;
    }
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const parentPath = '/' + parts.join('/') + '/';
    navigate('/library', { state: { path: parentPath } });
  };

  const handleCardClick = (card: CardData) => {
    if (card.item.isFolder) {
      const url = new URL(card.item.href);
      navigate('/library', { state: { path: url.pathname } });
    } else if (card.videoItem) {
      setPlaying(card);
    }
  };

  return (
    <div className="library-page" style={{ padding: '32px', paddingBottom: '120px', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <button 
          onClick={handleGoBack}
          style={{ 
            background: 'var(--surface-color)', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', 
            padding: '12px', 
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {folderName}
          </h1>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '16/9', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', opacity: 0.5, animation: 'pulse 1.5s infinite ease-in-out' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px 0', color: 'var(--text-secondary)', textAlign: 'center', background: 'var(--surface-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
          <Folder size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>This folder is empty</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
          {items.map((card, i) => (
            <motion.div
              key={card.item.href}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.3 }}
              onHoverStart={() => setHovered(card.item.href)}
              onHoverEnd={() => setHovered(null)}
              onClick={() => handleCardClick(card)}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                position: 'relative'
              }}
            >
              {/* Thumbnail Container */}
              <div style={{ aspectRatio: '16/9', background: '#111', position: 'relative', overflow: 'hidden' }}>
                {card.thumbs.length > 0 ? (
                  <img 
                    src={card.thumbs[0]} 
                    alt={card.item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                    {card.item.isFolder ? <Folder size={48} /> : card.videoItem ? <Film size={48} /> : isImage(card.item) ? <ImageIcon size={48} /> : <File size={48} />}
                  </div>
                )}
                
                {/* Play button overlay */}
                <AnimatePresence>
                  {hovered === card.item.href && card.videoItem && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ background: libInfo.accentColor, borderRadius: '50%', padding: '12px' }}>
                        <Play size={24} fill="white" color="white" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Card Footer */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={card.item.title}>
                  {card.item.title}
                </p>
                {card.item.date && (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {card.item.date.split(' ')[0]}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Inline sticky video player — slides up from the bottom */}
      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0,
              top: 0,
              left: '240px',   /* clear the side nav */
              right: 0,
              zIndex: 200,
              background: 'rgba(10, 12, 20, 0.97)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Player header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {playing.item.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={proxyUrl((playing.videoItem ?? playing.item).href)}
                  download={playing.item.title}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--accent-color)', border: 'none', color: '#fff',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: 600, textDecoration: 'none', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)', fontSize: '14px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Download size={16} /> Download
                </a>
                <button
                  onClick={() => setPlaying(null)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            {/* Player body */}
            <div style={{ width: '100%', flex: 1, padding: '24px', boxSizing: 'border-box' }}>
              <ActiveVideoPlayer
                url={proxyUrl((playing.videoItem ?? playing.item).href)}
                poster={playing.thumbs[0]}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;

