import { ObjectId } from "mongodb";
import { findOrdersByUserIdFromDb, insertOrderToDb, findOrderByIdFromDb } from './order.db.js';

// Helper function to validate ObjectId
function isValidObjectId(id) {
  return typeof id === "string" && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id);
}

// Helper function to convert to ObjectId if valid, otherwise return as string
function toObjectIdOrString(id) {
  if (!id) return null;
  if (isValidObjectId(id)) {
    return new ObjectId(id);
  }
  return id; // Return as string if not a valid ObjectId
}

export default class Order {
  constructor(data = {}) {
    // For user_id, we need ObjectId for database operations
    this.user_id = isValidObjectId(data.user_id) ? new ObjectId(data.user_id) : null;
    
    // All IDs should be ObjectIds based on your database format
    this.departure_city_id = toObjectIdOrString(data.departure_city_id);
    this.destination_city_id = toObjectIdOrString(data.destination_city_id);
    this.flight_id = toObjectIdOrString(data.flight_id);
    this.hotel_id = toObjectIdOrString(data.hotel_id);
    
    this.attractions = data.attractions || [];
    this.transportation = data.transportation || null;
    this.payment_method = data.payment_method || null;
    this.total_price = data.total_price || 0;
    this.created_at = data.created_at || new Date();
  }

  static async findByUserId(userId) {
    return findOrdersByUserIdFromDb(userId);
  }

  static async findByOrderId(orderId) {
    return findOrderByIdFromDb(orderId);
  }

  async save() {
    // Validate required fields
    const errors = [];
    
    if (!this.user_id) {
      errors.push('user_id is required');
    }
    
    if (!this.departure_city_id) {
      errors.push('departure_city_id is required');
    }
    
    if (!this.destination_city_id) {
      errors.push('destination_city_id is required');
    }
    
    if (!this.flight_id) {
      errors.push('flight_id is required');
    }
    
    if (!this.hotel_id) {
      errors.push('hotel_id is required');
    }
    
    if (!this.payment_method) {
      errors.push('payment_method is required');
    }
    
    if (!this.total_price || this.total_price <= 0) {
      errors.push('total_price must be a positive number');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

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
      created_at: this.created_at
    };

    console.log("💾 Saving order to database:", orderDoc);

    try {
      const result = await insertOrderToDb(orderDoc);
      console.log("✅ Order saved successfully:", result._id);
      return result;
    } catch (error) {
      console.error("❌ Database save error:", error);
      throw new Error(`Failed to save order: ${error.message}`);
    }
  }
}