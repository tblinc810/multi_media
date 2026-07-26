import React, { createContext, useContext, useState } from 'react';

export type VideoPlayerType = 'plyr' | 'videojs' | 'plyr-fullscreen' | 'videojs-custom';

interface PlayerContextType {
  playerType: VideoPlayerType;
  setPlayerType: (type: VideoPlayerType) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playerType, setPlayerTypeState] = useState<VideoPlayerType>(() => {
    const saved = localStorage.getItem('videoPlayerType');
    return (saved as VideoPlayerType) || 'plyr';
  });

  const setPlayerType = (type: VideoPlayerType) => {
    setPlayerTypeState(type);
    localStorage.setItem('videoPlayerType', type);
  };

  return (
    <PlayerContext.Provider value={{ playerType, setPlayerType }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
