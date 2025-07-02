import {
  getAllAttractionsFromDatabase,
  getAttractionByIdFromDatabase,
  saveAttractionToDatabase,
  updateAttractionInDatabase,
  deleteAttractionInDatabase
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

  async update(id) {
    return await updateAttractionInDatabase({
      name: this.name,
      city: this.city,
      description: this.description
    }, id);
  }
}
