import React, { useEffect } from 'react';
import { useNavigate,useLocation  } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Download, Map, Calendar, Users, Camera, Settings, Navigation, Book } from 'lucide-react';
import '../assets/styles/DownloadApp.css';

const DownloadApp = () => {
 const navigate = useNavigate();
  const location = useLocation();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || token === "null" || token === "undefined") {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [navigate, location])

  const iosLink = 'https://apps.apple.com/app/pathmakers/id123456789';
  const androidLink = 'https://play.google.com/store/apps/details?id=com.pathmakers.app';

  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

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