import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { ChevronLeft, ChevronRight, Download, Map, Calendar, Users, Camera, Settings, Navigation, Book } from 'lucide-react';
import '../assets/styles/DownloadApp.css';
import mockupImage from '../assets/images/mockup.png';

const DownloadApp = () => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const navigate = useNavigate();

  const iosLink = 'https://apps.apple.com/app/pathmakers/id123456789';
  const androidLink = 'https://play.google.com/store/apps/details?id=com.pathmakers.app';

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  const videos = [
    {
      id: 1,
      title: "Getting Started",
      description: "Learn how to login and set up your account for the first time. Simple and quick setup process.",
      icon: <Settings className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" // Replace with actual video URLs
    },
    {
      id: 2,
      title: "Daily Journal",
      description: "Create and manage your personalized daily schedule with notes and travel experiences.",
      icon: <Book className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 3,
      title: "Interactive Map",
      description: "Navigate your itinerary with our interactive map featuring stops, attractions, and Waze integration.",
      icon: <Map className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 4,
      title: "Waze Navigation",
      description: "Seamlessly integrate with Waze for turn-by-turn navigation to your planned destinations.",
      icon: <Navigation className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 5,
      title: "Family Sync",
      description: "Share your daily plans with family members for real-time updates and coordination.",
      icon: <Users className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 6,
      title: "Personal Area",
      description: "Manage your account settings, personal details, and preferences in one convenient location.",
      icon: <Settings className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 7,
      title: "Photo Documentation",
      description: "Capture and organize your travel memories with our Polarsteps-like photo documentation feature.",
      icon: <Camera className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: 8,
      title: "Travel Stories",
      description: "Create and share your travel stories, building a digital diary of your adventures.",
      icon: <Book className="w-5 h-5" />,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ];

  const features = [
    { 
      icon: <Book className="w-8 h-8" />, 
      title: "Daily Journal", 
      text: "Personalized daily schedule with notes and experiences." 
    },
    { 
      icon: <Map className="w-8 h-8" />, 
      title: "Interactive Map", 
      text: "View itinerary with stops and attractions, plus Waze navigation." 
    },
    { 
      icon: <Settings className="w-8 h-8" />, 
      title: "Personal Area", 
      text: "Access personal details, account settings, and logout." 
    },
    { 
      icon: <Users className="w-8 h-8" />, 
      title: "Family Sync", 
      text: "Share daily planning with family for real-time updates." 
    },
    { 
      icon: <Camera className="w-8 h-8" />, 
      title: "Travel Stories", 
      text: "Document your journey with photos and stories like a digital travel diary." 
    },
    { 
      icon: <Navigation className="w-8 h-8" />, 
      title: "Smart Navigation", 
      text: "Seamless integration with popular navigation apps for easy routing." 
    }
  ];

  const nextVideo = () => {
    setCurrentVideo((prev) => (prev + 1) % videos.length);
  };

  const prevVideo = () => {
    setCurrentVideo((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const handleSupportClick = () => {
    navigate('/support');
  };

  return (
    <div className="download-app-container">
      {/* Main Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">
          Enjoy Our App
        </h1>
        
        <p className="hero-description">
          PathMakers is a smart app accompanying you throughout your trip, after building your itinerary on the main website. The app requires login only (no registration), providing a personalized travel experience including:
        </p>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-text">{feature.text}</p>
            </div>
          ))}
        </div>

        {/* Download Buttons */}
        <div className="download-buttons">
          <button
            onClick={() => handleDownload(iosLink)}
            className="download-btn download-btn-ios"
          >
            <Download className="w-6 h-6" />
            Download for iOS
          </button>
          <button
            onClick={() => handleDownload(androidLink)}
            className="download-btn download-btn-android"
          >
            <Download className="w-6 h-6" />
            Download for Android
          </button>
        </div>
      </div>

      {/* Video Tutorial Section */}
      <div className="video-section">
        <div className="video-container">
          <div className="video-header">
            <h2 className="video-title">
              Learn How to Use PathMakers
            </h2>
            <p className="video-subtitle">
              Watch our comprehensive video tutorials to get the most out of your travel experience with PathMakers app.
            </p>
          </div>

          {/* Video Player and Navigation */}
          <div className="video-grid">
            {/* Main Video Player */}
            <div>
              <div className="video-player-container">
                <iframe
                  src={videos[currentVideo].videoUrl}
                  title={videos[currentVideo].title}
                  className="video-iframe"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                
                {/* Video Navigation */}
                <div className="video-controls">
                  <button onClick={prevVideo} className="video-nav-btn">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="video-counter">
                    {currentVideo + 1} / {videos.length}
                  </div>
                  
                  <button onClick={nextVideo} className="video-nav-btn">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Current Video Info */}
              <div className="current-video-info">
                <div className="current-video-header">
                  <div className="current-video-icon">{videos[currentVideo].icon}</div>
                  <h3 className="current-video-title">
                    {videos[currentVideo].title}
                  </h3>
                </div>
                <p className="current-video-description">
                  {videos[currentVideo].description}
                </p>
              </div>
            </div>

            {/* Video List */}
            <div className="video-list-container">
              <h4 className="video-list-title">All Tutorials</h4>
              <div className="video-list">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => setCurrentVideo(index)}
                    className={`video-item ${index === currentVideo ? 'active' : ''}`}
                  >
                    <div className="video-item-content">
                      <div className="video-item-icon">
                        {video.icon}
                      </div>
                      <div className="video-item-text">
                        <h5 className="video-item-title">
                          {video.title}
                        </h5>
                        <p className="video-item-description">
                          {video.description}
                        </p>
                      </div>
                      <div className="video-item-number">
                        {index + 1}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Download Section */}
      <div className="qr-section">
        <div className="qr-container">
          <h2 className="qr-title">
            Quick Download with QR Code
          </h2>
          <p className="qr-subtitle">
            Scan the QR code with your phone's camera to download the app directly
          </p>
          
          <div className="qr-codes-container">
            {/* iOS QR Code */}
            <div className="qr-code-card" onClick={() => handleDownload(iosLink)}>
              <div className="qr-code-content">
                <div className="qr-code-wrapper">
                  <QRCode value={iosLink} size={150} />
                </div>
                <div>
                  <h3 className="qr-code-title">iOS App</h3>
                  <p className="qr-code-platform">For iPhone & iPad</p>
                  <p className="qr-code-instruction ios">
                    Tap to open App Store
                  </p>
                </div>
              </div>
            </div>

            {/* Android QR Code */}
            <div className="qr-code-card" onClick={() => handleDownload(androidLink)}>
              <div className="qr-code-content">
                <div className="qr-code-wrapper">
                  <QRCode value={androidLink} size={150} />
                </div>
                <div>
                  <h3 className="qr-code-title">Android App</h3>
                  <p className="qr-code-platform">For Android devices</p>
                  <p className="qr-code-instruction android">
                    Tap to open Play Store
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="qr-footer-text">
            <p>Simply point your phone's camera at the QR code and tap the notification to download</p>
          </div>
        </div>
      </div>

      {/* Support Button */}
      <button className="support-btn" onClick={handleSupportClick}>
        <span className="support-btn-icon">❔</span>
      </button>
    </div>
  );
};

export default DownloadApp;