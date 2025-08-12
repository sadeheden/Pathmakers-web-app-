import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';
import { findAttractionsByCity, debugCityData } from './att.db.js';

export async function searchAttractionsByCity(req, res) {
  try {
    const cityName = req.body.city?.trim();
    const limit = parseInt(req.body.limit, 10) || 30;

    console.log('📥 Search request:', { cityName, limit });

    if (!cityName) {
      return res.status(400).json({ 
        success: false, 
        message: 'City name is required' 
      });
    }

    const attractions = await findAttractionsByCity(cityName, limit);
    
    if (!attractions || attractions.length === 0) {
      // הרצת דיבוג לקבלת מידע נוסף
      console.log('🔍 Running debug to see available data...');
      try {
        const debugInfo = await debugCityData();
        console.log('📊 Debug info:', debugInfo);
      } catch (debugError) {
        console.error('❌ Debug failed:', debugError);
      }
      
      return res.status(404).json({ 
        success: false, 
        message: `No attractions found for city: ${cityName}. Check available cities in logs.` 
      });
    }

    console.log(`✅ Found ${attractions.length} attractions for ${cityName}`);
    return res.json({ 
      success: true, 
      items: attractions,
      city: cityName,
      count: attractions.length
    });
    
  } catch (error) {
    console.error('❌ searchAttractionsByCity error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}

export async function bookAttraction(req, res) {
  try {
    const attractionId = req.params.id;
    const userId = req.user?.id || req.user?.userId;

    if (!ObjectId.isValid(attractionId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid attraction ID' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // שמירת הזמנה ב-collection בשם "attractionOrders"
    const db = await connectDB();

    const bookingDoc = {
      user_id: new ObjectId(userId),
      attraction_id: new ObjectId(attractionId),
      booked_at: new Date(),
      slot: req.body.slot || null
    };

    const result = await db.collection('attractionOrders').insertOne(bookingDoc);

    if (!result.insertedId) {
      throw new Error('Booking failed');
    }

    return res.json({ 
      success: true, 
      message: 'Attraction booked successfully',
      bookingId: result.insertedId
    });
    
  } catch (error) {
    console.error('❌ bookAttraction error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}

// נתיב נוסף לדיבוג
export async function getDebugInfo(req, res) {
  try {
    const debugInfo = await debugCityData();
    res.json({ success: true, debug: debugInfo });
  } catch (error) {
    console.error('❌ getDebugInfo error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Debug failed',
      error: error.message
    });
  }
}