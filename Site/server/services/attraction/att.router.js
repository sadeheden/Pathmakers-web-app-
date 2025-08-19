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
.post('/resolve-names', resolveAttractionNames) // <— NEW
  .get('/city/:city', getAttractionsByCity)
  .get('/', getAttractions)
  .get('/:id', getAttractionById)
  .post('/', addAttraction)
  .put('/:id', updateAttraction)
  .delete('/:id', deleteAttraction);


export default router;
