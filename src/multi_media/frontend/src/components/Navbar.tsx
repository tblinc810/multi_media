import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { auth } from '../auth/firebase';
import { PlaySquare, LogOut, User as UserIcon, Bell, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <motion.div 
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 50,
        background: 'rgba(15, 17, 21, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <PlaySquare color="var(--accent-color)" size={28} />
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>
          tblinc v1
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <Search size={20} />
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <Bell size={20} />
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>

        {currentUser ? (
          <>
            <Link to="/settings" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Profile" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid transparent', transition: 'border-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                />
              ) : (
                <div 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid transparent', transition: 'border-color 0.2s', color: 'var(--text-secondary)' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <UserIcon size={16} />
                </div>
              )}
            </Link>
            <button 
              onClick={() => auth.signOut()}
              className="btn-outline"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: '500', transition: 'color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Log In
            </Link>
            <Link 
              to="/signup"
              style={{ 
                background: 'var(--primary-color)', color: 'white', textDecoration: 'none',
                padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Navbar;
