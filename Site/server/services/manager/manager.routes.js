import express from 'express';
import {
  getManagerDashboardData,
  addExistingAttractionToCity,
  addNewAttractionsToCity, // 👈 this must be exported
  addExistingAttractionToAttractionsDoc
} from './manager.controller.js';

const router = express.Router();

// 🆕 Dashboard route
router.get('/dashboard', getManagerDashboardData);

// Existing routes
router.post('/attractions/doc/:docId/addExistingAttraction/:attractionId', addExistingAttractionToAttractionsDoc);
router.post('/city/:cityId/attractions/existing/:attractionId', addExistingAttractionToCity);
router.post('/city/:cityId/addNewAttractions', addNewAttractionsToCity);

export default router;
