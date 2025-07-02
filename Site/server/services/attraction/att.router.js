import { Router } from 'express';
import {
  getAttractions,
  getAttractionById,
  addAttraction,
  updateAttraction,
  deleteAttraction
} from './att.controller.js';

const router = Router();

router
  .get('/', getAttractions)
  .get('/:id', getAttractionById)
  .post('/', addAttraction)
  .put('/:id', updateAttraction)
  .delete('/:id', deleteAttraction);

export default router;
