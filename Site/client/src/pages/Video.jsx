import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/Video.css';
import ph from "../assets/images/Pathmakers-VEED.mp4"; // Importing video

const VideoExplanation = () => {
    const navigate = useNavigate();

    const handleContinue = () => {
        navigate('/chat');
    };

    return (
        <div className="containerVideo">
            <div className="videoContainer">
                <video 
                    className="video" 
                    autoPlay  
                    playsInline 
                    controls  
                >
                    <source src={ph} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
            <div className="textContainer">
                <h1 className="title"> How to Use the Website 🌍</h1>
                <p className="description">
                    Watch the video to explore all the features of our platform! 
                    You'll learn how to navigate through the website efficiently and 
                    get the most out of your experience. 
                </p>
                <div className="buttonContainer">
                    <button 
                        className="nextButton"
                        onClick={handleContinue}
                    >
                        Continue 
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoExplanation;
