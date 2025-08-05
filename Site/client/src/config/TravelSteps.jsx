import { MapPin, Plane, Hotel, Compass, Car, CreditCard, CheckCircle } from "lucide-react";
import { calculateTotalPrice } from "../utils/travelUtils";

export const createSteps = (userResponses, loadedCities, loadedFlights, loadedHotels, loadedAttractions) => {
    return [
        {
            label: "Destination",
            icon: MapPin,
            questions: [
                {
                    prompt: "What is your departure city?",
                    options: loadedCities.length
                        ? loadedCities.map(c => ({ id: c._id, name: c.city }))
                        : [],
                },
                {
                    prompt: "What is your destination city?",
                    options: loadedCities.length
                        ? loadedCities.map(c => ({ id: c._id, name: c.city }))
                        : [],
                },
            ],
        },
        {
            label: "Flight",
            icon: Plane,
            questions: [
                { prompt: "Travel dates (departure)?", type: "date" },
                { prompt: "Travel dates (return)?", type: "date" },
                {
                    prompt: "Select your flight",
                    options: (() => {
                        const dest = userResponses["What is your destination city?"];
                        const cityName = typeof dest === "string" ? dest : dest?.name;
                        return loadedFlights
                            .filter(flight => flight.city === cityName)
                            .map((flight, index) => ({
                                id: flight._id,
                                name: `${flight.airline} - $${flight.price}`,
                                ...flight,
                            }));
                    })(),
                },
                { prompt: "Class preference", options: ["Economy", "Business", "First"] },
            ],
        },
        {
            label: "Hotel",
            icon: Hotel,
            questions: [
                {
                    prompt: "Select your hotel",
                    options: (() => {
                        const dest = userResponses["What is your destination city?"];
                        const cityName = typeof dest === "string" ? dest : dest?.name;
                        const hotelGroup = loadedHotels.find(
                            h => h.city.toLowerCase() === cityName?.toLowerCase()
                        );
                        return hotelGroup?.hotels?.map((hotel, i) => ({
                            id: hotel._id || `${hotel.name}-${i}`,
                            name: `${hotel.name} - $${hotel.price}/night`,
                            ...hotel,
                        })) || [];
                    })(),
                },
                { prompt: "Budget range per night?", type: "text" },
                {
                    prompt: "Accessibility requirements?",
                    options: ["None", "Wheelchair Access", "Ground Floor", "Special Assistance"],
                },
                { prompt: "Pet-friendly options?", options: ["Yes", "No"] },
            ],
        },
        {
            label: "Attractions",
            icon: Compass,
            questions: [
                {
                    prompt: "Select attractions to visit",
                    options: (() => {
                        const dest = userResponses["What is your destination city?"];
                        const cityName = typeof dest === "string" ? dest : dest?.name;
                        const attractionGroup = loadedAttractions.find(a => a.city === cityName);
                        return attractionGroup?.attractions?.map((attr, i) => ({
                            id: `${attractionGroup._id}-${i}`,
                            name: `${attr.name} - $${attr.price}`,
                            ...attr,
                        })) || [];
                    })(),
                },
                { prompt: "Budget for daily activities?", type: "text" },
                { prompt: "Interest areas?", options: ["History", "Food", "Nightlife", "Nature", "Culture"] },
                { prompt: "Group type?", options: ["Solo", "Couple", "Family", "Friends"] },
                { 
                    prompt: "Number of travelers", 
                    type: "number", 
                    min: 1,
                    max: 20
                },
                { prompt: "Tour preference?", options: ["Guided Tours", "Self-Guided"] },
            ],
        },
        {
            label: "Transportation",
            icon: Car,
            questions: [
                {
                    prompt: "Select your mode of transportation",
                    options: ["Car", "Public Transport", "Bike", "Walk"],
                },
                { prompt: "Do you need an airport transfer?", options: ["Yes", "No"] },
            ],
        },
        {
            label: "Payment",
            icon: CreditCard,
            questions: [
                {
                    prompt: "Select payment method",
                    options: ["Credit Card", "PayPal", "Bank Transfer", "Crypto"],
                },
                { prompt: "Do you have a promo code?", type: "text" },
            ],
        },
        {
            label: "Trip Summary",
            icon: CheckCircle,
            questions: [
                { prompt: "Departure city", value: userResponses["What is your departure city?"]?.name },
                { prompt: "Destination city", value: userResponses["What is your destination city?"]?.name },
                { prompt: "Flight", value: userResponses["Select your flight"]?.name },
                { prompt: "Hotel", value: userResponses["Select your hotel"]?.name },
                {
                    prompt: "Attractions",
                    value: Array.isArray(userResponses["Select attractions to visit"])
                        ? userResponses["Select attractions to visit"].map(attr => attr.name).join(", ")
                        : userResponses["Select attractions to visit"]?.name || "N/A",
                },
                { prompt: "Transportation", value: userResponses["Select your mode of transportation"] },
                { prompt: "Payment method", value: userResponses["Select payment method"] },
                { prompt: "Total Price", value: `$${calculateTotalPrice(userResponses)}` },
            ],
        },
    ];
};