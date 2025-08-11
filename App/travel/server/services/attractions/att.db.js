import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

export async function findAttractionsByCity(cityName, limit = 30) {
  const db = await connectDB();

  // חיפוש city case-insensitive
  const cityDoc = await db.collection('city').findOne(
    { city: { $regex: new RegExp(`^${cityName}$`, 'i') } }
  );

  if (!cityDoc) return null;

  // חותך את האטרקציות לפי limit ומחזיר אותן בלבד
  const attractions = (cityDoc.attractions || []).slice(0, limit);

  return attractions;  // החזרת מערך האטרקציות בלבד
}
