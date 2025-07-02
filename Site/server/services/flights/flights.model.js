import {
  getAllFlightsFromDatabase,
  getFlightByIdFromDatabase,
  saveFlightToDatabase,
  updateFlightInDatabase,
  deleteFlightInDatabase
} from "./flights.db.js";

export default class Flight {
  constructor({ city, airline, departureTime }) {
    this.city = city;
    this.airline = airline;
    this.departureTime = departureTime;
  }

  static async findAll() {
    return await getAllFlightsFromDatabase();
  }

  static async findById(id) {
    return await getFlightByIdFromDatabase(id);
  }

  static async delete(id) {
    return await deleteFlightInDatabase(id);
  }

  async save() {
    return await saveFlightToDatabase({
      city: this.city,
      airline: this.airline,
      departureTime: this.departureTime
    });
  }

  async update(id) {
    return await updateFlightInDatabase(
      {
        city: this.city,
        airline: this.airline,
        departureTime: this.departureTime
      },
      id
    );
  }
}
