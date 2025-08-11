import { ObjectId } from 'mongodb';
import { findAttractionsByCity } from './att.db.js';

export async function searchAttractionsByCity(req, res) {
  try {
    const cityName = req.body.city?.trim();
    const limit = parseInt(req.body.limit, 10) || 30;

    if (!cityName) {
      return res.status(400).json({ success: false, message: 'City name is required' });
    }

    const attractions = await findAttractionsByCity(cityName, limit);

    if (!attractions) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    return res.json({ success: true, items: attractions });
  } catch (error) {
    console.error('searchAttractionsByCity error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function bookAttraction(req, res) {
  try {
    const attractionId = req.params.id;
    const userId = req.user?.id || req.user?.userId;

    if (!ObjectId.isValid(attractionId)) {
      return res.status(400).json({ success: false, message: 'Invalid attraction ID' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // לדוגמה שמירת הזמנה ב-collection בשם "attractionOrders"
    const db = await connectDB();

    const bookingDoc = {
      user_id: new ObjectId(userId),
      attraction_id: new ObjectId(attractionId),
      booked_at: new Date(),
    };

    const result = await db.collection('attractionOrders').insertOne(bookingDoc);

    if (!result.insertedId) {
      throw new Error('Booking failed');
    }

    return res.json({ success: true, message: 'Attraction booked successfully' });
  } catch (error) {
    console.error('bookAttraction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
