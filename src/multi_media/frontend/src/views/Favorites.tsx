import React from 'react';
import { Star } from 'lucide-react';

const Favorites: React.FC = () => {
  return (
    <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star size={24} color="white" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Favorites</h1>
      </div>
      <div style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '64px 32px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        <Star size={48} color="var(--text-secondary)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', marginBottom: '8px' }}>No favorites yet</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Items you favorite will appear here.</p>
      </div>
    </div>
  );
};

export default Favorites;
