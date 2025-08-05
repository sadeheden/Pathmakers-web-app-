import { connectDB } from '../auth/auth.db.js';

export const getManagerDashboardData = async (req, res) => {
  try {
    const db = await connectDB();

    // פונקציה לניקוי מזהים מורכבים
    function cleanId(id) {
      if (!id) return null;

      if (typeof id === 'object' && id.toString) {
        // במקרה שזו ObjectId או אובייקט דומה
        const strId = id.toString();
        // מחלץ את 24 התווים של ה־ObjectId
        const match = strId.match(/^[0-9a-fA-F]{24}/);
        return match ? match[0] : null;
      }

      if (typeof id === 'string') {
        // ניקוי מחרוזת (לפעמים יש תווים נוספים)
        const cleaned = id.split(/[-_]/)[0];
        return /^[0-9a-fA-F]{24}$/.test(cleaned) ? cleaned : null;
      }

      return null;
    }

    // טען את כל ההזמנות
    const orders = await db.collection('orders').find().toArray();

    // טען את כל הערים - ודא ששמך collection נכון (city או cities)
    const cities = await db.collection('city').find().toArray();

    console.log('Cities loaded from DB:', cities);

    const cityMap = {};
    cities.forEach(city => {
      const idStr = city._id.toString();
      cityMap[idStr] = city.city; // שדה שם העיר
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

    // Debug: בדוק דוגמאות מזהים מההזמנות
    console.log('Sample order destination_city_ids:', orders.slice(0, 5).map(o => o.destination_city_id));

    const mostPopularDestinations = {};

    for (const order of orders) {
      const rawCityId = order.destination_city_id;
      const cleanedCityId = cleanId(rawCityId) || (rawCityId ? rawCityId.toString() : null);

      console.log(`Processing: rawCityId=${rawCityId}, cleanedCityId=${cleanedCityId}`);

      const cityName = cityMap[cleanedCityId];
      if (!cityName) {
        console.log(`❌ City not found for ID: ${cleanedCityId}`);
        console.log('Available city IDs:', Object.keys(cityMap));
      } else {
        console.log(`✅ Found city: ${cityName} for ID: ${cleanedCityId}`);
      }
      const finalCityName = cityName || `Unknown City (${cleanedCityId})`;
      mostPopularDestinations[finalCityName] = (mostPopularDestinations[finalCityName] || 0) + 1;
    }
    const sortedDestinations = Object.entries(mostPopularDestinations).sort((a, b) => b[1] - a[1]);
    const topDestinations = sortedDestinations.slice(0, 3).map(([destination, count]) => ({
      destination,
      count,
    }));

    res.status(200).json({
      totalOrders,
      totalRevenue,
      topDestinations,
    });
  } catch (err) {
    console.error('Error in getManagerDashboardData:', err);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};