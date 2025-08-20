import { MapPin, Plane, Hotel, Compass, Car, CreditCard, CheckCircle } from "lucide-react";
import { calculateTotalPrice } from "../utils/travelUtils";

export const createSteps = (
  userResponses = {},
  loadedCities,
  loadedFlights,
  loadedHotels,
  loadedAttractions
) => {
  // --- Normalize inputs to plain arrays ---
  const cities = Array.isArray(loadedCities)
    ? loadedCities
    : Array.isArray(loadedCities?.cities)
    ? loadedCities.cities
    : Array.isArray(loadedCities?.data)
    ? loadedCities.data
    : [];

  const flights = Array.isArray(loadedFlights)
    ? loadedFlights
    : Array.isArray(loadedFlights?.flights)
    ? loadedFlights.flights
    : Array.isArray(loadedFlights?.data)
    ? loadedFlights.data
    : [];

  const hotelsInput = Array.isArray(loadedHotels)
    ? loadedHotels
    : Array.isArray(loadedHotels?.hotels)
    ? loadedHotels.hotels
    : Array.isArray(loadedHotels?.data)
    ? loadedHotels.data
    : [];

  const attractionsInput = Array.isArray(loadedAttractions)
    ? loadedAttractions
    : Array.isArray(loadedAttractions?.attractions)
    ? loadedAttractions.attractions
    : Array.isArray(loadedAttractions?.data)
    ? loadedAttractions.data
    : [];

  // Destination name helper
  const destSel = userResponses["What is your destination city?"];
  const destName = typeof destSel === "string" ? destSel : destSel?.name;

  // Extended-JSON → number
  const toMoney = (v) => {
    if (typeof v === "number") return v;
    if (v && typeof v === "object") {
      if (v.$numberInt != null) return Number(v.$numberInt);
      if (v.$numberDouble != null) return Number(v.$numberDouble);
      if (v.value != null) return Number(v.value);
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Hotels can be grouped by city or already filtered (API-by-city)
  const hotelsForCity = (city) => {
    if (!city) return [];
    // grouped shape: [{city, hotels:[...]}]
    const group = hotelsInput.find(
      (h) => Array.isArray(h?.hotels) && typeof h?.city === "string" && h.city.toLowerCase() === city.toLowerCase()
    );
    if (group) return group.hotels;

    // flat shape with city on each hotel: [{city, name, price}]
    const filtered = hotelsInput.filter(
      (h) => !Array.isArray(h?.hotels) && typeof h?.city === "string" && h.city.toLowerCase() === city.toLowerCase()
    );
    if (filtered.length) return filtered;

    // already filtered by API (/city/:key) → just use as-is
    return hotelsInput;
  };

  // Attractions can also be grouped or flat
  const attractionsForCity = (city) => {
    if (!city) return [];
    const group = attractionsInput.find(
      (a) => Array.isArray(a?.attractions) && a.city?.toLowerCase?.() === city.toLowerCase()
    );
    if (group) return group.attractions;
    return attractionsInput.filter((a) => a.city?.toLowerCase?.() === city.toLowerCase());
  };

  const hotelsList = hotelsForCity(destName);
  const attractionsList = attractionsForCity(destName);

  return [
   {
  label: "Destination",
  icon: MapPin,
  questions: [
    {
      prompt: "What is your departure city?",
      options: cities.length ? cities.map((c) => ({ id: c._id, name: c.city })) : [],
    },
    {
      prompt: "What is your destination city?",
      options: cities.length 
        ? cities
            .filter((c) => {
              // סינון עיר היעד - לא להציג את עיר המוצא
              const departureCity = userResponses["What is your departure city?"];
              return departureCity ? c._id !== departureCity.id : true;
            })
            .map((c) => ({ id: c._id, name: c.city }))
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
            const cityName = destName;
            return (flights || [])
              .filter((flight) =>
                cityName ? flight.city?.toLowerCase?.() === cityName.toLowerCase() : true
              )
              .map((flight) => ({
                id: flight._id,
                name: `${flight.airline || flight.name || "Flight"} - $${toMoney(flight.price)}`,
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
          options: (hotelsList || []).map((hotel, i) => ({
            id: hotel._id || `${hotel.name || "Hotel"}-${i}`,
            name: `${hotel.name || "Hotel"} - $${toMoney(hotel.price)}/night`,
            ...hotel,
          })),
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
          options: (attractionsList || []).map((attr, i) => ({
            id: attr._id || `${attr.name || "Attraction"}-${i}`,
            name: `${attr.name || "Attraction"} - $${toMoney(attr.price)}`,
            ...attr,
          })),
        },
        { prompt: "Budget for daily activities?", type: "text" },
        { prompt: "Interest areas?", options: ["History", "Food", "Nightlife", "Nature", "Culture"] },
        { prompt: "Group type?", options: ["Solo", "Couple", "Family", "Friends"] },
        { prompt: "Number of travelers", type: "number", min: 1, max: 20 },
        { prompt: "Tour preference?", options: ["Guided Tours", "Self-Guided"] },
      ],
    },
    {
      label: "Transportation",
      icon: Car,
      questions: [
        { prompt: "Select your mode of transportation", options: ["Car", "Public Transport", "Bike", "Walk"] },
        { prompt: "Do you need an airport transfer?", options: ["Yes", "No"] },
      ],
    },
    {
      label: "Payment",
      icon: CreditCard,
      questions: [
        { prompt: "Select payment method", options: ["Credit Card", "PayPal", "Bank Transfer", "Crypto"] },
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
            ? userResponses["Select attractions to visit"].map((a) => a.name).join(", ")
            : userResponses["Select attractions to visit"]?.name || "N/A",
        },
        { prompt: "Transportation", value: userResponses["Select your mode of transportation"] },
        { prompt: "Payment method", value: userResponses["Select payment method"] },
        { prompt: "Total Price", value: `$${calculateTotalPrice(userResponses)}` },
      ],
    },
  ];
};
