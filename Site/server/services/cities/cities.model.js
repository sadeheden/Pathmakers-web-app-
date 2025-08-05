import { 
  getAllCitiesFromDatabase, 
  getCityById, 
  getCityByNameFromDatabase,
  saveCityToDatabase, 
  updateCityInDatabase, 
  deleteCityInDatabase 
} from './cities.db.js';

export default class City {
  constructor(city) {
    this.city = city; // שם העיר
  }

  static async findAll() {
    return await getAllCitiesFromDatabase();
  }

  static async findById(id) {
    try {
      return await getCityById(id);
    } catch (error) {
      throw new Error('An error occurred while fetching the city.');
    }
  }

  static async findByName(cityName) {
    try {
      return await getCityByNameFromDatabase(cityName);
    } catch (error) {
      throw new Error('An error occurred while fetching the city by name.');
    }
  }

  static async delete(id) {
    try {
      return await deleteCityInDatabase(id);
    } catch (error) {
      throw new Error('An error occurred while deleting the city.');
    }
  }

  async save() {
    try {
      return await saveCityToDatabase({ city: this.city });
    } catch (error) {
      throw new Error('An error occurred while saving the city.');
    }
  }

  async update(id) {
    try {
      return await updateCityInDatabase({ city: this.city }, id);
    } catch (error) {
      throw new Error('An error occurred while updating the city.');
    }
  }
  static async updateById(id, updateData) {
    try {
      const db = await connect();
      const collection = db.collection('cities');
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );   
      return result.value;
    } catch (error) {
      console.error('Error updating city by ID:', error);
      throw error;
    }
  }
}