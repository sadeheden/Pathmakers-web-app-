import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

const toObjectId = (v) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);

/**
 * חיפוש אטרקציות לפי עיר - POST /search-by-city
 * מקבל JSON עם שם העיר וגבול תוצאות (limit)
 */
export async function searchAttractionsByCity(req, res) {
  try {
    const { city, limit = 30 } = req.body;
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ success: false, message: 'City name is required' });
    }

    const db = await connectDB();

    // מחפשים בעיר (collection cities) את המסמכים עם אטרקציות
    const cityDoc = await db.collection('city').findOne({ city: city.trim() });
    if (!cityDoc) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    // מניחים שיש שדה attractions במבנה אובייקטים
    const attractions = cityDoc.attractions || [];

    // מגבילים תוצאות
    const limitedAttractions = attractions.slice(0, limit);

    // מחזירים את מסמך העיר עם האטרקציות המסוננות
    res.json({ success: true, items: [{ ...cityDoc, attractions: limitedAttractions }] });
  } catch (error) {
    console.error('searchAttractionsByCity error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * הזמנת אטרקציה - POST /:id/book
 */
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

    // כאן תוכל להוסיף לוגיקה להזמנה, למשל לשמור ב-collection הזמנות
    // זה רק דוגמה בסיסית שמחזירה הצלחה

    return res.json({ success: true, message: 'Attraction booked successfully' });
  } catch (error) {
    console.error('bookAttraction error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * אפשר להוסיף פונקציות נוספות לניהול אטרקציות
 */
