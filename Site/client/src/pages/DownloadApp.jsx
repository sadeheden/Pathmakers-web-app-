import React from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Import this
import '../assets/styles/DownloadApp.css';
import appleImg from '../assets/images/apple.png';
import androidImg from '../assets/images/android.png';
import mockupImage from '../assets/images/mockup.png';

const DownloadApp = () => {
    const navigate = useNavigate(); // ✅ Initialize it

    const handleDownload = (platform) => {
        if (platform === 'ios') {
            window.location.href = 'https://www.apple.com/store';
        } else if (platform === 'android') {
            window.location.href = 'https://play.google.com/store';
        }
    };

    return (
        <div className="phone-landing-container">
            {/* Mockup (Left Side) */}
            <div className="phone-mockup">
                <img src={mockupImage} alt="Captain Credit" className="mockup-image" />
            </div>

            {/* Content (Right Side) */}
            <div className="text-content">
                <h1 className="title">Enjoy our app</h1>

                {/* Download Buttons */}
                <div className="download-buttons">
                    <button onClick={() => handleDownload('ios')} className="button-ios">
                        <img src={appleImg} alt="Download on the App Store" className="button-icon" />
                        Download for iPhone
                    </button>
                    <button onClick={() => handleDownload('android')} className="button-android">
                        <img src={androidImg} alt="Get it on Google Play" className="button-icon" />
                        Download for Android
                    </button>
                </div>
            </div>

            {/* Floating Support Button */}
            <button 
                className="floating-support-btn"
                onClick={() => navigate('/support')} // ✅ Will now work
            >
                💬 Support
            </button>
        </div>
    );
};

export default DownloadApp;
