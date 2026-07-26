import React from 'react';
import { Settings as SettingsIcon, User, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { usePlayer } from '../store/PlayerContext';
import { auth } from '../auth/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const { playerType, setPlayerType } = usePlayer();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SettingsIcon size={24} color="white" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Settings</h1>
      </div>
      
      <div style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {currentUser ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Profile" 
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary-color)' }}>
                  <User size={40} color="var(--text-secondary)" />
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  {currentUser.displayName || 'User'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <Mail size={16} />
                  <span>{currentUser.email}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Video Player</label>
                <select 
                  value={playerType}
                  onChange={(e) => setPlayerType(e.target.value as any)}
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    background: 'var(--bg-color)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="plyr">Plyr (Default)</option>
                  <option value="plyr-fullscreen">Plyr (Fullscreen Style)</option>
                  <option value="videojs">Video.js (Classic)</option>
                  <option value="videojs-custom">Video.js (Custom Theme)</option>
                </select>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Choose the video player engine that works best for your device.
                </p>
              </div>
            </div>

            <div>
              <button 
                onClick={handleLogout}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  padding: '12px 24px', borderRadius: '8px', 
                  background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s'
                }}
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Please log in to view your settings.</p>
        )}
        
      </div>
    </div>
  );
};

export default Settings;
