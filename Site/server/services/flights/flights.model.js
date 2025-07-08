// flights.model.js
import {
  getAllFlightsFromDatabase,
  getFlightByIdFromDatabase,
  saveFlightToDatabase,
  updateFlightInDatabase,
  deleteFlightInDatabase,
  getFlightsByCity,
} from "./flights.db.js";

export default class Flight {
  constructor({ city, airline, departureTime, price }) {
    this.city = city;
    this.airline = airline;
    this.departureTime = departureTime;
    this.price = price;
  }

  static async findAll() {
    return await getAllFlightsFromDatabase();
  }

  static async findById(id) {
    return await getFlightByIdFromDatabase(id);
  }

  static async findByCityExact(city) {
    return await getFlightsByCity(city);
  }

  static async createCityWithFlight({ city, airline, departureTime, price }) {
    return await saveFlightToDatabase({
      city,
      airlines: [{ name: airline, departureTime, price }],
    });
  }

  static async addFlightToCity(cityDocId, flight) {
    return await updateFlightInDatabase(
      { $push: { airlines: flight } },
      cityDocId
    );
  }

  static async updateCityDocument(id, data) {
    return await updateFlightInDatabase(id, data);
  }

  static async delete(id) {
    return await deleteFlightInDatabase(id);
  }

  async save() {
    throw new Error("Use createCityWithFlight or addFlightToCity instead.");
  }

  async update(id) {
    throw new Error("Update city document instead.");
  }
}
