import express from 'express';
import { 
  addExistingAttractionToAttractionsDoc,
  addExistingAttractionToCity,
  addNewAttractionsToCity
} from './manager.controller.js';

const router = express.Router();

// Routes קיימים
router.post('/attractions/doc/:docId/addExistingAttraction/:attractionId', addExistingAttractionToAttractionsDoc);
router.post('/city/:cityId/attractions/existing/:attractionId', addExistingAttractionToCity);

// **Route חדש** להוספת אטרקציות חדשות למערך בתוך מסמך העיר
router.post('/city/:cityId/addNewAttractions', addNewAttractionsToCity);

export default router;