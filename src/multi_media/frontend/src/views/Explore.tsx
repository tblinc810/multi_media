import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Film, Tv, Gamepad, Folder, Music, PlayCircle } from 'lucide-react';
import { LIBRARIES } from '../api/mediaApi';

// Determine an icon based on the label
const getIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('movie') || l.includes('film')) return <Film size={32} />;
  if (l.includes('tv') || l.includes('series')) return <Tv size={32} />;
  if (l.includes('game')) return <Gamepad size={32} />;
  if (l.includes('music') || l.includes('audio')) return <Music size={32} />;
  if (l.includes('animation') || l.includes('anime')) return <PlayCircle size={32} />;
  return <Folder size={32} />;
};

const Explore: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="explore-page" style={{ padding: '32px', paddingBottom: '120px', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', color: '#6366f1' }}>
          <Compass size={36} />
        </div>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Explore</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '16px' }}>Browse all media categories and libraries</p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '24px' 
      }}>
        {LIBRARIES.map((lib, i) => (
          <motion.div
            key={lib.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.4 }}
            onClick={() => navigate('/library', { state: { path: lib.path } })}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '20px',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Subtle background glow based on accent color */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: `radial-gradient(circle at 50% 0%, ${lib.accentColor}15, transparent 50%)`,
              pointerEvents: 'none',
              zIndex: 0,
              transition: 'all 0.3s ease'
            }} className="card-glow" />
            
            <div style={{ 
              color: lib.accentColor, 
              background: `${lib.accentColor}20`,
              padding: '16px',
              borderRadius: '16px',
              zIndex: 1,
              boxShadow: `0 8px 16px -4px ${lib.accentColor}40`
            }}>
              {getIcon(lib.label)}
            </div>
            <div style={{ zIndex: 1, width: '100%' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>{lib.label}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Explore;
