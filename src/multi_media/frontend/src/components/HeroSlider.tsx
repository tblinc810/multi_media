/**
 * HeroSlider.tsx
 * Full-width hero banner that loads real featured items from the media servers.
 * Auto-cycles every 6 s; clicking "Play" opens the video modal.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchDirectory, resolveThumbnails, isVideo, type MediaItem } from '../api/mediaApi';

interface HeroSlide {
  title: string;
  poster: string | null;
  videoItem: MediaItem | null;
  path: string;
}

// Paths to load featured items from (top dirs across servers)
const HERO_SOURCES = [
  '/DHAKA-FLIX-7/English%20Movies/%282024%29/',
  '/DHAKA-FLIX-14/English%20Movies%20%281080p%29/',
  '/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/',
];

const MAX_SLIDES = 8;

async function buildSlides(): Promise<HeroSlide[]> {
  const slides: HeroSlide[] = [];

  for (const sourcePath of HERO_SOURCES) {
    if (slides.length >= MAX_SLIDES) break;
    try {
      const folders = (await fetchDirectory(sourcePath))
        .filter(i => i.isFolder)
        .slice(0, 5);

      for (const folder of folders) {
        if (slides.length >= MAX_SLIDES) break;
        try {
          const folderUrl = new URL(folder.href);
          const children = await fetchDirectory(folderUrl.pathname);
          const videoItem = children.find(isVideo) ?? null;
          const thumbs = await resolveThumbnails(folder);

          slides.push({
            title: folder.title,
            poster: thumbs[0] ?? null,
            videoItem,
            path: folderUrl.pathname,
          });
        } catch { /* skip this folder */ }
      }
    } catch { /* skip this source */ }
  }

  return slides;
}

// ─────────────────────────────────────────────────────────────────────────────

const HeroSlider: React.FC = () => {
  const navigate  = useNavigate();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buildSlides()
      .then(setSlides)
      .finally(() => setLoading(false));
  }, []);

  const go = useCallback((next: number, dir: number) => {
    setDirection(dir);
    setCurrent(_ => (next + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance
  useEffect(() => {
    if (slides.length === 0) return;
    const t = setTimeout(() => go(current + 1, 1), 6000);
    return () => clearTimeout(t);
  }, [current, slides.length, go]);

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit:  (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  if (loading) {
    return (
      <div className="hero-slider hero-slider--loading">
        <div className="hero-skeleton-bg" />
        <div className="hero-content">
          <div className="hero-skeleton-tag" />
          <div className="hero-skeleton-title" />
          <div className="hero-skeleton-desc" />
          <div className="hero-skeleton-btn" />
        </div>
      </div>
    );
  }

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <>
      <div className="hero-slider">
        {/* Background image */}
        <AnimatePresence initial={false}>
          <motion.div
            key={current + '-bg'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="hero-bg"
            style={{
              backgroundImage: slide.poster ? `url(${slide.poster})` : undefined,
              background: slide.poster ? undefined : 'radial-gradient(circle at 60% 30%, #1e1b4b, #0a0d18)',
            }}
          />
        </AnimatePresence>

        <div className="hero-overlay" />

        {/* Slide content */}
        <div className="hero-content">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <span className="hero-tag" style={{ background: 'rgba(139,92,246,0.18)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.35)' }}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                Featured Stream
              </span>
              <h1 className="hero-title">{slide.title}</h1>
              <div className="hero-actions">
                <button
                  className="hero-btn-play"
                  onClick={() => slide.path && navigate('/library', { state: { path: slide.path } })}
                  disabled={!slide.path}
                  style={{ opacity: slide.path ? 1 : 0.5 }}
                >
                  <Play size={17} fill="white" />
                  Watch Now
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrows */}
        <button className="hero-arrow hero-arrow-left" onClick={() => go(current - 1, -1)} aria-label="Previous">
          <ChevronLeft size={22} />
        </button>
        <button className="hero-arrow hero-arrow-right" onClick={() => go(current + 1, 1)} aria-label="Next">
          <ChevronRight size={22} />
        </button>

        {/* Dots */}
        <div className="hero-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === current ? ' active' : ''}`}
              onClick={() => go(i, i > current ? 1 : -1)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default HeroSlider;
