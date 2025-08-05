import { getCities, getCityById, addCity, updateCity, deleteCity, getCityByName, updateCityAttractions } from "./cities.controller.js";
import { Router } from "express";

const router = Router();
router
  .get('/', getCities)
  .get('/name/:cityName', getCityByName)  // ראוט לשליפת עיר לפי שם
  .get('/:id', getCityById)
  .post('/', addCity)
  .put('/:id', updateCity)
  .delete('/:id', deleteCity)
  .put('/:id/attractions', updateCityAttractions);

export default router;
