import React from 'react';
import '../assets/styles/AboutPage.css';

const AboutPage = () => {
  return (
    <div className="container">
      <h1>Who Are We?</h1>
      
      <div className="cards-container">
        <div className="card">
          <div className="icon">💡</div>
          <p>We are a team of creative and innovative individuals dedicated to providing smart and advanced solutions to every challenge.</p>
        </div>
        
        <div className="card">
          <div className="icon">✈️</div>
          <p>Our platform offers everything you need to plan your trip, including flights, attractions, and hotels. We focus on cutting-edge technology, stunning design, and premium customer service to ensure a seamless experience.</p>
        </div>
        
        <div className="card">
          <div className="icon">⚙️</div>
          <p>Committed to enhancing the user experience and offering personalized solutions to each client. Join us on a journey of innovation, creativity, and professionalism.</p>
        </div>
      </div>
      
      <div className="cta">
        <p>Book your next adventure with us — we're the best at what we do!</p>
      </div>
   <button 
  className="floating-support-btn"
  onClick={() => navigate('/support')}
>
  💬 Support
</button>
    </div>
    
  );
};

export default AboutPage;
