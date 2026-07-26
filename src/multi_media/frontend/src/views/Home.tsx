import React from 'react';
import HeroSlider from '../components/HeroSlider';
import ContentSlider from '../components/ContentSlider';

const Home: React.FC = () => (
  <div className="home-page">
    {/* Full-width hero with real featured content */}
    <HeroSlider />

    {/* Category sliders — each loads live from the media servers */}
    <div className="sliders-container">
      <ContentSlider
        title="English Movies"
        path="/DHAKA-FLIX-7/English%20Movies/%282024%29/"
        accentColor="#6366f1"
      />
      <ContentSlider
        title="IMDb Top-250"
        path="/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/"
        accentColor="#eab308"
      />
      <ContentSlider
        title="Hindi Movies"
        path="/DHAKA-FLIX-14/Hindi%20Movies/"
        accentColor="#f59e0b"
      />
      <ContentSlider
        title="TV & Web Series"
        path="/DHAKA-FLIX-12/TV-WEB-Series/"
        accentColor="#3b82f6"
      />
      <ContentSlider
        title="Animation (1080p)"
        path="/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/"
        accentColor="#a855f7"
      />
      <ContentSlider
        title="Korean TV & Series"
        path="/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/"
        accentColor="#ef4444"
      />
    </div>
  </div>
);

export default Home;
