import { Router } from 'express';
import {
  getAttractions,
  getAttractionById,
  addAttraction,
  updateAttraction,
  deleteAttraction,
  getAttractionsByCity
} from './att.controller.js';

const router = Router();

router
  .get('/city/:city', getAttractionsByCity) // <-- This is now correct!
  .get('/', getAttractions)
  .get('/:id', getAttractionById)
  .post('/', addAttraction)
  .put('/:id', updateAttraction)
  .delete('/:id', deleteAttraction);

export default router;
