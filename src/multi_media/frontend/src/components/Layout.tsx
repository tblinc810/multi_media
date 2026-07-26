import React from 'react';
import Navbar from './Navbar';
import SideNav from './SideNav';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout-container">
      <Navbar />
      <div className="main-wrapper">
        <SideNav />
        <main className="main-content">
          <div style={{ minHeight: 'calc(100vh - 64px - 69px)', paddingBottom: '40px' }}>
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default Layout;
