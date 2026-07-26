import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Compass, Star, Settings } from 'lucide-react';

const SideNav: React.FC = () => {
  const navItems = [
    { name: 'Home', icon: Home, path: '/' },
    { name: 'Explore', icon: Compass, path: '/explore' },
    { name: 'Favorites', icon: Star, path: '/favorites' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <motion.div 
      initial={{ x: -240 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: '64px',
        left: 0,
        bottom: 0,
        width: '240px',
        background: 'rgba(15, 17, 21, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 40,
      }}
    >
      <div style={{ paddingBottom: '16px', marginBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', paddingLeft: '12px' }}>
          Menu
        </p>
      </div>

      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            fontWeight: isActive ? '500' : '400',
            textDecoration: 'none',
            transition: 'all 0.2s',
          })}
        >
          <item.icon size={20} color="currentColor" />
          {item.name}
        </NavLink>
      ))}
    </motion.div>
  );
};

export default SideNav;
