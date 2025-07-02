import {
  getAllAttractionsFromDatabase,
  getAttractionByIdFromDatabase,
  saveAttractionToDatabase,
  updateAttractionInDatabase,
  deleteAttractionInDatabase,
  getAttractionsByCityFromDatabase // <--- Add this!
} from './att.db.js';


export default class Attraction {
  constructor({ name, city, description }) {
    this.name = name;
    this.city = city;
    this.description = description;
  }

  static async findAll() {
    return await getAllAttractionsFromDatabase();
  }

  static async findById(id) {
    return await getAttractionByIdFromDatabase(id);
  }

  static async delete(id) {
    return await deleteAttractionInDatabase(id);
  }

  async save() {
    return await saveAttractionToDatabase({
      name: this.name,
      city: this.city,
      description: this.description
    });
  }
    static async findByCity(city) {
    return await getAttractionsByCityFromDatabase(city);
  }


  async update(id) {
    return await updateAttractionInDatabase({
      name: this.name,
      city: this.city,
      description: this.description
    }, id);
  }
}
