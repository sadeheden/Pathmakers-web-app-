import { ObjectId } from 'mongodb';
import { findOrdersByUserIdFromDb, insertOrderToDb } from './order.db.js';

export default class Order {
  constructor(data = {}) {
    // Don't convert ObjectIds if they're already ObjectId instances
    this.user_id = data.user_id instanceof ObjectId ? data.user_id : new ObjectId(String(data.user_id));
    this.departure_city_id = data.departure_city_id instanceof ObjectId ? data.departure_city_id : new ObjectId(String(data.departure_city_id));
    this.destination_city_id = data.destination_city_id instanceof ObjectId ? data.destination_city_id : new ObjectId(String(data.destination_city_id));
    this.flight_id = data.flight_id instanceof ObjectId ? data.flight_id : new ObjectId(String(data.flight_id));
    this.hotel_id = data.hotel_id instanceof ObjectId ? data.hotel_id : new ObjectId(String(data.hotel_id));
    
    this.attractions = Array.isArray(data.attractions)
      ? data.attractions.map(id => id instanceof ObjectId ? id : new ObjectId(String(id)))
      : [];
    
    this.transportation = data.transportation;
    this.payment_method = data.payment_method;
    this.total_price = data.total_price;
    this.created_at = data.created_at || new Date();

    console.log('🏗️ Order constructed:', {
      user_id: this.user_id,
      departure_city_id: this.departure_city_id,
      destination_city_id: this.destination_city_id,
      flight_id: this.flight_id,
      hotel_id: this.hotel_id,
      attractions: this.attractions,
      total_price: this.total_price
    });
  }

  static async findByUserId(userId) {
    try {
      const userObjectId = userId instanceof ObjectId ? userId : new ObjectId(String(userId));
      return await findOrdersByUserIdFromDb(userObjectId);
    } catch (error) {
      console.error('❌ Error finding orders by user ID:', error);
      throw error;
    }
  }

  async save() {
    try {
      const orderDoc = {
        user_id: this.user_id,
        departure_city_id: this.departure_city_id,
        destination_city_id: this.destination_city_id,
        flight_id: this.flight_id,
        hotel_id: this.hotel_id,
        attractions: this.attractions,
        transportation: this.transportation,
        payment_method: this.payment_method,
        total_price: this.total_price,
        created_at: this.created_at,
      };

      console.log('💾 Attempting to save order:', JSON.stringify(orderDoc, null, 2));
      
      const result = await insertOrderToDb(orderDoc);
      
      if (!result.insertedId) {
        throw new Error('Order was not inserted - no insertedId returned');
      }
      
      console.log('✅ Order saved with ID:', result.insertedId);
      return { _id: result.insertedId, ...orderDoc };
      
    } catch (error) {
      console.error('❌ Error saving order:', error);
      throw error;
    }
  }
}