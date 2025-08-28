// att.controller.js - תיקון הבעיות
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

// 🔥 תיקון פונקציית ההזמנה
export async function bookAttraction(req, res) {
  try {
    // קבלת ה-attractionId מהבאדי במקום מהפרמטרים
    const { attractionId, attractionName, city, slot, price, paymentType } = req.body;
    const userId = req.user?.id || req.user?.userId;

    console.log('📥 Booking request:', { attractionId, attractionName, city, userId });

    if (!attractionId || !ObjectId.isValid(attractionId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid attraction ID is required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - user must be logged in' 
      });
    }

    // שמירת הזמנה ב-collection בשם "attractionOrders"
    const db = await connectDB();

    const bookingDoc = {
      user_id: new ObjectId(userId),
      attraction_id: new ObjectId(attractionId),
      attractionName: attractionName || 'Unknown Attraction',
      city: city || 'Unknown City',
      bookingSlot: slot || null,
      price: price || 0,
      paymentType: paymentType || 'free',
      booked_at: new Date(),
      purchaseDate: new Date() // הוספת שדה purchaseDate עבור הקליינט
    };

    const result = await db.collection('attractionOrders').insertOne(bookingDoc);

    if (!result.insertedId) {
      throw new Error('Booking failed - could not save to database');
    }

    console.log('✅ Booking successful:', result.insertedId);

    return res.json({ 
      success: true, 
      message: 'Attraction booked successfully',
      bookingId: result.insertedId,
      data: {
        bookingId: result.insertedId,
        attractionName,
        city,
        slot,
        price
      }
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

// 🔥 תיקון פונקציית קבלת הרכישות
export async function getPurchasedAttractions(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    
    console.log('📥 Getting purchases for user:', userId);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - user must be logged in" 
      });
    }

    const db = await connectDB();
    const purchases = await db
      .collection("attractionOrders")
      .find({ user_id: new ObjectId(userId) })
      .sort({ booked_at: -1 })
      .toArray();

    console.log(`✅ Found ${purchases.length} purchases for user ${userId}`);

    return res.json({ 
      success: true, 
      data: purchases, // שימו לב ששינינו ל-data במקום items
      count: purchases.length
    });
    
  } catch (error) {
    console.error("❌ getPurchasedAttractions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// 🔥 תיקון פונקציית מחיקת רכישה
export async function removePurchasedAttraction(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { purchaseId } = req.body; // שינוי שם השדה

    console.log('📥 Remove purchase request:', { purchaseId, userId });

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - user must be logged in" 
      });
    }
    
    if (!purchaseId || !ObjectId.isValid(purchaseId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Valid purchase ID is required" 
      });
    }

    const db = await connectDB();
    const result = await db.collection("attractionOrders").deleteOne({
      _id: new ObjectId(purchaseId),
      user_id: new ObjectId(userId), // וודא שהמשתמש יכול למחוק רק את הרכישות שלו
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Purchase not found or you don't have permission to delete it" 
      });
    }

    console.log('✅ Purchase removed successfully');

    return res.json({ 
      success: true, 
      message: "Purchase removed successfully" 
    });
    
  } catch (error) {
    console.error("❌ removePurchasedAttraction error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}