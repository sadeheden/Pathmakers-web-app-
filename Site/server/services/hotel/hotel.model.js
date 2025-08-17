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

static async findByCity(cityOrId){
  try {
    const result = await getHotelsByCityFromDatabase(cityOrId);
    if (!result) return { hotels: [] };
    if (Array.isArray(result.hotels)) return result;
    if (Array.isArray(result)) return { hotels: result };
    return { hotels: [result] };
  } catch (err) {
    console.error("❌ Hotel.findByCity error:", err);
    return { hotels: [] };
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
