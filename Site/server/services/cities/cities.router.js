import express from 'express';
import { getCitiesList } from './cities.controller.js';

const router = express.Router();

// קישור לפונקציה שמביאה את הערים
router.get('/', getCitiesList);

export default router;
