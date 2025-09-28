import { useState, useEffect } from 'react';

export const useTravelData = (userResponses) => {
    const [loadedCities, setLoadedCities] = useState([]);
    const [loadedFlights, setLoadedFlights] = useState([]);
    const [loadedHotels, setLoadedHotels] = useState([]);
    const [loadedAttractions, setLoadedAttractions] = useState([]);

    useEffect(() => {
        async function fetchCities() {
            try {
                const response = await fetch("https://pathmakers-server-site.onrender.com/api/cities");
                if (!response.ok) {
                    throw new Error(`Failed to fetch cities, status: ${response.status}`);
                }
                const data = await response.json();
                setLoadedCities(data);
            } catch (error) {
                console.error("Error fetching cities:", error);
            }
        }

        async function fetchFlights(city) {
            if (!city) return;
            const cityName = city.name || city;
            try {
                const response = await fetch(`https://pathmakers-server-site.onrender.com/api/flights/city/${encodeURIComponent(cityName)}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch flights for ${cityName}, status: ${response.status}`);
                }
                const data = await response.json();
                setLoadedFlights(data);
            } catch (error) {
                console.error("Error fetching flights:", error);
            }
        }

        async function fetchHotels(city) {
            if (!city) return;
            const cityName = city.name || city;
            try {
                const response = await fetch(`https://pathmakers-server-site.onrender.com/api/hotels/city/${encodeURIComponent(cityName)}`);
                if (response.status === 404) {
                    setLoadedHotels([]);
                    return;
                }
                if (!response.ok) {
                    throw new Error(`Failed to fetch hotels for ${cityName}, status: ${response.status}`);
                }
                const data = await response.json();
                setLoadedHotels(data);
            } catch (error) {
                console.error("Error fetching hotels:", error);
            }
        }

        async function fetchAttractions(city) {
            if (!city) return;
            const cityName = city.name || city;
            try {
                const response = await fetch(`https://pathmakers-server-site.onrender.com/api/attractions/city/${encodeURIComponent(cityName)}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch attractions for ${cityName}, status: ${response.status}`);
                }
                const data = await response.json();
                setLoadedAttractions(data.attractions || []);
            } catch (error) {
                console.error("Error fetching attractions:", error);
            }
        }

        async function fetchData() {
            await Promise.all([
                fetchCities(),
                userResponses["What is your destination city?"] &&
                    fetchFlights(userResponses["What is your destination city?"]),
                userResponses["What is your destination city?"] &&
                    fetchHotels(userResponses["What is your destination city?"]),
                userResponses["What is your destination city?"] &&
                    fetchAttractions(userResponses["What is your destination city?"]),
            ]);
        }
        fetchData();
    }, [userResponses["What is your destination city?"]]);

    return {
        loadedCities,
        loadedFlights,
        loadedHotels,
        loadedAttractions
    };
};