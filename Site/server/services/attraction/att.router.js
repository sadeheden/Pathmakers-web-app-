import { Router } from 'express';
import {
  getAttractions,
  getAttractionById,
  addAttraction,
  updateAttraction,
  deleteAttraction,
  getAttractionsByCity,
  resolveAttractionNames  
} from './att.controller.js';

const router = Router();

router
  .post('/resolve-names', resolveAttractionNames)
  .get('/city/:city', getAttractionsByCity)  // This is the correct one
  .get('/', getAttractions)
  .get('/:id', getAttractionById)
  .post('/', addAttraction)
  .put('/:id', updateAttraction)
  .delete('/:id', deleteAttraction);

// Remove this broken line and the commented code below it

export default router;