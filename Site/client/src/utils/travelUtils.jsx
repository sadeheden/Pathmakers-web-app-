export const calculateTotalPrice = (userResponses) => {
    let total = 0;

    // ✈️ מחיר טיסה
    const selectedFlight = userResponses["Select your flight"];
    if (selectedFlight?.price) {
        total += selectedFlight.price;
    }

    // 🏨 מחיר מלון
    const selectedHotel = userResponses["Select your hotel"];
    if (selectedHotel?.price) {
        total += selectedHotel.price;
    }

    // 🏛️ מחיר אטרקציות
    const selectedAttractions = userResponses["Select attractions to visit"];
    if (Array.isArray(selectedAttractions)) {
        selectedAttractions.forEach(attr => {
            if (attr?.price) total += attr.price;
        });
    }

    // 🚗 תחבורה
    const selectedTransportation = userResponses["Select your mode of transportation"];
    if (selectedTransportation) {
        total += selectedTransportation === "Car" ? 50 : 10;
    }
    const numberOfTravelers = parseInt(userResponses["Number of travelers"]) || 1;

    return total * numberOfTravelers;
};

export const cleanId = (id) => {
    if (!id) return null;
    
    // Handle string IDs
    if (typeof id === 'string') {
        const onlyHex = id.match(/[a-f\d]{24}/i);
        return onlyHex ? onlyHex[0] : null;
    }
    
    // Handle object IDs
    if (typeof id === 'object' && id.id) {
        const onlyHex = id.id.match(/[a-f\d]{24}/i);
        return onlyHex ? onlyHex[0] : null;
    }
    
    return null;
};