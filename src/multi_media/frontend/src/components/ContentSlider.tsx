/**
 * ContentSlider.tsx
 * Horizontal-scroll card row for a single media library category.
 * Folders navigate into the library; thumbnails auto-cycle as a slider.
 */
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Folder, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchDirectory,
  resolveThumbnails,
  isVideo,
  type MediaItem,
} from '../api/mediaApi';

interface CardData {
  item: MediaItem;
  thumbs: string[];
  videoItem: MediaItem | null;
}

interface ContentSliderProps {
  title: string;
  path: string;
  accentColor?: string;
}

// ─── Thumbnail slider for folder cards ───────────────────────────────────────

const CardThumbnail: React.FC<{ thumbs: string[]; title: string; isFolder: boolean }> = ({ thumbs, title, isFolder }) => {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (thumbs.length <= 1) return;
    if (!hovered) return;
    const t = setInterval(() => setIdx(i => (i + 1) % thumbs.length), 1800);
    return () => clearInterval(t);
  }, [thumbs.length, hovered]);

  if (thumbs.length === 0) {
    return (
      <div className="card-thumb-fallback">
        {isFolder ? <Folder size={32} style={{ opacity: 0.5 }} /> : <Film size={32} style={{ opacity: 0.5 }} />}
      </div>
    );
  }

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setIdx(0); }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={thumbs[idx]}
          alt={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="card-img"
          loading="lazy"
        />
      </AnimatePresence>
      {/* Thumbnail dots indicator */}
      {thumbs.length > 1 && hovered && (
        <div style={{
          position: 'absolute',
          bottom: '6px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          zIndex: 5,
        }}>
          {thumbs.slice(0, 6).map((_, i) => (
            <div
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{
                width: i === idx ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === idx ? 'white' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main slider ──────────────────────────────────────────────────────────────

const ContentSlider: React.FC<ContentSliderProps> = ({
  title,
  path,
  accentColor = 'var(--accent-color)',
}) => {
  const trackRef  = useRef<HTMLDivElement>(null);
  const navigate  = useNavigate();
  const [cards,   setCards]   = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCards([]);

    fetchDirectory(path)
      .then(async items => {
        if (cancelled) return;

        const topItems = items.slice(0, 20);
        const initial: CardData[] = topItems.map(item => ({
          item,
          thumbs: [],
          videoItem: null,
        }));
        if (!cancelled) setCards(initial);
        setLoading(false);

        topItems.forEach(async (item, i) => {
          const delay = i < 6 ? 0 : (i - 5) * 80;
          await new Promise(r => setTimeout(r, delay));
          if (cancelled) return;

          const thumbs = await resolveThumbnails(item).catch(() => [] as string[]);

          let videoItem: MediaItem | null = null;
          if (item.isFolder) {
            try {
              const folderUrl = new URL(item.href);
              const children  = await fetchDirectory(folderUrl.pathname);
              videoItem       = children.find(isVideo) ?? null;
            } catch { /* ignore */ }
          } else if (isVideo(item)) {
            videoItem = item;
          }

          if (!cancelled) {
            setCards(prev =>
              prev.map(c =>
                c.item.href === item.href ? { ...c, thumbs, videoItem } : c
              )
            );
          }
        });
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [path]);

  const scroll = (dir: 'left' | 'right') => {
    trackRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  };

  const handleCardClick = (card: CardData) => {
    if (card.item.isFolder) {
      const url = new URL(card.item.href);
      navigate('/library', { state: { path: url.pathname } });
    } else if (isVideo(card.item)) {
      // Navigate to parent folder in library
      const url = new URL(card.item.href);
      const parts = url.pathname.split('/').filter(Boolean);
      parts.pop();
      const parentPath = '/' + parts.join('/') + '/';
      navigate('/library', { state: { path: parentPath } });
    }
  };

  return (
    <section className="content-slider-section">
      {/* Header */}
      <div className="slider-header">
        <div className="slider-header-left">
          <span className="slider-accent-bar" style={{ background: accentColor }} />
          <h2 className="slider-title">{title}</h2>
        </div>
        <div className="slider-controls">
          <button className="slider-arrow-btn" onClick={() => scroll('left')}  aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button className="slider-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Cards track */}
      {loading ? (
        <div className="slider-track">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="slider-card">
              <div className="card-thumb card-skeleton" style={{ height: 240 }} />
              <div className="card-footer">
                <div className="skeleton-line" style={{ width: '75%' }} />
                <div className="skeleton-line" style={{ width: '45%', marginTop: 5 }} />
              </div>
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '8px 0' }}>Nothing found.</p>
      ) : (
        <div className="slider-track" ref={trackRef}>
          {cards.map(card => (
            <motion.div
              key={card.item.href}
              className="slider-card"
              onHoverStart={() => setHovered(card.item.href)}
              onHoverEnd={()   => setHovered(null)}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              transition={{ duration: 0.22 }}
              onClick={() => handleCardClick(card)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-thumb">
                <CardThumbnail
                  thumbs={card.thumbs}
                  title={card.item.title}
                  isFolder={card.item.isFolder}
                />

                {/* Bottom title label on hover */}
                <span className="card-thumb-label">{card.item.title}</span>

                {/* Hover overlay with play button */}
                <AnimatePresence>
                  {hovered === card.item.href && (
                    <motion.div
                      className="card-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div
                        className="card-play-btn"
                        style={{ background: accentColor }}
                      >
                        <Play size={22} fill="white" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="card-footer">
                <p className="card-title" title={card.item.title}>{card.item.title}</p>
                {card.item.date && (
                  <p className="card-meta">{card.item.date.split(' ')[0]}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ContentSlider;
