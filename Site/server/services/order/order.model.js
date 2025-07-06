import { ObjectId } from "mongodb";
import { findOrdersByUserIdFromDb, insertOrderToDb } from './order.db.js';

export default class Order {
  constructor(data) {
    this.orderId = data.orderId;
    this.user_id = new ObjectId(String(data.user_id));
    this.username = data.username;
    this.departure_city_id = new ObjectId(String(data.departure_city_id));
    this.destination_city_id = new ObjectId(String(data.destination_city_id));
    this.flight_id = new ObjectId(String(data.flight_id));
    this.hotel_id = new ObjectId(String(data.hotel_id));
    this.attractions = data.attractions || [];
    this.transportation = data.transportation || null;
    this.payment_method = data.payment_method;
    this.total_price = data.total_price;
    this.pdfUrl = data.pdfUrl;
    this.created_at = data.created_at || new Date();
  }
  static async findByUserId(userId) {
    return findOrdersByUserIdFromDb(userId);
  }
  async save() {
    return insertOrderToDb(this);
  }
}
