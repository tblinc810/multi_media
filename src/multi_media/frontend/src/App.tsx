import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth/AuthContext';
import { PlayerProvider } from './store/PlayerContext';
import Layout from './components/Layout';
import Home from './views/Home';
import Login from './views/Login';
import Signup from './views/Signup';
import Explore from './views/Explore';
import Library from './views/Library';
import Favorites from './views/Favorites';
import Settings from './views/Settings';


const App: React.FC = () => {
  return (
    <AuthProvider>
      <PlayerProvider>
        <Router>
          <div className="app-container">
            <Toaster position="top-center" toastOptions={{ 
              style: { 
                background: 'var(--surface-color)', 
                color: 'var(--text-primary)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-color)'
              } 
            }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={
                <Layout>
                  <Home />
                </Layout>
              } />
              <Route path="/explore" element={
                <Layout>
                  <Explore />
                </Layout>
              } />
              <Route path="/library" element={
                <Layout>
                  <Library />
                </Layout>
              } />
              <Route path="/favorites" element={
                <Layout>
                  <Favorites />
                </Layout>
              } />
              <Route path="/settings" element={
                <Layout>
                  <Settings />
                </Layout>
              } />
            </Routes>
          </div>
        </Router>
      </PlayerProvider>
    </AuthProvider>
  );
};

export default App;
