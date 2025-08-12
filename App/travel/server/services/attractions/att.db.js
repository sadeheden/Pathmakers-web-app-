import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

export async function findAttractionsByCity(cityName, limit = 30) {
  try {
    const db = await connectDB();
    
    console.log('🔍 Searching for city:', cityName);
    
    // חיפוש עיר עם regex גמיש יותר ב-collection attractions
    const cityPattern = cityName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cityRegex = new RegExp(`^${cityPattern}$`, 'i');
    
    console.log('📍 Using regex pattern:', cityRegex);
    console.log('📍 Searching in attractions collection...');
    
    // חיפוש המסמך של העיר ב-collection 'attractions' (לא 'city')
    const cityDoc = await db.collection('attractions').findOne(
      { city: cityRegex }
    );
    
    console.log('🏙️ Found city document:', cityDoc ? 'Yes' : 'No');
    
    if (!cityDoc) {
      console.log('🔍 Trying alternative search...');
      
      // חיפוש בכל הערים הזמינות ב-attractions collection
      const allCities = await db.collection('attractions').find({}, { city: 1 }).limit(15).toArray();
      console.log('🌍 Available cities in attractions collection:', allCities.map(c => c.city));
      
      // חיפוש חלקי אם לא מצאנו התאמה מדויקת
      const partialMatch = await db.collection('attractions').findOne(
        { city: { $regex: cityName.trim(), $options: 'i' } }
      );
      
      if (partialMatch) {
        console.log('✅ Found partial match:', partialMatch.city);
        console.log('📋 Partial match attractions:', partialMatch.attractions?.length || 0);
        return processAttractions(partialMatch.attractions || [], partialMatch.city, limit);
      }
      
      return null;
    }
    
    // בדיקה אם יש אטרקציות ברשומה שנמצאה
    console.log('📋 Found attractions count:', cityDoc.attractions?.length || 0);
    
    if (!cityDoc.attractions || cityDoc.attractions.length === 0) {
      console.log('⚠️ City found but no attractions. Trying alternative versions...');
      
      // נסה לחפש גרסאות אחרות של השם
      const alternatives = [
        cityName.toLowerCase(),
        cityName.toUpperCase(), 
        cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase()
      ];
      
      for (const alt of alternatives) {
        if (alt === cityName.trim()) continue; // כבר ניסינו
        
        console.log('🔄 Trying alternative name:', alt);
        const altDoc = await db.collection('attractions').findOne(
          { city: { $regex: `^${alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }
        );
        
        if (altDoc && altDoc.attractions && altDoc.attractions.length > 0) {
          console.log('✅ Found city with attractions:', altDoc.city);
          console.log('📋 Alternative attractions count:', altDoc.attractions.length);
          return processAttractions(altDoc.attractions || [], altDoc.city, limit);
        }
      }
      
      return null;
    }
    
    // עיבוד והחזרת האטרקציות
    const processedAttractions = processAttractions(cityDoc.attractions || [], cityDoc.city, limit);
    console.log(`🎯 Processed ${processedAttractions.length} attractions in ${cityDoc.city}`);
    
    return processedAttractions;
    
  } catch (error) {
    console.error('❌ Error in findAttractionsByCity:', error);
    throw error;
  }
}

// פונקציה לעיבוד האטרקציות והוספת נתונים חסרים
function processAttractions(attractions, cityName, limit) {
  return attractions.slice(0, limit).map((attraction, index) => {
    // יצירת ID יציב לכל אטרקציה
    const attractionId = new ObjectId();
    
    return {
      _id: attractionId.toString(),
      name: attraction.name || 'Unknown Attraction',
      city: cityName,
      address: attraction.address || `${cityName}`, // כתובת דיפולטית
      openingHours: attraction.openingHours || null,
      price: typeof attraction.price === 'object' && attraction.price.$numberInt 
        ? parseInt(attraction.price.$numberInt, 10) 
        : (typeof attraction.price === 'number' ? attraction.price : null),
      category: attraction.category || 'attraction',
      rating: attraction.rating || (4 + Math.random()), // דירוג רנדומלי אם חסר
      bookable: attraction.bookable !== false, // ברירת מחדל true
      description: attraction.description || `Visit ${attraction.name} in ${cityName}`,
      // availability יתווסף על ידי הקוד הקיים בצד הלקוח
    };
  });
}

// פונקציה נוספת לבדיקת מבנה הנתונים
export async function debugCityData() {
  try {
    const db = await connectDB();
    
    // בדיקת כמה ערים יש בכלל ב-attractions collection
    const cityCount = await db.collection('attractions').countDocuments();
    console.log('📊 Total cities in attractions collection:', cityCount);
    
    // דוגמה למסמך אחד מ-attractions
    const sampleCity = await db.collection('attractions').findOne({});
    console.log('📄 Sample attractions document:', JSON.stringify(sampleCity, null, 2));
    
    // רשימת כל שמות הערים מ-attractions collection
    const allCities = await db.collection('attractions').find({}, { city: 1 }).toArray();
    console.log('🌍 All cities in attractions collection:', allCities.map(c => c.city));
    
    // בדיקה מיוחדת לפריז ב-attractions collection
    const parisDoc = await db.collection('attractions').findOne({ city: /paris/i });
    if (parisDoc) {
      console.log('🗼 Paris document found in attractions:', {
        id: parisDoc._id,
        city: parisDoc.city,
        attractionsCount: parisDoc.attractions?.length || 0,
        firstAttraction: parisDoc.attractions?.[0]?.name || 'None'
      });
    }
    
    // בדיקה גם ב-city collection (לראות מה יש שם)
    const cityCollectionCount = await db.collection('city').countDocuments();
    console.log('📊 Total cities in city collection:', cityCollectionCount);
    
    return { 
      attractionsCollection: { cityCount, sampleCity, allCities },
      cityCollectionCount 
    };
  } catch (error) {
    console.error('❌ Debug error:', error);
    throw error;
  }
}