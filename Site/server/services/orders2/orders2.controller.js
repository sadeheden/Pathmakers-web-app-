// orders2.controller.js

import orders2DB from './orders2.db.js';
import { ObjectId } from 'mongodb';

class Orders2Controller {
   static async getUserOrders(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // שליפת כל ההזמנות של המשתמש מה־DB
      const orders = await orders2DB.getOrdersByUserId(req.user.id);
      res.status(200).json(orders);
    } catch (err) {
      console.error("❌ Error fetching user orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  }
  static async createOrder(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        departureCityId,
        destinationCityId,
        flightId,
        hotelId,
        attractions,
        transportation,
        paymentMethod,
        totalPrice,
        flightName,
        hotelName,
        attractionNames,
        departureCityName,
        destinationCityName,
      } = req.body;

      // validation (mirror order.controller.js)
      if (!departureCityId || !destinationCityId || !flightId || !hotelId) {
        return res.status(400).json({ message: 'Missing required IDs' });
      }
      if (!paymentMethod) {
        return res.status(400).json({ message: 'Missing paymentMethod' });
      }
      if (!totalPrice || Number(totalPrice) <= 0) {
        return res.status(400).json({ message: 'totalPrice must be positive' });
      }

      const orderData = {
        user_id: ObjectId.isValid(req.user.id) ? new ObjectId(req.user.id) : String(req.user.id),

        // canonical ids (compound allowed)
        departure_city_id: departureCityId,
        destination_city_id: destinationCityId,
        flight_id: flightId,
        hotel_id: hotelId,

        // extras
        attractions: Array.isArray(attractions) ? attractions : [],
        transportation,
        payment_method: paymentMethod,
        total_price: Number(totalPrice),
        created_at: new Date(),

        // denormalized fields (names)
        flight_name: flightName || null,
        hotel_name: hotelName || null,
        attraction_names: Array.isArray(attractionNames) ? attractionNames : [],
        departure_city_name: departureCityName || null,
        destination_city_name: destinationCityName || null,
      };

      const savedOrder = await orders2DB.createOrder(orderData);
      return res.status(201).json(savedOrder);

    } catch (err) {
      console.error("❌ Error creating order2:", err);
      res.status(500).json({ message: "Failed to create order2" });
    }
  }
}

export default Orders2Controller;
