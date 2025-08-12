import express from 'express';
import {
  getManagerDashboardData,
  addExistingAttractionToCity,
  addNewAttractionsToCity,
  addExistingAttractionToAttractionsDoc,
  addNewHotelsToCity,
  addNewFlightsToCity,
  upsertAttractionItemByCity,
  upsertHotelItemByCity,
  upsertFlightItemByCity,
} from './manager.controller.js';

const router = express.Router();

// 🆕 Dashboard route
router.get('/dashboard', getManagerDashboardData);

// Existing routes
router.post('/attractions/doc/:docId/addExistingAttraction/:attractionId', addExistingAttractionToAttractionsDoc);
router.post('/city/:cityId/attractions/existing/:attractionId', addExistingAttractionToCity);
router.post('/city/:cityId/addNewAttractions', addNewAttractionsToCity);
router.post('/city/:cityId/addNewHotels', addNewHotelsToCity);     // 👈 new
router.post('/city/:cityId/addNewFlights', addNewFlightsToCity); 
router.post('/collections/attractions/upsertItem', upsertAttractionItemByCity);
router.post('/collections/hotels/upsertItem',      upsertHotelItemByCity);
router.post('/collections/flights/upsertItem',     upsertFlightItemByCity);

export default router;
