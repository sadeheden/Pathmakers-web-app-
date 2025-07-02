import { getAllCitiesFromDatabase, getCityById, saveCityToDatabase, updateCityInDatabase, deleteCityInDatabase } from './cities.db.js';

export default class City {
    constructor(city) {
        this.city = city; // Name of the city
    }
 
    // Static method to find all cities
    static async findAll() {
        try {
            return await getAllCitiesFromDatabase(); // fetching from the database
        } catch (error) {
            throw new Error('An error occurred while fetching cities.');
        }
    }
 
    // Static method to find a city by ID
    static async findById(id) {
        try {
            return await getCityById(id); // fetching from the database
        } catch (error) {
            throw new Error('An error occurred while fetching the city.');
        }
    }
 
    // Static method to delete a city
    static async delete(id) {
        try {
            return await deleteCityInDatabase(id); // deleting from the database
        } catch (error) {
            throw new Error('An error occurred while deleting the city.');
        }
    }
 
    // Instance method to save a new city
async save() {
    try {
        // Pass only the city name to the database function
        return await saveCityToDatabase({ city: this.city }); // saving to the database
    } catch (error) {
        throw new Error('An error occurred while saving the city.');
    }
}
 
// Instance method to update a city
async update(id) {
    try {
        // Pass only the city name and the id to the database function
        return await updateCityInDatabase({ city: this.city }, id); // updating in the database
    } catch (error) {
        throw new Error('An error occurred while updating the city.');
    }
}
}