import express from 'express';
import { 
  addExistingAttractionToAttractionsDoc,
  addExistingAttractionToCity,
  addNewAttractionsToCity,
  getManagerDashboardData // <-- import the controller
} from './manager.controller.js';

const router = express.Router();

// 🆕 Dashboard route
router.get('/dashboard', getManagerDashboardData);

// Existing routes
router.post('/attractions/doc/:docId/addExistingAttraction/:attractionId', addExistingAttractionToAttractionsDoc);
router.post('/city/:cityId/attractions/existing/:attractionId', addExistingAttractionToCity);
router.post('/city/:cityId/addNewAttractions', addNewAttractionsToCity);

export default router;
