import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/styles/main.css';

// React icons
import { FiCompass, FiHeart, FiMap, FiUsers } from 'react-icons/fi';

// Use your actual images:
import parisImg from '../assets/images/paris.png';
import tokyoImg from '../assets/images/tokyo.png';
import newYorkImg from '../assets/images/newyork.png';
import barcelonaImg from '../assets/images/barcelona.png';
import romeImg from '../assets/images/rome.png';
import londonImg from '../assets/images/london.png';
import bangkokImg from '../assets/images/bangkok.png';
import dubaiImg from '../assets/images/dubai.png';
import fantasyImg from '../assets/images/fantasy.jpg'; 
import airportImg from '../assets/images/airport.jpg';

// Destination "cities"
const cities = [
  { img: parisImg, name: 'Paris', slug: 'paris' },
  { img: tokyoImg, name: 'Tokyo', slug: 'tokyo' },
  { img: newYorkImg, name: 'New York', slug: 'new-york' },
  { img: barcelonaImg, name: 'Barcelona', slug: 'barcelona' },
  { img: romeImg, name: 'Rome', slug: 'rome' },
  { img: londonImg, name: 'London', slug: 'london' },
  { img: bangkokImg, name: 'Bangkok', slug: 'bangkok' },
  { img: dubaiImg, name: 'Dubai', slug: 'dubai' }
];


const CARDS_PER_PAGE = 6;
const AUTO_ROTATE_SECONDS = 10;

const Main = () => {
  const navigate = useNavigate();

  // Carousel logic
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIdx(idx => (idx + CARDS_PER_PAGE) % cities.length);
    }, AUTO_ROTATE_SECONDS * 1000);
    return () => clearInterval(interval);
  }, []);

  // Slice, looping if necessary
  const visibleCities = [
    ...cities,
    ...cities.slice(0, CARDS_PER_PAGE)
  ].slice(carouselIdx, carouselIdx + CARDS_PER_PAGE);

  return (
    <div className="trips-page">
      {/* --- Hero / Intro --- */}
      <section className="trip-intro">
        <h1 className="trip-title">Personalize your travel planning with Trips</h1>
        <p className="trip-subtitle">
          With Trips, you get two trip planners in one—use AI to build your trip or build it yourself.
          Either way, there’s more than 8 million spots to discover, with over one billion traveler
          reviews and opinions to guide you.
        </p>
        <div className="trip-icons">
          <div className="icon-block">
            <FiCompass className="icon" />
            <p>Get personalized recs with AI</p>
          </div>
          <div className="icon-block">
            <FiHeart className="icon" />
            <p>Save hotels, restaurants, and more</p>
          </div>
          <div className="icon-block">
            <FiMap className="icon" />
            <p>See your saves on your custom map</p>
          </div>
          <div className="icon-block">
            <FiUsers className="icon" />
            <p>Share and collab with your travel buds</p>
          </div>
        </div>
      </section>

      {/* --- AI vs Manual Cards --- */}
      <section className="trip-options">
        <div className="trip-card ai-card">
          <img src={fantasyImg} alt="AI Trip Builder" />
          <h3>Start a trip in minutes with AI</h3>
          <p>
            Answer four short questions and get personalized recs with AI, guided by traveler opinions.
          </p>
          <button onClick={() => navigate('/ai-builder')}>
            Try AI trip builder
          </button>
        </div>
        <div className="trip-card manual-card">
          <img src={airportImg} alt="Manual Trip Builder" />
          <h3>Build your trip from scratch</h3>
          <p>
            Browse top destinations, restaurants, and things to do and save your faves as you go.
          </p>
          <button onClick={() => navigate('/manual-builder')}>
            Do it yourself
          </button>
        </div>
      </section>

      {/* --- Popular Destinations Row --- */}
      <section className="popular-trips">
        <h2>Traveler-Favorite Destinations</h2>
        <div className="city-cards">
          {visibleCities.map((city, i) => (
  <div className="city-card" key={i}>
    <img src={city.img} alt={city.name} />
    <p>{city.name}</p>
  </div>
))}

        </div>
      </section>
    </div>
  );
};

export default Main;
