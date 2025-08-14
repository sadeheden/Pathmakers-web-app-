import {
  getAllHotelsFromDatabase,
  getHotelByIdFromDatabase,
  saveHotelToDatabase,
  updateHotelInDatabase,
  deleteHotelInDatabase,
  getHotelsByCityFromDatabase
} from "./hotel.db.js";

export default class Hotel {
  constructor({ city, name, price, stars }) {
    this.city = city;
    this.name = name;
    this.price = price;
    this.stars = stars;
  }

  static async findAll() {
    return await getAllHotelsFromDatabase();
  }

  static async findById(id) {
    return await getHotelByIdFromDatabase(id);
  }

  static async findByCity(cityId) {
    try {
      const doc = await getHotelsByCityFromDatabase(cityId);
      if (!doc || !doc.hotels?.length) return null;
      return doc;
    } catch (error) {
      console.error("❌ Hotel.findByCity error:", error);
      return null;
    }
  }

  async save() {
    return await saveHotelToDatabase({
      city: this.city,
      name: this.name,
      price: this.price,
      stars: this.stars,
    });
  }

  async update(id) {
    return await updateHotelInDatabase(
      {
        city: this.city,
        name: this.name,
        price: this.price,
        stars: this.stars,
      },
      id
    );
  }

  static async delete(id) {
    return await deleteHotelInDatabase(id);
  }
}
