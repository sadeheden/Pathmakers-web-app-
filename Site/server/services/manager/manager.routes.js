// manager.routes.js
import express from 'express';
import {
  getManagerDashboardData,
  addExistingAttractionToAttractionsDoc,
  addExistingAttractionToCity,
  addNewAttractionsToCity,
  addNewHotelsToCity,
  addNewFlightsToCity,  
  upsertAttractionItemByCity,
  upsertHotelItemByCity,
  upsertFlightItemByCity,
  upsertHotelsByCity,
  upsertFlightsByCity,
  upsertAttractionsByCity
} from './manager.controller.js';

const router = express.Router();

// 🆕 Dashboard route
router.get('/dashboard', getManagerDashboardData);

// Existing routes
router.post('/attractions/doc/:docId/addExistingAttraction/:attractionId', addExistingAttractionToAttractionsDoc);
router.post('/city/:cityId/attractions/existing/:attractionId', addExistingAttractionToCity);
router.post('/city/:cityId/addNewAttractions', addNewAttractionsToCity);
router.post('/city/:cityId/addNewHotels', addNewHotelsToCity);
router.post('/city/:cityId/addNewFlights', addNewFlightsToCity);

// Upsert single items
router.post('/collections/attractions/upsertItem', upsertAttractionItemByCity);
router.post('/collections/hotels/upsertItem', upsertHotelItemByCity);
router.post('/collections/flights/upsertItem', upsertFlightItemByCity);

// 🆕 Upsert multiple hotels/flights at once
router.post('/collections/hotels/upsertItems', upsertHotelsByCity);
router.post('/collections/flights/upsertItems', upsertFlightsByCity);  // 👈 ה־route החדש
router.post('/collections/attractions/upsertItems', upsertAttractionsByCity);

export default router;
