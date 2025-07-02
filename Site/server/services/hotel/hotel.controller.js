import { loadHotels } from "./hotel.model.js"; // ✅ Correct import

export const getHotels = async (req, res) => {
    const city = decodeURIComponent(req.params.city); // ✅ Fix URL Encoding
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    console.log("🔍 Fetching hotels for:", city);

    try {
        const hotelsData = await loadHotels();
        if (!hotelsData || hotelsData.length === 0) {
            return res.status(500).json({ message: "Hotels data is unavailable." });
        }

        // ✅ Find city entry (not filter)
        const cityHotels = hotelsData.find(h => h.city.toLowerCase() === city.toLowerCase());

        if (!cityHotels || !cityHotels.hotels || cityHotels.hotels.length === 0) {
            console.warn(`🚨 No hotels found for city: ${city}`);
            return res.status(404).json({ message: `No hotels found for ${city}.` });
        }

        // ✅ Apply Pagination
        const totalHotels = cityHotels.hotels.length;
        const paginatedHotels = cityHotels.hotels.slice((page - 1) * limit, page * limit);

        console.log(`✅ Found ${totalHotels} hotels for ${city}, displaying page ${page}`);

        return res.json({
            totalHotels,
            totalPages: Math.ceil(totalHotels / limit),
            currentPage: page,
            hotels: paginatedHotels
        });

    } catch (error) {
        console.error("❌ Error fetching hotels:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
