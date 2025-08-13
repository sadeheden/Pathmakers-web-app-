import React from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import '../assets/styles/DownloadApp.css';
import mockupImage from '../assets/images/mockup.png';

const DownloadApp = () => {
  const navigate = useNavigate();

  const iosLink = 'https://www.apple.com/store';

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className="phone-landing-container-app">
      {/* Right: Mockup with QR */}
      <div className="phone-mockup-app">
        <img src={mockupImage} alt="App Mockup" className="mockup-image-app" />

        <div
          className="qr-inside-mockup"
          onClick={() => handleDownload(iosLink)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDownload(iosLink) }}
          aria-label="Download app"
        >
          <QRCode value={iosLink} size={90} bgColor="#fff" fgColor="#000" />
          <p className="qr-label-inside">Scan to download</p>
        </div>
      </div>

      {/* Left: Content */}
      <div className="text-content-app">
        <h1 className="title-app">Enjoy Our App</h1>

        <p className="app-description-app">
          PathMakers is a smart app accompanying you throughout your trip, after building your itinerary on the main website. The app requires login only (no registration), providing a personalized travel experience including:
        </p>

        <ul className="features-list-app">
          <li>Daily Journal – Personalized daily schedule with notes and experiences.</li>
          <li>Interactive Map – View itinerary with stops and attractions, plus Waze navigation.</li>
          <li>Personal Area – Access personal details, account settings, and logout.</li>
          <li>Family Sync – Share daily planning with family for real-time updates.</li>
          <li>Polarsteps Experience – Document your journey with photos and stories like a digital travel diary.</li>
        </ul>
      </div>

    <button 
  className="floating-support-btn"
  onClick={() => navigate('/support')}
>
  ❔
</button>

    </div>
  );
};

export default DownloadApp;
