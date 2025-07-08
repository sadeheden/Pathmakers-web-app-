import { ObjectId } from "mongodb";
import { findOrdersByUserIdFromDb, insertOrderToDb } from './order.db.js';

// פונקציית עזר לבדיקת ObjectId חוקי
function isValidObjectId(id) {
  return typeof id === "string" && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id);
}

export default class Order {
  constructor(data = {}) {
    this.user_id = isValidObjectId(data.user_id) ? new ObjectId(data.user_id) : null;
    this.departure_city_id = isValidObjectId(data.departure_city_id) ? new ObjectId(data.departure_city_id) : null;
    this.destination_city_id = isValidObjectId(data.destination_city_id) ? new ObjectId(data.destination_city_id) : null;
this.flight_id = data.flight_id || null;
this.hotel_id = data.hotel_id || null;
    this.attractions = data.attractions || [];
    this.payment_method = data.payment_method || null;
    this.total_price = data.total_price || 0;
    this.created_at = data.created_at || new Date();
  }

  static async findByUserId(userId) {
    return findOrdersByUserIdFromDb(userId);
  }

  async save() {
    if (!this.user_id || !this.departure_city_id || !this.destination_city_id || !this.flight_id || !this.hotel_id) {
      throw new Error(`Invalid ObjectId in one or more fields:
        user_id: ${this.user_id}
        departure_city_id: ${this.departure_city_id}
        destination_city_id: ${this.destination_city_id}
        flight_id: ${this.flight_id}
        hotel_id: ${this.hotel_id}
      `);
    }

    const orderDoc = {
      user_id: this.user_id,
      departure_city_id: this.departure_city_id,
      destination_city_id: this.destination_city_id,
      flight_id: this.flight_id,
      hotel_id: this.hotel_id,
      attractions: this.attractions,
      payment_method: this.payment_method,
      total_price: this.total_price,
      created_at: this.created_at
    };

    return insertOrderToDb(orderDoc);
  }
}
