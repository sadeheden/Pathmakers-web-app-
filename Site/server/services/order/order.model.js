import { ObjectId } from "mongodb";
import { findOrdersByUserIdFromDb, insertOrderToDb } from './order.db.js';

export default class Order {
  constructor(data) {
    this.user_id = new ObjectId(String(data.user_id));
    this.departure_city_id = new ObjectId(String(data.departure_city_id));
    this.destination_city_id = new ObjectId(String(data.destination_city_id));
    this.flight_id = new ObjectId(String(data.flight_id));
    this.hotel_id = new ObjectId(String(data.hotel_id));
    this.attractions = data.attractions || [];
    this.payment_method = data.payment_method;
    this.total_price = data.total_price;
    this.created_at = data.created_at || new Date();
  }

  static async findByUserId(userId) {
    return findOrdersByUserIdFromDb(userId);
  }

  async save() {
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
