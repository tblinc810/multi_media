import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '24px',
      textAlign: 'center',
      borderTop: '1px solid var(--border-color)',
      color: 'var(--text-secondary)',
      fontSize: '14px',
      background: 'rgba(15, 17, 21, 0.4)',
    }}>
      <p>© {new Date().getFullYear()} MultiMedia Platform. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
